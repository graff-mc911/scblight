/**
 * Share or download invoice PDF(s) via Web Share API with download fallback.
 */

export type SharePdfResult = 'shared' | 'downloaded';

function downloadBlob(blob: Blob, fileName: string): void {
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
}

function toPdfFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, { type: 'application/pdf' });
}

async function tryShareFiles(
  files: File[],
  title?: string,
  text?: string
): Promise<boolean> {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.share !== 'function' ||
    files.length === 0
  ) {
    return false;
  }

  const payload = {
    files,
    title: title || files[0].name,
    text: text || title || files[0].name,
  };

  if (typeof navigator.canShare === 'function' && !navigator.canShare(payload)) {
    return false;
  }

  try {
    await navigator.share(payload);
    return true;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    return false;
  }
}

/**
 * Share a single PDF via Web Share API, or download as fallback.
 */
export async function shareOrDownloadPdf(options: {
  blob: Blob;
  fileName: string;
  title?: string;
  text?: string;
}): Promise<SharePdfResult> {
  const { blob, fileName, title, text } = options;
  const file = toPdfFile(blob, fileName);

  if (await tryShareFiles([file], title, text)) {
    return 'shared';
  }

  downloadBlob(blob, fileName);
  return 'downloaded';
}

/**
 * Share multiple PDFs via Web Share API when supported.
 * Falls back to downloading each file (and optional mailto without attachments).
 */
export async function shareOrDownloadPdfs(options: {
  files: Array<{ blob: Blob; fileName: string }>;
  title?: string;
  text?: string;
  openMailtoFallback?: boolean;
}): Promise<SharePdfResult> {
  const { files, title, text, openMailtoFallback = false } = options;

  if (files.length === 0) {
    throw new Error('No files to share');
  }

  if (files.length === 1) {
    return shareOrDownloadPdf({
      blob: files[0].blob,
      fileName: files[0].fileName,
      title,
      text,
    });
  }

  const shareFiles = files.map(({ blob, fileName }) => toPdfFile(blob, fileName));

  if (await tryShareFiles(shareFiles, title, text)) {
    return 'shared';
  }

  for (const { blob, fileName } of files) {
    downloadBlob(blob, fileName);
  }

  if (openMailtoFallback) {
    const subject = encodeURIComponent(title || 'Invoices');
    const body = encodeURIComponent(
      text ||
        `Attached invoices were downloaded: ${files.map((f) => f.fileName).join(', ')}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank', 'noopener,noreferrer');
  }

  return 'downloaded';
}

/**
 * Force-download one or more PDF blobs to the device.
 */
export function downloadPdfFiles(files: Array<{ blob: Blob; fileName: string }>): void {
  for (const { blob, fileName } of files) {
    downloadBlob(blob, fileName);
  }
}

export async function fetchPdfBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF (${response.status})`);
  }
  return response.blob();
}
