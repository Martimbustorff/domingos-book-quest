import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useOAuthProfile = () => {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const userId = session.user.id;

          // Check if profile already exists
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          if (!existingProfile) {
            console.log("New OAuth user detected, initializing profile...");

            try {
              // Create profile
              const { error: profileError } = await supabase
                .from("profiles")
                .insert({
                  user_id: userId,
                  display_name: session.user.user_metadata?.full_name || 
                                session.user.email?.split("@")[0] || 
                                "User",
                });

              if (profileError) throw profileError;

              // Assign student role
              const { error: roleError } = await supabase
                .from("user_roles")
                .insert({
                  user_id: userId,
                  role: "student",
                });

              if (roleError) throw roleError;

              // Initialize user stats
              const { error: statsError } = await supabase
                .from("user_stats")
                .insert({
                  user_id: userId,
                });

              if (statsError) throw statsError;

              toast.success("Profile created successfully!");
            } catch (error: any) {
              console.error("Error initializing OAuth profile:", error);
              toast.error("Failed to initialize profile. Please contact support.");
            }
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);
};
