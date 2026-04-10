import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "mf_session_token";
const DEFAULT_MAX_SESSIONS = 3;
const HEARTBEAT_MS = 60_000; // 1 minute for faster detection

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

  const checkIsAdmin = useCallback(async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["super_admin", "admin"])
      .maybeSingle();
    return !!data;
  }, []);

  const checkSuspension = useCallback(async (userId: string) => {
    // Admins/Super Admins are never blocked
    const admin = await checkIsAdmin(userId);
    if (admin) return false;

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_suspended")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.is_suspended) {
      setBlocked(true);
      return true;
    }
    return false;
  }, [checkIsAdmin]);

  const checkAndRegister = useCallback(async (userId: string) => {
    // Admins/Super Admins skip all restrictions
    const admin = await checkIsAdmin(userId);
    if (admin) {
      setChecking(false);
      return;
    }

    // Check suspension first
    if (await checkSuspension(userId)) {
      setChecking(false);
      return;
    }

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

    if (upsertErr) {
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

    // Get user's max_devices setting
    const { data: profile } = await supabase
      .from("profiles")
      .select("max_devices")
      .eq("id", userId)
      .maybeSingle();
    const maxDevices = (profile as any)?.max_devices ?? DEFAULT_MAX_SESSIONS;

    // Count active sessions
    const { count } = await supabase
      .from("user_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true);

    // Only warn, do not auto-suspend for too many devices
    if (count && count > maxDevices) {
      console.warn(`User has ${count}/${maxDevices} active sessions — warning only, no suspension.`);
    }

    setChecking(false);
  }, [checkSuspension, checkIsAdmin]);

  useEffect(() => {
    let cleanup = false;
    let realtimeChannel: any = null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cleanup) return;
      if (session?.user) {
        checkAndRegister(session.user.id);

        // Subscribe to realtime profile changes for instant suspend detection
        realtimeChannel = supabase
          .channel(`profile-suspend-${session.user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${session.user.id}`,
            },
            (payload: any) => {
              if (payload.new?.is_suspended) {
                setBlocked(true);
              }
            }
          )
          .subscribe();
      } else {
        setChecking(false);
      }
    });

    // Heartbeat every 1 minute
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const token = getSessionToken();
        await supabase
          .from("user_sessions")
          .update({ last_active_at: new Date().toISOString() })
          .eq("user_id", session.user.id)
          .eq("session_token", token);

        await checkSuspension(session.user.id);
      }
    }, HEARTBEAT_MS);

    return () => {
      cleanup = true;
      clearInterval(interval);
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    };
  }, [checkAndRegister, checkSuspension]);

  return { blocked, checking };
}
