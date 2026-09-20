import { create } from 'zustand';

export type RibbonTab =
  | 'view'
  | 'create'
  | 'fill'
  | 'edit'
  | 'page'
  | 'comment'
  | 'secure'
  | 'forms'
  | 'esign'
  | 'ocr'
  | 'translate'
  | 'ai';

export type OverlayFieldType = 'signature' | 'initials' | 'date' | 'name' | 'email';

export interface OverlayField {
  id: string;
  type: OverlayFieldType;
  page: number;
  /** percent of page width/height (0–100) */
  x: number;
  y: number;
  w: number;
  h: number;
  value?: string;
}

export interface OpenDocument {
  id: string;
  name: string;
  file: File | null;
  /** rendered page data URLs */
  pageUrls: string[];
  pageCount: number;
  fields: OverlayField[];
}

export type QuickToolId =
  | 'merge'
  | 'compress'
  | 'edit'
  | 'convert'
  | 'split'
  | 'sign'
  | 'pdf-to-word'
  | 'pdf-to-excel'
  | 'pdf-to-ppt'
  | 'resize'
  | 'pdf-to-jpg'
  | 'rotate'
  | 'ppt-to-pdf'
  | 'excel-to-pdf'
  | 'word-to-pdf'
  | 'protect'
  | 'unlock'
  | 'read'
  | 'ocr'
  | 'delete-pages'
  | 'watermark'
  | 'html-to-pdf';

interface PdfWorkspaceState {
  documents: OpenDocument[];
  activeDocId: string | null;
  ribbonTab: RibbonTab;
  subAction: string;
  zoom: number;
  sidebarOpen: boolean;
  leftRail: 'pages' | 'bookmarks' | null;
  quickToolsOpen: boolean;
  workflowStep: 1 | 2;
  selectedFieldId: string | null;
  placingType: OverlayFieldType | null;
  statusMsg: string;

  setRibbonTab: (tab: RibbonTab) => void;
  setSubAction: (action: string) => void;
  setZoom: (z: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setLeftRail: (rail: 'pages' | 'bookmarks' | null) => void;
  setQuickToolsOpen: (open: boolean) => void;
  setWorkflowStep: (step: 1 | 2) => void;
  setActiveDoc: (id: string) => void;
  closeDoc: (id: string) => void;
  addDocument: (doc: OpenDocument) => void;
  updateDocument: (id: string, patch: Partial<OpenDocument>) => void;
  setPlacingType: (t: OverlayFieldType | null) => void;
  addField: (field: OverlayField) => void;
  updateField: (id: string, patch: Partial<OverlayField>) => void;
  removeField: (id: string) => void;
  setSelectedField: (id: string | null) => void;
  setStatusMsg: (msg: string) => void;
  activeDocument: () => OpenDocument | null;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const usePdfWorkspace = create<PdfWorkspaceState>((set, get) => ({
  documents: [],
  activeDocId: null,
  ribbonTab: 'esign',
  subAction: 'sign-doc',
  zoom: 100,
  sidebarOpen: true,
  leftRail: 'pages',
  quickToolsOpen: false,
  workflowStep: 2,
  selectedFieldId: null,
  placingType: null,
  statusMsg: '',

  setRibbonTab: (tab) => {
    const defaults: Partial<Record<RibbonTab, string>> = {
      view: 'fit-width',
      create: 'to-pdf',
      fill: 'sign-doc',
      edit: 'text',
      page: 'rotate',
      comment: 'note',
      secure: 'protect',
      forms: 'text-field',
      esign: 'sign-doc',
      ocr: 'recognize',
      translate: 'lang',
      ai: 'ask',
    };
    set({
      ribbonTab: tab,
      subAction: defaults[tab] || 'sign-doc',
      sidebarOpen: tab === 'esign' || tab === 'fill' || tab === 'edit' || tab === 'ocr',
    });
  },
  setSubAction: (action) => set({ subAction: action }),
  setZoom: (z) => set({ zoom: Math.min(200, Math.max(40, Math.round(z))) }),
  zoomIn: () => set((s) => ({ zoom: Math.min(200, s.zoom + 10) })),
  zoomOut: () => set((s) => ({ zoom: Math.max(40, s.zoom - 10) })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setLeftRail: (rail) => set({ leftRail: rail }),
  setQuickToolsOpen: (open) => set({ quickToolsOpen: open }),
  setWorkflowStep: (step) => set({ workflowStep: step }),
  setActiveDoc: (id) => set({ activeDocId: id }),
  closeDoc: (id) =>
    set((s) => {
      const documents = s.documents.filter((d) => d.id !== id);
      const activeDocId =
        s.activeDocId === id ? documents[0]?.id || null : s.activeDocId;
      return { documents, activeDocId };
    }),
  addDocument: (doc) =>
    set((s) => ({
      documents: [...s.documents, doc],
      activeDocId: doc.id,
      workflowStep: doc.pageCount > 0 ? 2 : 1,
    })),
  updateDocument: (id, patch) =>
    set((s) => ({
      documents: s.documents.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    })),
  setPlacingType: (t) => set({ placingType: t }),
  addField: (field) => {
    const doc = get().activeDocument();
    if (!doc) return;
    get().updateDocument(doc.id, { fields: [...doc.fields, field] });
    set({ selectedFieldId: field.id, placingType: null });
  },
  updateField: (id, patch) => {
    const doc = get().activeDocument();
    if (!doc) return;
    get().updateDocument(doc.id, {
      fields: doc.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  },
  removeField: (id) => {
    const doc = get().activeDocument();
    if (!doc) return;
    get().updateDocument(doc.id, { fields: doc.fields.filter((f) => f.id !== id) });
    if (get().selectedFieldId === id) set({ selectedFieldId: null });
  },
  setSelectedField: (id) => set({ selectedFieldId: id }),
  setStatusMsg: (msg) => set({ statusMsg: msg }),
  activeDocument: () => {
    const s = get();
    return s.documents.find((d) => d.id === s.activeDocId) || null;
  },
}));

export function createEmptyDoc(name = 'Untitled.pdf'): OpenDocument {
  return {
    id: uid(),
    name,
    file: null,
    pageUrls: [],
    pageCount: 0,
    fields: [],
  };
}

export { uid };
