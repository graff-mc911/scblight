/**
 * Share or download an invoice PDF via Web Share API with download fallback.
 */
export async function shareOrDownloadPdf(options: {
  blob: Blob;
  fileName: string;
  title?: string;
  text?: string;
}): Promise<'shared' | 'downloaded'> {
  const { blob, fileName, title, text } = options;
  const file = new File([blob], fileName, { type: 'application/pdf' });

  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    (typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] }));

  if (canShareFiles) {
    try {
      await navigator.share({
        files: [file],
        title: title || fileName,
        text: text || title || fileName,
      });
      return 'shared';
    } catch (error: any) {
      // User cancelled share sheet — not an error
      if (error?.name === 'AbortError') {
        throw error;
      }
      // Fall through to download if share failed for other reasons
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return 'downloaded';
}

export async function fetchPdfBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF (${response.status})`);
  }
  return response.blob();
}
