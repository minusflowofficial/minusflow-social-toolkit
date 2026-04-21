import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, Content-Type, Retry-After, X-Download-Status",
};

const UPSTREAM_URL = "https://app.ytdown.to/proxy.php";
const BOOTSTRAP_URLS = ["https://app.ytdown.to/en24/", "https://app.ytdown.to/en23/", "https://app.ytdown.to/"];
const MAX_ATTEMPTS = 3;
const DOWNLOAD_RESOLVE_ATTEMPTS = 8;
const TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 1200;
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

const jsonResponse = (body: Record<string, unknown>, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });

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

const normalizeMediaValue = (value: unknown) => {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  return normalized && normalized.toLowerCase() !== "false" ? normalized : "";
};

const sanitizeFileName = (value: string) => {
  const cleaned = value.replace(/YTDown\.com/gi, "MinusFlow.net").replace(/[\\/:*?"<>|]+/g, "-").trim();
  return cleaned || "MinusFlow.net_download";
};

const isAllowedDownloadHost = (hostname: string) => {
  if (
    hostname === "ytcontent.com" ||
    hostname.endsWith(".ytcontent.com") ||
    hostname === "googlevideo.com" ||
    hostname.endsWith(".googlevideo.com") ||
    hostname === "process4.me" ||
    hostname.endsWith(".process4.me") ||
    hostname === "iamworker.com" ||
    hostname.endsWith(".iamworker.com")
  ) {
    return true;
  }

  return /(^|\.)worker\d+\.com$/i.test(hostname);
};

const needsPreparation = (url: URL) => {
  if (url.hostname === "googlevideo.com" || url.hostname.endsWith(".googlevideo.com")) return false;
  return url.pathname.startsWith("/v5/video/") || url.pathname.startsWith("/v5/audio/");
};

const parseJsonResponse = async (response: Response) => {
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const resolveDownloadUrl = async (source: URL) => {
  if (!needsPreparation(source)) {
    return { url: source.toString(), fileName: "", ready: true };
  }

  for (let attempt = 0; attempt < DOWNLOAD_RESOLVE_ATTEMPTS; attempt += 1) {
    try {
      const head = await fetchWithTimeout(source.toString(), {
        method: "HEAD",
        headers: { "User-Agent": USER_AGENT, "Accept": "*/*" },
      });
      const headType = head.headers.get("Content-Type") || "";
      if (head.ok && !headType.toLowerCase().includes("application/json")) {
        return { url: source.toString(), fileName: "", ready: true };
      }
    } catch {
      // Some provider hosts reject HEAD; continue with GET JSON resolution.
    }

    try {
      const response = await fetchWithTimeout(source.toString(), {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      const result = await parseJsonResponse(response.clone());
      if (!result) {
        return { url: source.toString(), fileName: "", ready: response.ok };
      }

      const status = String((result as any).status || "").toLowerCase();
      if (status === "completed" && (result as any).fileUrl) {
        return {
          url: String((result as any).fileUrl),
          fileName: normalizeMediaValue((result as any).fileName),
          ready: true,
        };
      }

      if (status && status !== "queued" && status !== "processing") {
        return { url: source.toString(), fileName: "", ready: false };
      }
    } catch {
      return { url: source.toString(), fileName: "", ready: false };
    }

    if (attempt < DOWNLOAD_RESOLVE_ATTEMPTS - 1) await sleep(RETRY_DELAY_MS);
  }

  return { url: source.toString(), fileName: "", ready: false };
};

const proxyDownload = async (req: Request) => {
  const requestUrl = new URL(req.url);
  const source = requestUrl.searchParams.get("source") || "";
  const requestedFileName = requestUrl.searchParams.get("fileName") || "";

  if (!source) return jsonResponse({ error: "Missing source URL" }, 400);

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source);
  } catch {
    return jsonResponse({ error: "Invalid source URL" }, 400);
  }

  if (!["http:", "https:"].includes(sourceUrl.protocol) || !isAllowedDownloadHost(sourceUrl.hostname)) {
    return jsonResponse({ error: "Unsupported download host" }, 400);
  }

  const resolved = await resolveDownloadUrl(sourceUrl);
  if (!resolved.ready || !resolved.url) {
    return jsonResponse(
      { error: "Download is still being prepared", status: "processing" },
      503,
      { "Retry-After": "3", "X-Download-Status": "processing", "Cache-Control": "no-store" },
    );
  }

  let finalUrl: URL;
  try {
    finalUrl = new URL(resolved.url);
  } catch {
    return jsonResponse({ error: "Invalid resolved download URL" }, 502);
  }

  if (!["http:", "https:"].includes(finalUrl.protocol) || !isAllowedDownloadHost(finalUrl.hostname)) {
    return jsonResponse({ error: "Unsupported final download host" }, 400);
  }

  const fileName = sanitizeFileName(requestedFileName || resolved.fileName || finalUrl.pathname.split("/").pop() || "MinusFlow.net_download");
  const upstream = await fetchWithTimeout(finalUrl.toString(), {
    method: req.method,
    headers: { "User-Agent": USER_AGENT, "Accept": "*/*" },
  });

  if (!upstream.ok) {
    return jsonResponse({ error: `Download provider error: ${upstream.status}` }, 502);
  }

  const upstreamJson = await parseJsonResponse(upstream.clone());
  if (upstreamJson) {
    return jsonResponse({ error: "Download is still being prepared", status: "processing" }, 503, {
      "Retry-After": "3",
      "X-Download-Status": "processing",
    });
  }

  const headers = new Headers(corsHeaders);
  headers.set("Content-Type", upstream.headers.get("Content-Type") || "application/octet-stream");
  const contentLength = upstream.headers.get("Content-Length");
  if (contentLength) headers.set("Content-Length", contentLength);
  headers.set("Content-Disposition", `attachment; filename="${fileName.replace(/["\\]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);

  return new Response(req.method === "HEAD" ? null : upstream.body, {
    status: 200,
    headers,
  });
};

const fetchVideoInfo = async (url: string) => {
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
        return JSON.parse(text);
      } catch {
        lastError = text.trim().startsWith("<")
          ? "Provider returned a browser challenge instead of video data"
          : "Provider returned invalid video data";
      }
    }

    if (attempt < MAX_ATTEMPTS - 1) await sleep(700 + attempt * 900);
  }

  throw new Error(lastError);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method === "GET" || req.method === "HEAD") {
    return proxyDownload(req);
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return jsonResponse({ error: "url parameter is required" }, 400);
    }

    const data = await fetchVideoInfo(url);
    return jsonResponse(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message.includes("temporarily busy") || message.includes("browser challenge") ? 503 : 500;
    return jsonResponse({ error: message }, status);
  }
});
