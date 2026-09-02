import type { UniversalDocument } from './types';

export const SCBDOC_MIME = 'application/vnd.scblight.document+json';
export const SCBDOC_EXT = '.scbdoc.json';

export function exportDocumentJson(doc: UniversalDocument): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: SCBDOC_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.name.replace(/[^\w\u0400-\u04FF.-]+/g, '_')}${SCBDOC_EXT}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseDocumentJson(text: string): UniversalDocument {
  const parsed = JSON.parse(text) as UniversalDocument;
  if (!parsed.version || !parsed.mode) throw new Error('Невірний формат файлу');
  return parsed;
}

export async function readDocumentFile(file: File): Promise<UniversalDocument> {
  const text = await file.text();
  return parseDocumentJson(text);
}