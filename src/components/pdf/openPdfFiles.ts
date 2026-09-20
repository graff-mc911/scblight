import { usePdfStore } from '../../store/usePdfStore';

/** Shared file open via store */
export async function openPdfFiles(list: FileList | null) {
  if (!list?.length) return;
  await usePdfStore.getState().importFiles(list);
}
