import { createEmptyDoc, usePdfWorkspace } from '../../lib/pdf/workspaceStore';
import { getPdfPageCount, renderPdfPageToDataUrl } from '../../lib/documentEditor/pdfTools';

/** Shared open helper for canvas empty-state and document tabs */
export async function openPdfFiles(list: FileList | null) {
  if (!list?.length) return;
  const { addDocument, updateDocument, setStatusMsg, setWorkflowStep } = usePdfWorkspace.getState();

  for (const file of Array.from(list)) {
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') continue;
    const doc = createEmptyDoc(file.name);
    doc.file = file;
    addDocument(doc);
    setWorkflowStep(1);
    try {
      setStatusMsg(`Завантаження ${file.name}…`);
      const count = await getPdfPageCount(file);
      const urls: string[] = [];
      for (let p = 1; p <= count; p += 1) {
        setStatusMsg(`${file.name}: стор. ${p}/${count}`);
        urls.push(await renderPdfPageToDataUrl(file, p, 1.5, 0.88));
      }
      updateDocument(doc.id, { pageUrls: urls, pageCount: count });
      setWorkflowStep(2);
      setStatusMsg('');
    } catch {
      setStatusMsg('Не вдалося відкрити PDF');
    }
  }
}
