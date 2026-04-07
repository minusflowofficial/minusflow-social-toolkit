import { supabase } from "@/integrations/supabase/client";

// Generate a session ID for the current browser session
const getSessionId = (): string => {
  let sid = sessionStorage.getItem("mf_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("mf_session_id", sid);
  }
  return sid;
};

// Track a page view
export const trackPageView = async (path: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;
    await supabase.from("page_views").insert({
      path,
      referrer: document.referrer || "",
      user_agent: navigator.userAgent || "",
      session_id: getSessionId(),
      user_id: userId,
    });
  } catch {
    // Silent fail — don't break the app for analytics
  }
};

// Track tool usage
export const trackToolUsage = async (params: {
  tool_name: string;
  tool_slug: string;
  status: "success" | "error" | "pending";
  input_url?: string;
  error_message?: string;
  duration_ms?: number;
}) => {
  try {
    await supabase.from("tool_usage_logs").insert({
      ...params,
      user_agent: navigator.userAgent || "",
    });
  } catch {
    // Silent fail
  }
};
