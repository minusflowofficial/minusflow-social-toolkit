import { useEffect, useState } from "react";

import { getTotalDownloadCount, subscribeToDownloadCount } from "@/lib/download-manager";

const useDownloadCount = () => {
  const [downloadCount, setDownloadCount] = useState(getTotalDownloadCount);

  useEffect(() => subscribeToDownloadCount(setDownloadCount), []);

  return downloadCount;
};

export default useDownloadCount;