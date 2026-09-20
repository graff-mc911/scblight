import React from 'react';
import {
  Home,
  Menu,
  Minus,
  Plus,
  Search,
  ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { type RibbonTab, usePdfWorkspace } from '../../lib/pdf/workspaceStore';

const TABS: { id: RibbonTab; label: string; dot?: boolean }[] = [
  { id: 'view', label: 'View' },
  { id: 'create', label: 'Create & Convert' },
  { id: 'fill', label: 'Fill & Sign' },
  { id: 'edit', label: 'Edit' },
  { id: 'page', label: 'Page' },
  { id: 'comment', label: 'Comment' },
  { id: 'secure', label: 'Secure' },
  { id: 'forms', label: 'Forms' },
  { id: 'esign', label: 'E-Sign', dot: true },
  { id: 'ocr', label: 'OCR' },
  { id: 'translate', label: 'Translate' },
  { id: 'ai', label: 'AI Assistant' },
];

const SUB: Record<RibbonTab, { id: string; label: string }[]> = {
  view: [
    { id: 'fit-width', label: 'Fit width' },
    { id: 'fit-page', label: 'Fit page' },
    { id: 'single', label: 'Single page' },
    { id: 'continuous', label: 'Continuous' },
  ],
  create: [
    { id: 'to-pdf', label: 'Create PDF' },
    { id: 'from-pdf', label: 'Convert from PDF' },
    { id: 'merge', label: 'Merge' },
    { id: 'split', label: 'Split' },
    { id: 'compress', label: 'Compress' },
  ],
  fill: [
    { id: 'sign-doc', label: 'Sign your document' },
    { id: 'request', label: 'Request signature' },
    { id: 'inbox', label: 'Inbox' },
    { id: 'my-sig', label: 'My signature' },
  ],
  edit: [
    { id: 'text', label: 'Edit text' },
    { id: 'image', label: 'Edit image' },
    { id: 'link', label: 'Link' },
    { id: 'redact', label: 'Redact' },
  ],
  page: [
    { id: 'rotate', label: 'Rotate' },
    { id: 'delete', label: 'Delete' },
    { id: 'extract', label: 'Extract' },
    { id: 'organize', label: 'Organize' },
  ],
  comment: [
    { id: 'note', label: 'Note' },
    { id: 'highlight', label: 'Highlight' },
    { id: 'stamp', label: 'Stamp' },
  ],
  secure: [
    { id: 'protect', label: 'Protect' },
    { id: 'unlock', label: 'Unlock' },
    { id: 'watermark', label: 'Watermark' },
  ],
  forms: [
    { id: 'text-field', label: 'Text field' },
    { id: 'checkbox', label: 'Checkbox' },
    { id: 'dropdown', label: 'Dropdown' },
  ],
  esign: [
    { id: 'sign-doc', label: 'Sign your document' },
    { id: 'request', label: 'Request signature' },
    { id: 'inbox', label: 'Inbox' },
    { id: 'my-sig', label: 'My signature' },
    { id: 'manage', label: 'Manage signers' },
  ],
  ocr: [
    { id: 'recognize', label: 'Recognize text' },
    { id: 'searchable', label: 'Make searchable' },
  ],
  translate: [
    { id: 'lang', label: 'Translate page' },
    { id: 'doc', label: 'Translate document' },
  ],
  ai: [
    { id: 'ask', label: 'Ask AI' },
    { id: 'summarize', label: 'Summarize' },
  ],
};

export const PDFRibbonToolbar: React.FC = () => {
  const navigate = useNavigate();
  const ribbonTab = usePdfWorkspace((s) => s.ribbonTab);
  const subAction = usePdfWorkspace((s) => s.subAction);
  const zoom = usePdfWorkspace((s) => s.zoom);
  const setRibbonTab = usePdfWorkspace((s) => s.setRibbonTab);
  const setSubAction = usePdfWorkspace((s) => s.setSubAction);
  const zoomIn = usePdfWorkspace((s) => s.zoomIn);
  const zoomOut = usePdfWorkspace((s) => s.zoomOut);
  const setZoom = usePdfWorkspace((s) => s.setZoom);
  const setQuickToolsOpen = usePdfWorkspace((s) => s.setQuickToolsOpen);

  const subs = SUB[ribbonTab] || [];

  return (
    <div className="bg-white border-b border-[#e5e7eb] shrink-0 z-20">
      {/* Primary tabs */}
      <div className="flex items-center gap-0.5 px-2 pt-1 overflow-x-auto scrollbar-thin">
        <button
          type="button"
          className="p-2 text-[#64748b] hover:bg-[#f1f5f9] rounded"
          title="Menu"
        >
          <Menu size={16} />
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="p-2 text-[#64748b] hover:bg-[#f1f5f9] rounded"
          title="Home"
        >
          <Home size={16} />
        </button>
        <div className="w-px h-5 bg-[#e2e8f0] mx-1" />
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setRibbonTab(tab.id);
              if (tab.id === 'create') setQuickToolsOpen(true);
            }}
            className={`relative px-2.5 py-2 text-[12px] whitespace-nowrap rounded-t-md transition-colors ${
              ribbonTab === tab.id
                ? 'text-[#0f172a] font-semibold bg-[#f8fafc]'
                : 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc]'
            }`}
          >
            {tab.label}
            {tab.dot && ribbonTab === tab.id && (
              <span className="absolute top-1.5 right-1 w-1.5 h-1.5 rounded-full bg-[#e11d48]" />
            )}
          </button>
        ))}
      </div>

      {/* Secondary sub-toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-[#f8fafc] border-t border-[#eef2f7] min-h-[40px]">
        <div className="flex items-center gap-0.5 flex-1 overflow-x-auto">
          {subs.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSubAction(s.id);
                if (['merge', 'split', 'compress', 'to-pdf', 'from-pdf'].includes(s.id)) {
                  setQuickToolsOpen(true);
                }
              }}
              className={`px-3 py-1.5 text-[12px] whitespace-nowrap rounded-md transition-colors ${
                subAction === s.id
                  ? 'bg-[#dbeafe] text-[#1d4ed8] font-medium'
                  : 'text-[#475569] hover:bg-white hover:text-[#0f172a]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5 shrink-0 pl-2 border-l border-[#e2e8f0] ml-2">
          <button
            type="button"
            onClick={zoomOut}
            className="p-1.5 rounded hover:bg-white text-[#64748b]"
            title="Zoom out"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(100)}
            className="px-2 py-1 text-[12px] text-[#334155] hover:bg-white rounded flex items-center gap-0.5 min-w-[52px] justify-center"
          >
            {zoom}%
            <ChevronDown size={12} className="text-[#94a3b8]" />
          </button>
          <button
            type="button"
            onClick={zoomIn}
            className="p-1.5 rounded hover:bg-white text-[#64748b]"
            title="Zoom in"
          >
            <Plus size={14} />
          </button>
          <button type="button" className="p-1.5 rounded hover:bg-white text-[#64748b] ml-1" title="Search">
            <Search size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
