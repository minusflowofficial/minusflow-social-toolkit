import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UPSTREAM_URL = "https://app.ytdown.to/proxy.php";
const BOOTSTRAP_URLS = ["https://app.ytdown.to/en24/", "https://app.ytdown.to/en23/", "https://app.ytdown.to/"];
const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 8000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithTimeout = async (input: string, init: RequestInit = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const getSessionCookie = async () => {
  for (const bootstrapUrl of BOOTSTRAP_URLS) {
    try {
      const response = await fetchWithTimeout(bootstrapUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      const cookie = response.headers.get("set-cookie") || "";
      const session = cookie
        .split(",")
        .map((part) => part.trim())
        .find((part) => part.startsWith("PHPSESSID="));
      if (session) return session.split(";")[0];
    } catch {
      // Try the next landing page variant.
    }
  }
  return "";
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "url parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionCookie = await getSessionCookie();
    let lastError = "YouTube provider is temporarily busy. Please try again.";

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const referer = BOOTSTRAP_URLS[attempt % BOOTSTRAP_URLS.length];
      const response = await fetchWithTimeout(UPSTREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          "Origin": "https://app.ytdown.to",
          "Referer": referer,
          "User-Agent": USER_AGENT,
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          ...(sessionCookie ? { Cookie: sessionCookie } : {}),
        },
        body: new URLSearchParams({ url }).toString(),
      });

      const text = await response.text();
      if (!response.ok) {
        lastError = `Upstream error: ${response.status}`;
      } else {
        try {
          const data = JSON.parse(text);
          return jsonResponse(data);
        } catch {
          lastError = text.trim().startsWith("<")
            ? "Provider returned a browser challenge instead of video data"
            : "Provider returned invalid video data";
        }
      }

      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(700 + attempt * 900);
      }
    }

    return jsonResponse({ error: lastError }, 503);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ error: message }, message.includes("aborted") ? 504 : 500);
  }
});
