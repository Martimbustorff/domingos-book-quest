import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Check if a client has exceeded rate limits
 * @param supabase Supabase client
 * @param ipAddress Client IP address
 * @param endpoint Endpoint being accessed
 * @returns true if rate limit exceeded, false otherwise
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  ipAddress: string,
  endpoint: string
): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { count, error } = await supabase
    .from("request_logs")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ipAddress)
    .eq("endpoint", endpoint)
    .gte("created_at", oneHourAgo);

  if (error) {
    console.error("Rate limit check error:", error);
    return false;
  }

  const RATE_LIMIT = 100;
  return (count || 0) >= RATE_LIMIT;
}

/**
 * Log a request to the request_logs table
 * @param supabase Supabase client
 * @param ipAddress Client IP address
 * @param endpoint Endpoint being accessed
 */
export async function logRequest(
  supabase: SupabaseClient,
  ipAddress: string,
  endpoint: string
): Promise<void> {
  await supabase
    .from("request_logs")
    .insert({ ip_address: ipAddress, endpoint });
}
