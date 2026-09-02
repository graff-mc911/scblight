import type { StoredDocumentMeta, UniversalDocument } from './types';
import { getPreviewText } from './utils';

const DB_NAME = 'scb_document_editor';
const DB_VERSION = 1;
const STORE = 'documents';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
  });
}

export async function saveDocumentToApp(doc: UniversalDocument): Promise<void> {
  const db = await openDb();
  const updated = { ...doc, updatedAt: new Date().toISOString() };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(updated);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadDocumentFromApp(id: string): Promise<UniversalDocument | null> {
  const db = await openDb();
  const result = await new Promise<UniversalDocument | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as UniversalDocument) || null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function listStoredDocuments(): Promise<StoredDocumentMeta[]> {
  const db = await openDb();
  const all = await new Promise<UniversalDocument[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as UniversalDocument[]) || []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return all
    .map((d) => ({
      id: d.id,
      name: d.name,
      mode: d.mode,
      updatedAt: d.updatedAt,
      preview: getPreviewText(d),
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteStoredDocument(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}