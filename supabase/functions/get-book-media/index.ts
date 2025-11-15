import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: 20 requests per minute per IP
async function checkRateLimit(supabase: any, ipAddress: string, endpoint: string): Promise<boolean> {
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
  
  const { data, error } = await supabase
    .from('request_logs')
    .select('id')
    .eq('ip_address', ipAddress)
    .eq('endpoint', endpoint)
    .gte('created_at', oneMinuteAgo);

  if (error) {
    console.error('Rate limit check error:', error);
    return true;
  }

  return (data?.length || 0) < 20;
}

async function logRequest(supabase: any, ipAddress: string, endpoint: string) {
  await supabase.from('request_logs').insert({
    ip_address: ipAddress,
    endpoint: endpoint
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get client IP address
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                      req.headers.get('x-real-ip') || 
                      'unknown';

    // Check rate limit
    const isAllowed = await checkRateLimit(supabase, ipAddress, 'get-book-media');
    if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log request
    await logRequest(supabase, ipAddress, 'get-book-media');

    const { bookId } = await req.json();

    console.log("Checking media for book:", bookId);

    // Get book details
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("*")
      .eq("id", bookId)
      .single();

    if (bookError || !book) {
      throw new Error("Book not found");
    }

    // Check if we have a cached video
    const { data: existingVideo } = await supabase
      .from("youtube_videos")
      .select("*")
      .eq("book_id", bookId)
      .order("last_checked_at", { ascending: false })
      .maybeSingle();

    // If we have a recent video (checked within last 7 days), return it
    if (existingVideo) {
      const lastChecked = new Date(existingVideo.last_checked_at);
      const daysSinceCheck = (Date.now() - lastChecked.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceCheck < 7) {
        console.log("Using cached video");
        return new Response(
          JSON.stringify({
            hasVideo: true,
            videoId: existingVideo.youtube_video_id,
            title: existingVideo.title,
            channelTitle: existingVideo.channel_title,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Search for video using YouTube Data API
    // NOTE: This requires YOUTUBE_API_KEY to be set
    const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY");

    if (!youtubeApiKey) {
      console.log("YouTube API key not configured, returning no video");
      return new Response(
        JSON.stringify({ hasVideo: false }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Search for child-friendly videos
    const searchQueries = [
      `${book.title} read aloud for kids`,
      `${book.title} story for children`,
      `${book.title} book for kids`,
    ];

    let bestVideo: any = null;

    for (const searchQuery of searchQueries) {
      const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
      searchUrl.searchParams.set("part", "snippet");
      searchUrl.searchParams.set("q", searchQuery);
      searchUrl.searchParams.set("type", "video");
      searchUrl.searchParams.set("safeSearch", "strict");
      searchUrl.searchParams.set("maxResults", "3");
      searchUrl.searchParams.set("key", youtubeApiKey);

      const searchResponse = await fetch(searchUrl.toString());
      if (!searchResponse.ok) continue;

      const searchData = await searchResponse.json();
      const items = searchData.items || [];

      if (items.length > 0) {
        bestVideo = items[0];
        break;
      }
    }

    if (!bestVideo) {
      console.log("No suitable video found");
      return new Response(
        JSON.stringify({ hasVideo: false }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Save video to database
    const { error: insertError } = await supabase
      .from("youtube_videos")
      .insert({
        book_id: bookId,
        youtube_video_id: bestVideo.id.videoId,
        title: bestVideo.snippet.title,
        channel_title: bestVideo.snippet.channelTitle,
        thumbnail_url: bestVideo.snippet.thumbnails?.medium?.url,
        safe_search_level: "strict",
        last_checked_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Failed to save video:", insertError);
    }

    console.log("Found and cached video:", bestVideo.id.videoId);

    return new Response(
      JSON.stringify({
        hasVideo: true,
        videoId: bestVideo.id.videoId,
        title: bestVideo.snippet.title,
        channelTitle: bestVideo.snippet.channelTitle,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Get book media error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        error: message,
        hasVideo: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});