const canShareFiles = (files: File[]) => {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.share !== 'function' ||
    typeof navigator.canShare !== 'function'
  ) {
    return false;
  }
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
};

export const downloadFiles = (files: File[]) => {
  files.forEach(file => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  });
};

const openWhatsAppMessage = (message: string) => {
  window.open(
    `https://wa.me/?text=${encodeURIComponent(message)}`,
    '_blank',
    'noopener,noreferrer'
  );
};

export const shareFilesWithDownloadFallback = async ({
  files,
  message,
  title,
}: {
  files: File[];
  message: string;
  title: string;
}) => {
  if (canShareFiles(files)) {
    await navigator.share({ files, text: message, title });
    return 'SHARED' as const;
  }

  downloadFiles(files);
  openWhatsAppMessage(message);
  return 'DOWNLOADED' as const;
};
