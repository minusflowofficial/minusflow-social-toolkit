export interface DownloadRequest {
  url: string;
  fileName?: string;
}

const BASE_DOWNLOAD_COUNT = 50;
const DOWNLOAD_COUNT_STORAGE_KEY = "ytfetch-download-count";
const DOWNLOAD_COUNT_EVENT = "ytfetch-download-count-updated";
const DOWNLOAD_FRAME_CLEANUP_MS = 60_000;
const DOWNLOAD_PREPARATION_RETRY_MS = 3_000;
const DOWNLOAD_PREPARATION_MAX_ATTEMPTS = 120;

const canUseBrowserApis = () => typeof window !== "undefined";

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const parseStoredCount = (value: string | null) => {
  const parsedValue = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 0;
};

const getStoredDownloadCount = () => {
  if (!canUseBrowserApis()) return 0;
  return parseStoredCount(window.localStorage.getItem(DOWNLOAD_COUNT_STORAGE_KEY));
};

const emitDownloadCountUpdate = () => {
  if (!canUseBrowserApis()) return;
  window.dispatchEvent(new Event(DOWNLOAD_COUNT_EVENT));
};

const createDownloadAnchor = ({ url, fileName }: DownloadRequest) => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";

  if (fileName) {
    anchor.download = fileName;
  }

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

const createDownloadFrame = (url: string) => {
  const frame = document.createElement("iframe");
  frame.src = url;
  frame.style.display = "none";
  frame.setAttribute("aria-hidden", "true");

  document.body.appendChild(frame);
  window.setTimeout(() => frame.remove(), DOWNLOAD_FRAME_CLEANUP_MS);
};

const isPreparationPending = (response: Response) => {
  const statusHeader = response.headers.get("X-Download-Status");
  return (
    response.status === 425 ||
    response.status === 202 ||
    statusHeader === "queued" ||
    statusHeader === "processing"
  );
};

const waitForPreparedDownload = async (url: string) => {
  for (let attempt = 0; attempt < DOWNLOAD_PREPARATION_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "HEAD",
      });

      if (response.ok && !isPreparationPending(response)) {
        return true;
      }

      if (!isPreparationPending(response)) {
        return false;
      }
    } catch {
      return false;
    }

    await wait(DOWNLOAD_PREPARATION_RETRY_MS);
  }

  return false;
};

const startPreparedDownload = async (
  download: DownloadRequest,
  method: "anchor" | "frame",
) => {
  const isReady = await waitForPreparedDownload(download.url);
  if (!isReady) return false;

  if (method === "anchor") {
    createDownloadAnchor(download);
  } else {
    createDownloadFrame(download.url);
  }

  incrementDownloadCount();
  return true;
};

export const getTotalDownloadCount = () => BASE_DOWNLOAD_COUNT + getStoredDownloadCount();

export const incrementDownloadCount = (amount = 1) => {
  if (!canUseBrowserApis() || amount <= 0) return getTotalDownloadCount();

  const nextStoredCount = getStoredDownloadCount() + amount;
  window.localStorage.setItem(DOWNLOAD_COUNT_STORAGE_KEY, String(nextStoredCount));
  emitDownloadCountUpdate();

  return BASE_DOWNLOAD_COUNT + nextStoredCount;
};

export const subscribeToDownloadCount = (callback: (count: number) => void) => {
  if (!canUseBrowserApis()) {
    return () => undefined;
  }

  const handleCountUpdate = () => callback(getTotalDownloadCount());
  const handleStorage = (event: StorageEvent) => {
    if (event.key === DOWNLOAD_COUNT_STORAGE_KEY) {
      callback(getTotalDownloadCount());
    }
  };

  handleCountUpdate();
  window.addEventListener(DOWNLOAD_COUNT_EVENT, handleCountUpdate);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(DOWNLOAD_COUNT_EVENT, handleCountUpdate);
    window.removeEventListener("storage", handleStorage);
  };
};

export const triggerDownload = (download: DownloadRequest) => {
  if (!canUseBrowserApis() || !download.url) return false;

  void startPreparedDownload(download, "anchor");
  return true;
};

export const triggerBatchDownloads = (downloads: DownloadRequest[]) => {
  if (!canUseBrowserApis()) return 0;

  const validDownloads = downloads.filter((download) => Boolean(download.url));
  if (!validDownloads.length) return 0;

  validDownloads.forEach((download, index) => {
    void (async () => {
      if (index > 0) {
        await wait(index * 400);
      }

      await startPreparedDownload(download, "frame");
    })();
  });

  return validDownloads.length;
};

export { BASE_DOWNLOAD_COUNT };