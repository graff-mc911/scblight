import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent } from '@tiptap/react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Download,
  FileJson,
  FileText,
  FolderOpen,
  GripVertical,
  Layout,
  Loader2,
  MonitorPlay,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import type { ContentBlock, EditorMode, UniversalDocument } from '../../lib/documentEditor/types';
import { createDocument, emptyTableBlock, emptyTextBlock, uid } from '../../lib/documentEditor/utils';
import {
  deleteStoredDocument,
  listStoredDocuments,
  loadDocumentFromApp,
  saveDocumentToApp,
} from '../../lib/documentEditor/storage';
import { exportDocumentJson, readDocumentFile } from '../../lib/documentEditor/exportJson';
import { exportDocumentHtml, createShareLink } from '../../lib/documentEditor/exportHtml';
import { exportDocumentPdf } from '../../lib/documentEditor/exportPdf';
import { exportBookToEpub } from '../../lib/documentEditor/exportEpub';
import { EditorToolbar } from './EditorToolbar';
import { PresentationPlayer } from './PresentationPlayer';

const extensions = [
  StarterKit,
  Underline,
  TextStyle,
  Color,
  Highlight,
  Link.configure({ openOnClick: false }),
  Image,
  Table,
  TableRow,
  TableHeader,
  TableCell,
  TaskList,
  TaskItem,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Placeholder.configure({ placeholder: 'Почніть писати...' }),
];

interface Props {
  onClose?: () => void;
  /** Документ для відкриття ззовні (шаблон, OCR тощо) */
  initialDocument?: UniversalDocument | null;
  /** Зміна ключа перемонтовує редактор */
  documentKey?: string;
}

export const UniversalDocumentEditor: React.FC<Props> = ({ onClose, initialDocument, documentKey }) => {
  const [doc, setDoc] = useState<UniversalDocument | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [library, setLibrary] = useState<Awaited<ReturnType<typeof listStoredDocuments>>>([]);
  const [presenting, setPresenting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [dragBlockId, setDragBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeBlocks = (): ContentBlock[] => {
    if (!doc) return [];
    if (doc.mode === 'document') {
      const s = doc.sections?.find((x) => x.id === activeSectionId) || doc.sections?.[0];
      return s?.blocks || [];
    }
    if (doc.mode === 'presentation') {
      const s = doc.slides?.find((x) => x.id === activeSlideId) || doc.slides?.[0];
      return s?.blocks || [];
    }
    const ch = doc.chapters?.find((x) => x.id === activeChapterId) || doc.chapters?.[0];
    return ch?.blocks || [];
  };

  const activeTextBlock = activeBlocks().find((b) => b.id === activeBlockId && b.type === 'text');
  const activeHtml = activeTextBlock && activeTextBlock.type === 'text' ? activeTextBlock.html : '<p></p>';

  const editor = useEditor({
    extensions,
    content: activeHtml,
    onUpdate: ({ editor: ed }) => updateActiveTextBlock(ed.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none min-h-[160px] px-4 py-3 focus:outline-none text-white/90',
      },
    },
  });

  useEffect(() => {
    if (editor && activeTextBlock) {
      const html = activeTextBlock.html;
      if (html !== editor.getHTML()) editor.commands.setContent(html, false);
    }
  }, [activeBlockId, activeSectionId, activeSlideId, activeChapterId, editor]);

  const updateDoc = useCallback((updater: (d: UniversalDocument) => UniversalDocument) => {
    setDoc((prev) => (prev ? { ...updater(prev), updatedAt: new Date().toISOString() } : prev));
  }, []);

  const updateActiveTextBlock = (html: string) => {
    if (!doc || !activeBlockId) return;
    updateDoc((d) => {
      const patch = (blocks: ContentBlock[]) =>
        blocks.map((b) => (b.id === activeBlockId && b.type === 'text' ? { ...b, html } : b));

      if (d.mode === 'document' && d.sections) {
        return { ...d, sections: d.sections.map((s) => (s.id === activeSectionId ? { ...s, blocks: patch(s.blocks) } : s)) };
      }
      if (d.mode === 'presentation' && d.slides) {
        return { ...d, slides: d.slides.map((s) => (s.id === activeSlideId ? { ...s, blocks: patch(s.blocks) } : s)) };
      }
      if (d.chapters) {
        return { ...d, chapters: d.chapters.map((c) => (c.id === activeChapterId ? { ...c, blocks: patch(c.blocks) } : c)) };
      }
      return d;
    });
  };

  const startNew = (mode: EditorMode) => {
    const name = window.prompt('Назва документа:', 'Новий документ');
    if (!name) return;
    const newDoc = createDocument(name, mode);
    setDoc(newDoc);
    if (mode === 'document') {
      setActiveSectionId(newDoc.sections![0].id);
      setActiveBlockId(newDoc.sections![0].blocks[0].id);
    } else if (mode === 'presentation') {
      setActiveSlideId(newDoc.slides![0].id);
      setActiveBlockId(newDoc.slides![0].blocks[0].id);
    } else {
      setActiveChapterId(newDoc.chapters![0].id);
      setActiveBlockId(newDoc.chapters![0].blocks[0].id);
    }
  };

  const openDoc = (d: UniversalDocument) => {
    setDoc(d);
    if (d.mode === 'document' && d.sections?.[0]) {
      setActiveSectionId(d.sections[0].id);
      setActiveBlockId(d.sections[0].blocks[0]?.id || null);
    } else if (d.mode === 'presentation' && d.slides?.[0]) {
      setActiveSlideId(d.slides[0].id);
      setActiveBlockId(d.slides[0].blocks[0]?.id || null);
    } else if (d.chapters?.[0]) {
      setActiveChapterId(d.chapters[0].id);
      setActiveBlockId(d.chapters[0].blocks[0]?.id || null);
    }
    setShowLibrary(false);
  };

  useEffect(() => {
    if (initialDocument) openDoc(initialDocument);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentKey]);

  const addBlock = (type: ContentBlock['type']) => {
    if (!doc) return;
    let block: ContentBlock;
    if (type === 'text') block = emptyTextBlock();
    else if (type === 'table') block = emptyTableBlock();
    else if (type === 'divider') block = { id: uid(), type: 'divider' };
    else return;

    updateDoc((d) => {
      const append = (blocks: ContentBlock[]) => [...blocks, block];
      if (d.mode === 'document' && d.sections) {
        return { ...d, sections: d.sections.map((s) => (s.id === activeSectionId ? { ...s, blocks: append(s.blocks) } : s)) };
      }
      if (d.mode === 'presentation' && d.slides) {
        return { ...d, slides: d.slides.map((s) => (s.id === activeSlideId ? { ...s, blocks: append(s.blocks) } : s)) };
      }
      if (d.chapters) {
        return { ...d, chapters: d.chapters.map((c) => (c.id === activeChapterId ? { ...c, blocks: append(c.blocks) } : c)) };
      }
      return d;
    });
    if (type === 'text') setActiveBlockId(block.id);
  };

  const insertImageBlock = (src: string) => {
    if (!doc) return;
    const block: ContentBlock = { id: uid(), type: 'image', src, alt: 'image' };
    updateDoc((d) => {
      const append = (blocks: ContentBlock[]) => [...blocks, block];
      if (d.mode === 'document' && d.sections) {
        return { ...d, sections: d.sections.map((s) => (s.id === activeSectionId ? { ...s, blocks: append(s.blocks) } : s)) };
      }
      if (d.mode === 'presentation' && d.slides) {
        return { ...d, slides: d.slides.map((s) => (s.id === activeSlideId ? { ...s, blocks: append(s.blocks) } : s)) };
      }
      if (d.chapters) {
        return { ...d, chapters: d.chapters.map((c) => (c.id === activeChapterId ? { ...c, blocks: append(c.blocks) } : c)) };
      }
      return d;
    });
  };

  const insertAttachment = async (file: File) => {
    if (!doc) return;
    const data = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    const block: ContentBlock = {
      id: uid(),
      type: 'attachment',
      name: file.name,
      mimeType: file.type,
      size: file.size,
      data,
    };
    updateDoc((d) => {
      const append = (blocks: ContentBlock[]) => [...blocks, block];
      if (d.mode === 'document' && d.sections) {
        return { ...d, sections: d.sections.map((s) => (s.id === activeSectionId ? { ...s, blocks: append(s.blocks) } : s)) };
      }
      if (d.mode === 'presentation' && d.slides) {
        return { ...d, slides: d.slides.map((s) => (s.id === activeSlideId ? { ...s, blocks: append(s.blocks) } : s)) };
      }
      if (d.chapters) {
        return { ...d, chapters: d.chapters.map((c) => (c.id === activeChapterId ? { ...c, blocks: append(c.blocks) } : c)) };
      }
      return d;
    });
  };

  const removeBlock = (blockId: string) => {
    updateDoc((d) => {
      const filter = (blocks: ContentBlock[]) => blocks.filter((b) => b.id !== blockId);
      if (d.mode === 'document' && d.sections) {
        return { ...d, sections: d.sections.map((s) => (s.id === activeSectionId ? { ...s, blocks: filter(s.blocks) } : s)) };
      }
      if (d.mode === 'presentation' && d.slides) {
        return { ...d, slides: d.slides.map((s) => (s.id === activeSlideId ? { ...s, blocks: filter(s.blocks) } : s)) };
      }
      if (d.chapters) {
        return { ...d, chapters: d.chapters.map((c) => (c.id === activeChapterId ? { ...c, blocks: filter(c.blocks) } : c)) };
      }
      return d;
    });
  };

  const moveBlock = (blockId: string, dir: -1 | 1) => {
    updateDoc((d) => {
      const reorder = (blocks: ContentBlock[]) => {
        const idx = blocks.findIndex((b) => b.id === blockId);
        if (idx < 0) return blocks;
        const next = [...blocks];
        const swap = idx + dir;
        if (swap < 0 || swap >= next.length) return blocks;
        [next[idx], next[swap]] = [next[swap], next[idx]];
        return next;
      };
      if (d.mode === 'document' && d.sections) {
        return { ...d, sections: d.sections.map((s) => (s.id === activeSectionId ? { ...s, blocks: reorder(s.blocks) } : s)) };
      }
      if (d.mode === 'presentation' && d.slides) {
        return { ...d, slides: d.slides.map((s) => (s.id === activeSlideId ? { ...s, blocks: reorder(s.blocks) } : s)) };
      }
      if (d.chapters) {
        return { ...d, chapters: d.chapters.map((c) => (c.id === activeChapterId ? { ...c, blocks: reorder(c.blocks) } : c)) };
      }
      return d;
    });
  };

  /** Переміщення блоку drag-and-drop: вставити before targetId */
  const moveBlockBefore = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    updateDoc((d) => {
      const reorder = (blocks: ContentBlock[]) => {
        const fromIdx = blocks.findIndex((b) => b.id === fromId);
        const toIdx = blocks.findIndex((b) => b.id === toId);
        if (fromIdx < 0 || toIdx < 0) return blocks;
        const next = [...blocks];
        const [item] = next.splice(fromIdx, 1);
        const insertAt = next.findIndex((b) => b.id === toId);
        next.splice(insertAt < 0 ? next.length : insertAt, 0, item);
        return next;
      };
      if (d.mode === 'document' && d.sections) {
        return { ...d, sections: d.sections.map((s) => (s.id === activeSectionId ? { ...s, blocks: reorder(s.blocks) } : s)) };
      }
      if (d.mode === 'presentation' && d.slides) {
        return { ...d, slides: d.slides.map((s) => (s.id === activeSlideId ? { ...s, blocks: reorder(s.blocks) } : s)) };
      }
      if (d.chapters) {
        return { ...d, chapters: d.chapters.map((c) => (c.id === activeChapterId ? { ...c, blocks: reorder(c.blocks) } : c)) };
      }
      return d;
    });
  };

  if (!doc) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Універсальний редактор документів</h3>
          {onClose && (
            <button type="button" onClick={onClose} className="p-2 text-white/50 hover:text-white">
              <X size={20} />
            </button>
          )}
        </div>
        <p className="text-white/50 text-sm">Документ · Презентація · Книга — все в одному файлі</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            [
              ['document', FileText, 'Документ', 'Секції та блоки'],
              ['presentation', Layout, 'Презентація', 'Слайди'],
              ['book', BookOpen, 'Книга', 'Розділи та зміст'],
            ] as const
          ).map(([mode, Icon, title, desc]) => (
            <button
              key={mode}
              type="button"
              onClick={() => startNew(mode)}
              className="text-left p-4 rounded-2xl bg-white/8 border border-white/10 hover:border-orange-500/40 hover:bg-orange-500/10 transition-all"
            >
              <Icon className="text-orange-400 mb-2" size={24} />
              <p className="text-white font-medium">{title}</p>
              <p className="text-white/45 text-xs mt-1">{desc}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              setLibrary(await listStoredDocuments());
              setShowLibrary(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15"
          >
            <FolderOpen size={16} /> Відкрити з додатку
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15"
          >
            <FileJson size={16} /> Завантажити .scbdoc.json
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.scbdoc.json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) openDoc(await readDocumentFile(f));
              e.target.value = '';
            }}
          />
        </div>

        {showLibrary && (
          <div className="bg-white/8 border border-white/10 rounded-2xl p-4 space-y-2 max-h-64 overflow-y-auto">
            {library.length === 0 ? (
              <p className="text-white/40 text-sm">Немає збережених документів</p>
            ) : (
              library.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const loaded = await loadDocumentFromApp(item.id);
                      if (loaded) openDoc(loaded);
                    }}
                    className="flex-1 text-left p-3 rounded-xl hover:bg-white/10"
                  >
                    <p className="text-white text-sm font-medium">{item.name}</p>
                    <p className="text-white/40 text-xs truncate">{item.preview}</p>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteStoredDocument(item.id);
                      setLibrary(await listStoredDocuments());
                    }}
                    className="p-2 text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  const blocks = activeBlocks();

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[500px]">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-white/10">
        <input
          type="text"
          value={doc.name}
          onChange={(e) => updateDoc((d) => ({ ...d, name: e.target.value }))}
          className="bg-transparent text-white font-semibold text-lg border-none focus:outline-none min-w-[120px]"
        />
        <div className="flex flex-wrap gap-1 ml-auto">
          <button type="button" onClick={() => void saveDocumentToApp(doc)} className="toolbar-btn" title="IndexedDB у браузері">
            <Save size={14} /> В додатку
          </button>
          <button type="button" onClick={() => exportDocumentJson(doc)} className="toolbar-btn" title="Файл .scbdoc.json">
            <Download size={14} /> На пристрій
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                await exportDocumentPdf(doc);
              } finally {
                setExporting(false);
              }
            }}
            className="toolbar-btn"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF
          </button>
          <button type="button" onClick={() => exportDocumentHtml(doc)} className="toolbar-btn">
            HTML
          </button>
          {doc.mode === 'book' && (
            <button
              type="button"
              onClick={() => {
                const blob = exportBookToEpub(doc);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${doc.name.replace(/[^\w\u0400-\u04FF.-]+/g, '_')}.epub`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="toolbar-btn"
            >
              EPUB
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const url = createShareLink(doc);
              setShareUrl(url);
              void navigator.clipboard?.writeText(url);
            }}
            className="toolbar-btn"
          >
            <Send size={14} /> Надіслати
          </button>
          {doc.mode === 'presentation' && (
            <button type="button" onClick={() => setPresenting(true)} className="toolbar-btn text-orange-400">
              <MonitorPlay size={14} /> Презентація
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} className="toolbar-btn">
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      {shareUrl && <p className="text-xs text-green-400 mb-2 truncate">Посилання скопійовано: {shareUrl}</p>}

      <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
        {/* Left panel */}
        <aside className="w-48 lg:w-56 shrink-0 overflow-y-auto bg-white/5 border border-white/10 rounded-xl p-2 hidden sm:block">
          <p className="text-white/40 text-xs uppercase tracking-wider px-2 mb-2">
            {doc.mode === 'document' ? 'Структура' : doc.mode === 'presentation' ? 'Слайди' : 'Зміст'}
          </p>

          {doc.mode === 'document' &&
            doc.sections?.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setActiveSectionId(s.id);
                  setActiveBlockId(s.blocks[0]?.id || null);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 ${
                  activeSectionId === s.id ? 'bg-orange-500/20 text-orange-300' : 'text-white/70 hover:bg-white/10'
                }`}
              >
                {s.title}
              </button>
            ))}

          {doc.mode === 'presentation' &&
            doc.slides?.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setActiveSlideId(s.id);
                  setActiveBlockId(s.blocks[0]?.id || null);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 ${
                  activeSlideId === s.id ? 'bg-orange-500/20 text-orange-300' : 'text-white/70 hover:bg-white/10'
                }`}
              >
                {i + 1}. {s.title}
              </button>
            ))}

          {doc.mode === 'book' &&
            doc.chapters?.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  setActiveChapterId(ch.id);
                  setActiveBlockId(ch.blocks[0]?.id || null);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 ${
                  activeChapterId === ch.id ? 'bg-orange-500/20 text-orange-300' : 'text-white/70 hover:bg-white/10'
                }`}
              >
                {ch.title}
              </button>
            ))}

          <button
            type="button"
            onClick={() => {
              const id = uid();
              updateDoc((d) => {
                if (d.mode === 'document') {
                  const sec = { id, title: `Розділ ${(d.sections?.length || 0) + 1}`, blocks: [emptyTextBlock()] };
                  return { ...d, sections: [...(d.sections || []), sec] };
                }
                if (d.mode === 'presentation') {
                  const slide = { id, title: `Слайд ${(d.slides?.length || 0) + 1}`, blocks: [emptyTextBlock()] };
                  return { ...d, slides: [...(d.slides || []), slide] };
                }
                const ch = { id, title: `Розділ ${(d.chapters?.length || 0) + 1}`, blocks: [emptyTextBlock()], children: [] };
                return { ...d, chapters: [...(d.chapters || []), ch] };
              });
              if (doc.mode === 'document') setActiveSectionId(id);
              else if (doc.mode === 'presentation') setActiveSlideId(id);
              else setActiveChapterId(id);
            }}
            className="w-full flex items-center gap-1 px-3 py-2 mt-2 text-orange-400 text-sm hover:bg-white/5 rounded-lg"
          >
            <Plus size={14} /> Додати
          </button>
        </aside>

        {/* Editor */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {activeTextBlock && editor && (
            <EditorToolbar
              editor={editor}
              onInsertImage={insertImageBlock}
              onInsertTable={() => addBlock('table')}
              onInsertDivider={() => addBlock('divider')}
              onInsertAttachment={insertAttachment}
            />
          )}

          <div className="space-y-3">
            {blocks.map((block, idx) => (
              <div
                key={block.id}
                draggable
                onDragStart={(e) => {
                  setDragBlockId(block.id);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', block.id);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverBlockId !== block.id) setDragOverBlockId(block.id);
                }}
                onDragLeave={() => {
                  if (dragOverBlockId === block.id) setDragOverBlockId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const fromId = e.dataTransfer.getData('text/plain') || dragBlockId;
                  if (fromId) moveBlockBefore(fromId, block.id);
                  setDragBlockId(null);
                  setDragOverBlockId(null);
                }}
                onDragEnd={() => {
                  setDragBlockId(null);
                  setDragOverBlockId(null);
                }}
                className={`rounded-xl border transition-all ${
                  activeBlockId === block.id ? 'border-orange-500/50 bg-white/8' : 'border-white/10 bg-white/5'
                } ${dragBlockId === block.id ? 'opacity-50' : ''} ${
                  dragOverBlockId === block.id && dragBlockId !== block.id
                    ? 'border-t-4 border-t-orange-400'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span
                      className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white/70 p-0.5"
                      title="Перетягніть блок"
                    >
                      <GripVertical size={16} />
                    </span>
                    <span className="text-white/40 text-xs uppercase">{block.type}</span>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => moveBlock(block.id, -1)} disabled={idx === 0} className="p-1 text-white/40 hover:text-white disabled:opacity-30">
                      <ChevronUp size={14} />
                    </button>
                    <button type="button" onClick={() => moveBlock(block.id, 1)} disabled={idx === blocks.length - 1} className="p-1 text-white/40 hover:text-white disabled:opacity-30">
                      <ChevronDown size={14} />
                    </button>
                    <button type="button" onClick={() => removeBlock(block.id)} className="p-1 text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {block.type === 'text' && (
                  <div onClick={() => setActiveBlockId(block.id)}>
                    {activeBlockId === block.id && editor ? (
                      <EditorContent editor={editor} />
                    ) : (
                      <div className="px-4 py-3 text-white/70 text-sm prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: block.html }} />
                    )}
                  </div>
                )}

                {block.type === 'image' && (
                  <img src={block.src} alt={block.alt} className="max-w-full rounded-lg p-2" />
                )}

                {block.type === 'table' && (
                  <div className="overflow-x-auto p-2">
                    <table className="w-full text-sm text-white/80 border border-white/10">
                      <tbody>
                        {block.rows.map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) => (
                              <td key={ci} className="border border-white/10 p-1">
                                <input
                                  value={cell}
                                  onChange={(e) => {
                                    updateDoc((d) => {
                                      const patchTable = (blocks: ContentBlock[]) =>
                                        blocks.map((b) => {
                                          if (b.id !== block.id || b.type !== 'table') return b;
                                          const rows = b.rows.map((r) => [...r]);
                                          rows[ri][ci] = e.target.value;
                                          return { ...b, rows };
                                        });
                                      if (d.mode === 'document' && d.sections) {
                                        return { ...d, sections: d.sections.map((s) => (s.id === activeSectionId ? { ...s, blocks: patchTable(s.blocks) } : s)) };
                                      }
                                      if (d.mode === 'presentation' && d.slides) {
                                        return { ...d, slides: d.slides.map((s) => (s.id === activeSlideId ? { ...s, blocks: patchTable(s.blocks) } : s)) };
                                      }
                                      if (d.chapters) {
                                        return { ...d, chapters: d.chapters.map((c) => (c.id === activeChapterId ? { ...c, blocks: patchTable(c.blocks) } : c)) };
                                      }
                                      return d;
                                    });
                                  }}
                                  className="w-full bg-transparent border-none focus:outline-none"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {block.type === 'attachment' && (
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">{block.name}</p>
                      <p className="text-white/40 text-xs">{block.mimeType} · {Math.round(block.size / 1024)} KB</p>
                    </div>
                    <a href={block.data} download={block.name} className="text-orange-400 text-sm">
                      Завантажити
                    </a>
                  </div>
                )}

                {block.type === 'divider' && <hr className="border-white/20 my-4 mx-4" />}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <button type="button" onClick={() => addBlock('text')} className="toolbar-btn">
              <Plus size={14} /> Текст
            </button>
            <button type="button" onClick={() => addBlock('table')} className="toolbar-btn">
              <Plus size={14} /> Таблиця
            </button>
            <button type="button" onClick={() => addBlock('divider')} className="toolbar-btn">
              <Plus size={14} /> Лінія
            </button>
          </div>
        </main>
      </div>

      {presenting && doc.slides && (
        <PresentationPlayer slides={doc.slides} onClose={() => setPresenting(false)} />
      )}

      <style>{`.toolbar-btn{display:flex;align-items:center;gap:4px;padding:6px 12px;border-radius:10px;font-size:12px;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.8);transition:all 0.15s}.toolbar-btn:hover{background:rgba(255,255,255,0.15);color:#fff}`}</style>
    </div>
  );
};
