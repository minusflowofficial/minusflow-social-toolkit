import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { v4 } from "@/lib/uuid";

const SESSION_KEY = "mf_session_token";
const MAX_SESSIONS = 3;

function getSessionToken(): string {
  let token = localStorage.getItem(SESSION_KEY);
  if (!token) {
    token = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
    localStorage.setItem(SESSION_KEY, token);
  }
  return token;
}

export function useSessionTracker() {
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkAndRegister = useCallback(async (userId: string) => {
    const sessionToken = getSessionToken();

    // Upsert current session
    const { error: upsertErr } = await supabase
      .from("user_sessions")
      .upsert(
        {
          user_id: userId,
          session_token: sessionToken,
          device_info: navigator.userAgent.slice(0, 200),
          last_active_at: new Date().toISOString(),
          is_active: true,
        },
        { onConflict: "session_token" }
      );

    // If upsert failed (no unique constraint on session_token), try insert
    if (upsertErr) {
      // Check if this session already exists
      const { data: existing } = await supabase
        .from("user_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("session_token", sessionToken)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_sessions")
          .update({ last_active_at: new Date().toISOString(), is_active: true })
          .eq("id", existing.id);
      } else {
        await supabase.from("user_sessions").insert({
          user_id: userId,
          session_token: sessionToken,
          device_info: navigator.userAgent.slice(0, 200),
          is_active: true,
        });
      }
    }

    // Count active sessions
    const { count } = await supabase
      .from("user_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true);

    if (count && count > MAX_SESSIONS) {
      setBlocked(true);
      // Suspend user profile
      await supabase
        .from("profiles")
        .update({
          is_suspended: true,
          suspended_reason: `Too many active sessions (${count}). Account automatically suspended.`,
        })
        .eq("id", userId);
    }

    // Check if profile is suspended
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_suspended")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.is_suspended) {
      setBlocked(true);
    }

    setChecking(false);
  }, []);

  useEffect(() => {
    let cleanup = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cleanup) return;
      if (session?.user) {
        checkAndRegister(session.user.id);
      } else {
        setChecking(false);
      }
    });

    // Heartbeat every 2 minutes
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const token = getSessionToken();
        await supabase
          .from("user_sessions")
          .update({ last_active_at: new Date().toISOString() })
          .eq("user_id", session.user.id)
          .eq("session_token", token);
      }
    }, 120000);

    return () => {
      cleanup = true;
      clearInterval(interval);
    };
  }, [checkAndRegister]);

  return { blocked, checking };
}
