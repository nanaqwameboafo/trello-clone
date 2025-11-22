import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useInvitations(organizationId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const createInvitation = async (email: string) => {
    setLoading(true);
    setError(null);

    try {
      // Get current user - use getSession instead of getUser
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();

      if (authError || !session?.user) {
        throw new Error("You must be logged in to send invitations");
      }

      const user = session.user;

      // Check if user is already a member - use maybeSingle instead of single
      const { data: existingMember, error: memberError } = await supabase
        .from("organization_members")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberError) {
        console.error("Member check error:", memberError);
        throw new Error("Failed to verify membership");
      }

      if (!existingMember) {
        throw new Error(
          "You must be a member of this organization to send invitations"
        );
      }

      // Check if invitation already exists for this email - use maybeSingle
      const { data: existingInvitation, error: inviteCheckError } = await supabase
        .from("invitations")
        .select("id, status, expires_at")
        .eq("organization_id", organizationId)
        .eq("email", email)
        .eq("status", "pending")
        .maybeSingle();

      if (inviteCheckError) {
        console.error("Invitation check error:", inviteCheckError);
        // Don't throw error here, just continue
      }

      if (existingInvitation) {
        // Check if existing invitation is expired
        if (new Date(existingInvitation.expires_at) > new Date()) {
          throw new Error("An active invitation already exists for this email");
        }
      }

      // Generate unique token
      const token = crypto.randomUUID();

      // Set expiration to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create invitation
      const { data: invitation, error: insertError } = await supabase
        .from("invitations")
        .insert({
          organization_id: organizationId,
          email,
          token,
          invited_by: user.id,
          status: "pending",
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }

      // Generate invitation link
      const baseUrl = window.location.origin;
      const invitationLink = `${baseUrl}/invite/${token}`;

      return {
        invitation,
        invitationLink,
      };
    } catch (err: any) {
      console.error("Create invitation error:", err);
      const errorMessage = err.message || "Failed to create invitation";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    createInvitation,
    loading,
    error,
  };
}