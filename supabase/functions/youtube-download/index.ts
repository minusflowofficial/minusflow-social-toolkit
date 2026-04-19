const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Expose-Headers":
    "Content-Disposition, Content-Length, Content-Type",
};

const MAX_RETRIES = 10;
const RETRY_DELAY = 2000;
const DOWNLOAD_PROXY_RESOLVE_RETRIES = 2;
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ResolvedDownloadPayload = {
  fileUrl: string;
  fileName: string;
  fileSize: string;
  isReady: boolean;
};

const normalizeMediaValue = (value: unknown) => {
  if (typeof value !== "string") return "";

  const normalized = value.trim();
  return normalized && normalized.toLowerCase() !== "false" ? normalized : "";
};

const brandFileName = (value: string) => value.replace(/YTDown\.com/gi, "MinusFlow.net");

const sanitizeFileName = (value: string) => {
  const normalized = brandFileName(value.trim()).replace(/[\\/:*?"<>|]/g, "-");
  return normalized || "MinusFlow.net_download";
};

const PUBLIC_FUNCTION_PATH = "/functions/v1/youtube-download";

const isAllowedDownloadHost = (hostname: string) => {
  // Static allowlist of known YTDown infrastructure hosts + Google's CDN.
  // We also accept any `worker<NN>.com` (or subdomains) since YTDown rotates them.
  if (
    hostname === "ytcontent.com" ||
    hostname.endsWith(".ytcontent.com") ||
    hostname === "googlevideo.com" ||
    hostname.endsWith(".googlevideo.com") ||
    hostname === "process4.me" ||
    hostname.endsWith(".process4.me")
  ) {
    return true;
  }

  // Match worker hosts like worker03.com, s23.worker03.com, worker12.com, etc.
  if (/(^|\.)worker\d+\.com$/i.test(hostname)) {
    return true;
  }

  // Final CDN host that serves the prepared file (e.g. dl.iamworker.com).
  if (hostname === "iamworker.com" || hostname.endsWith(".iamworker.com")) {
    return true;
  }

  return false;
};

const requiresDownloadPreparation = (url: URL) => {
  if (!isAllowedDownloadHost(url.hostname)) return false;
  // Google CDN serves the final file directly — no preparation needed.
  if (url.hostname === "googlevideo.com" || url.hostname.endsWith(".googlevideo.com")) {
    return false;
  }
  return url.pathname.startsWith("/v5/video/") || url.pathname.startsWith("/v5/audio/");
};

const isPreparingStatus = (value: unknown) => value === "queued" || value === "processing";

const parseJsonResponse = async (response: Response) => {
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

const buildDownloadUrl = (req: Request, sourceUrl: string, fileName: string) => {
  const requestUrl = new URL(req.url);
  const publicBase =
    Deno.env.get("SUPABASE_URL") ||
    `${requestUrl.protocol === "http:" ? "https:" : requestUrl.protocol}//${requestUrl.host}`;
  const downloadUrl = new URL(PUBLIC_FUNCTION_PATH, publicBase);
  downloadUrl.searchParams.set("source", sourceUrl);
  downloadUrl.searchParams.set("fileName", fileName);
  return downloadUrl.toString();
};

const resolveDownloadPayload = async (
  mediaUrl: string,
  maxRetries = MAX_RETRIES,
): Promise<ResolvedDownloadPayload> => {
  if (!mediaUrl) {
    return { fileUrl: "", fileName: "", fileSize: "", isReady: false };
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let response: Response;
    try {
      response = await fetch(mediaUrl, {
        method: "HEAD",
        headers: { "User-Agent": BROWSER_USER_AGENT },
      });
    } catch {
      break;
    }

    // If HEAD returns a non-JSON success, the file is ready
    const contentType = response.headers.get("Content-Type") || "";
    if (response.ok && !contentType.toLowerCase().includes("application/json")) {
      return {
        fileUrl: mediaUrl,
        fileName: "",
        fileSize: response.headers.get("Content-Length") || "",
        isReady: true,
      };
    }

    // Some endpoints only return status via GET JSON; try GET for JSON endpoints
    if (response.ok || response.status === 425 || response.status === 202) {
      try {
        const getResp = await fetch(mediaUrl, {
          headers: { "User-Agent": BROWSER_USER_AGENT },
        });
        const result = await parseJsonResponse(getResp);
        if (!result) {
          return {
            fileUrl: mediaUrl,
            fileName: "",
            fileSize: getResp.headers.get("Content-Length") || "",
            isReady: true,
          };
        }

        if (result?.status === "completed" && result.fileUrl) {
          return {
            fileUrl: result.fileUrl,
            fileName: result.fileName || "",
            fileSize: result.fileSize || "",
            isReady: true,
          };
        }

        if (!isPreparingStatus(result?.status)) {
          break;
        }
      } catch {
        break;
      }
    } else {
      break;
    }

    if (attempt < maxRetries - 1) {
      await sleep(RETRY_DELAY);
    }
  }

  return { fileUrl: mediaUrl, fileName: "", fileSize: "", isReady: false };
};

const createJsonResponse = (
  body: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {},
) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
};

const createPreparationResponse = (status: "queued" | "processing") => {
  return createJsonResponse(
    {
      error: "Download is still being prepared",
      status,
    },
    202,
    {
      "Cache-Control": "no-store",
      "Retry-After": String(Math.ceil(RETRY_DELAY / 1000)),
      "X-Download-Status": status,
    },
  );
};

const proxyDownload = async (req: Request) => {
  const requestUrl = new URL(req.url);
  const source = requestUrl.searchParams.get("source") || "";
  const requestedFileName = requestUrl.searchParams.get("fileName") || "";

  if (!source) {
    return createJsonResponse({ error: "Missing 'source' query parameter" }, 400);
  }

  let sourceUrl: URL;

  try {
    sourceUrl = new URL(source);
  } catch {
    return createJsonResponse({ error: "Invalid 'source' query parameter" }, 400);
  }

  if (
    !["http:", "https:"].includes(sourceUrl.protocol) ||
    !isAllowedDownloadHost(sourceUrl.hostname)
  ) {
    return createJsonResponse({ error: "Unsupported download host" }, 400);
  }

  let upstreamUrl = sourceUrl;
  let resolvedFileName = requestedFileName;

  if (requiresDownloadPreparation(sourceUrl)) {
    const resolvedDownload = await resolveDownloadPayload(
      sourceUrl.toString(),
      req.method === "HEAD" ? 1 : DOWNLOAD_PROXY_RESOLVE_RETRIES,
    );

    if (!resolvedDownload.isReady || !resolvedDownload.fileUrl) {
      return createPreparationResponse("queued");
    }

    try {
      upstreamUrl = new URL(resolvedDownload.fileUrl);
    } catch {
      return createJsonResponse({ error: "Invalid upstream download URL" }, 502);
    }

    resolvedFileName = requestedFileName || resolvedDownload.fileName || "";
  }

  if (
    !["http:", "https:"].includes(upstreamUrl.protocol) ||
    !isAllowedDownloadHost(upstreamUrl.hostname)
  ) {
    return createJsonResponse({ error: "Unsupported final download host" }, 400);
  }

  const downloadFileName = sanitizeFileName(
    resolvedFileName || upstreamUrl.pathname.split("/").pop() || "",
  );
  const upstreamResponse = await fetch(upstreamUrl.toString(), {
    method: req.method,
    headers: {
      "User-Agent": BROWSER_USER_AGENT,
    },
  });

  if (!upstreamResponse.ok) {
    const upstreamError = await upstreamResponse.text();
    return createJsonResponse(
      { error: upstreamError || "Failed to download file" },
      502,
    );
  }

  const upstreamJson = await parseJsonResponse(upstreamResponse.clone());
  if (upstreamJson) {
    if (isPreparingStatus(upstreamJson.status)) {
      return createPreparationResponse(upstreamJson.status);
    }

    return createJsonResponse(
      { error: upstreamJson.error || upstreamJson.message || "Failed to download file" },
      502,
    );
  }

  const responseHeaders = new Headers(corsHeaders);
  responseHeaders.set(
    "Content-Type",
    upstreamResponse.headers.get("Content-Type") || "application/octet-stream",
  );

  const contentLength = upstreamResponse.headers.get("Content-Length");
  if (contentLength) {
    responseHeaders.set("Content-Length", contentLength);
  }

  const headerSafeFileName = downloadFileName.replace(/["\\]/g, "_");
  responseHeaders.set(
    "Content-Disposition",
    `attachment; filename="${headerSafeFileName}"; filename*=UTF-8''${encodeURIComponent(downloadFileName)}`,
  );

  return new Response(req.method === "HEAD" ? null : upstreamResponse.body, {
    status: 200,
    headers: responseHeaders,
  });
};

const extractPlaylistVideoIds = async (playlistId: string): Promise<string[]> => {
  const resp = await fetch(
    `https://www.youtube.com/playlist?list=${playlistId}`,
    { headers: { "User-Agent": BROWSER_USER_AGENT, "Accept-Language": "en-US,en;q=0.9" } },
  );
  if (!resp.ok) return [];
  const html = await resp.text();
  const ids = new Set<string>();
  const regex = /"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    ids.add(match[1]);
  }
  return Array.from(ids);
};

const extractPlaylistIdFromUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const listParam = parsed.searchParams.get("list");
    if (listParam) return listParam;
  } catch {}
  // Also accept raw playlist IDs
  if (/^PL[a-zA-Z0-9_-]+$/.test(url)) return url;
  return null;
};

const extractYouTubeVideoId = (url: string): string | null => {
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be" || parsed.hostname.endsWith(".youtu.be")) {
      const id = parsed.pathname.slice(1).split("/")[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }
    const v = parsed.searchParams.get("v");
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    const m = parsed.pathname.match(/\/(?:shorts|embed|v)\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
  } catch {}
  return null;
};

const buildThumbnailUrl = (videoId: string | null, fallback: string): string => {
  if (videoId) {
    // hqdefault.jpg always exists for public videos (480x360, no gray box).
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }
  return fallback;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method === "GET" || req.method === "HEAD") {
    return proxyDownload(req);
  }

  if (req.method !== "POST") {
    return createJsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { url, action } = await req.json();
    if (!url || typeof url !== "string") {
      return createJsonResponse({ error: "Missing 'url' field" }, 400);
    }

    // Handle playlist extraction
    if (action === "extract_playlist") {
      const playlistId = extractPlaylistIdFromUrl(url) || url;
      const videoIds = await extractPlaylistVideoIds(playlistId);
      if (videoIds.length === 0) {
        return createJsonResponse({ error: "No videos found in playlist" }, 404);
      }
      const videoUrls = videoIds.map(
        (id) => `https://www.youtube.com/watch?v=${id}`,
      );
      return new Response(
        JSON.stringify({ playlistId, videoCount: videoUrls.length, videoUrls }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Regular single-video flow
    const proxyHeaders: Record<string, string> = {
      Origin: "https://app.ytdown.to",
      Referer: "https://app.ytdown.to/en23/",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": BROWSER_USER_AGENT,
    };

    let result: any = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const body = new URLSearchParams({ url });
      const resp = await fetch("https://app.ytdown.to/proxy.php", {
        method: "POST",
        headers: proxyHeaders,
        body: body.toString(),
      });

      result = await resp.json();

      if (result?.status !== "queued") {
        break;
      }

      await sleep(RETRY_DELAY);
    }

    if (!result || !result.api) {
      return createJsonResponse({ error: "Failed to fetch video info" }, 502);
    }

    const api = result.api;
    const title = api.title || "";
    const videoId = extractYouTubeVideoId(url);
    const thumbnail = buildThumbnailUrl(
      videoId,
      api.imagePreviewUrl || api.previewUrl || "",
    );
    const mediaItems = (api.mediaItems || []).map((item: any) => {
        const mediaQuality = normalizeMediaValue(item.mediaQuality);
        const mediaRes = normalizeMediaValue(item.mediaRes);
        const extension = normalizeMediaValue(item.mediaExtension).toLowerCase();
        const rawUrl = item.mediaUrl || "";
        const fallbackFileName = sanitizeFileName(
          `MinusFlow.net_${item.mediaId || "download"}${extension ? `.${extension}` : ""}`,
        );
        const brandedFileName = sanitizeFileName(
          brandFileName(item.mediaFileName || "") || fallbackFileName,
        );

        return {
          formatId: item.mediaId || "",
          quality: mediaQuality && mediaRes
            ? `${mediaQuality} (${mediaRes})`
            : mediaQuality || mediaRes,
          extension,
          size: normalizeMediaValue(item.mediaFileSize),
          url: rawUrl
            ? buildDownloadUrl(req, rawUrl, brandedFileName)
            : "",
          duration: normalizeMediaValue(item.mediaDuration),
          thumbnail: item.mediaThumbnail || "",
          fileName: brandedFileName,
        };
      });

    return new Response(JSON.stringify({ title, thumbnail, mediaItems }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return createJsonResponse({ error: (err as Error).message }, 500);
  }
});