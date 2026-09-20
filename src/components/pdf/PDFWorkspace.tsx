import React from 'react';
import { PDFHeader } from './PDFHeader';
import { PDFRibbonToolbar } from './PDFRibbonToolbar';
import { PDFDocumentTabs } from './PDFDocumentTabs';
import { PDFCanvasViewer } from './PDFCanvasViewer';
import { PDFRightSidebar } from './PDFRightSidebar';
import { PDFQuickToolsModal } from './PDFQuickToolsModal';
import { PDFLeftRail } from './PDFLeftRail';
import { PenLine, Search } from 'lucide-react';
import { usePdfWorkspace } from '../../lib/pdf/workspaceStore';

/**
 * Unified Soda PDF–style workspace — one page, all tools via ribbon + panels.
 */
export const PDFWorkspace: React.FC = () => {
  const ribbonTab = usePdfWorkspace((s) => s.ribbonTab);
  const setRibbonTab = usePdfWorkspace((s) => s.setRibbonTab);

  return (
    <div className="h-[100dvh] max-h-[100dvh] flex flex-col bg-[#e8eaed] text-[#0f172a] overflow-hidden">
      <PDFHeader />
      <PDFRibbonToolbar />
      <PDFDocumentTabs />

      <div className="flex-1 min-h-0 flex relative">
        <PDFLeftRail />
        <PDFCanvasViewer />

        {/* Floating mid-rail like Soda (search / edit) */}
        <div className="absolute right-[260px] top-1/3 z-20 hidden lg:flex flex-col gap-1 bg-white border border-[#e5e7eb] rounded-l-lg shadow-sm p-1">
          <button type="button" className="p-2 text-[#64748b] hover:text-[#2563eb] rounded" title="Search">
            <Search size={14} />
          </button>
          <button
            type="button"
            onClick={() => setRibbonTab('esign')}
            className={`p-2 rounded ${
              ribbonTab === 'esign' ? 'bg-[#dbeafe] text-[#2563eb]' : 'text-[#64748b] hover:text-[#2563eb]'
            }`}
            title="Sign"
          >
            <PenLine size={14} />
          </button>
        </div>

        <PDFRightSidebar />
      </div>

      <PDFQuickToolsModal />
    </div>
  );
};

export default PDFWorkspace;
