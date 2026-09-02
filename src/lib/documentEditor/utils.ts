import type { ContentBlock, EditorMode, UniversalDocument } from './types';

export function uid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyTextBlock(): ContentBlock {
  return { id: uid(), type: 'text', html: '<p></p>' };
}

export function emptyTableBlock(rows = 3, cols = 3): ContentBlock {
  return {
    id: uid(),
    type: 'table',
    rows: Array.from({ length: rows }, () => Array.from({ length: cols }, () => '')),
  };
}

export function createDocument(name: string, mode: EditorMode): UniversalDocument {
  const now = new Date().toISOString();
  const base = { version: 1 as const, id: uid(), name, mode, createdAt: now, updatedAt: now };

  if (mode === 'document') {
    return {
      ...base,
      sections: [{ id: uid(), title: 'Розділ 1', blocks: [emptyTextBlock()] }],
    };
  }
  if (mode === 'presentation') {
    return {
      ...base,
      slides: [
        { id: uid(), title: 'Слайд 1', blocks: [emptyTextBlock()] },
        { id: uid(), title: 'Слайд 2', blocks: [emptyTextBlock()] },
      ],
    };
  }
  return {
    ...base,
    cover: { title: name, author: '' },
    chapters: [{ id: uid(), title: 'Розділ 1', blocks: [emptyTextBlock()], children: [] }],
  };
}

export function getPreviewText(doc: UniversalDocument): string {
  if (doc.mode === 'document' && doc.sections?.[0]) {
    const text = doc.sections[0].blocks.find((b) => b.type === 'text');
    if (text && text.type === 'text') return stripHtml(text.html).slice(0, 80);
    return doc.sections[0].title;
  }
  if (doc.mode === 'presentation' && doc.slides?.[0]) {
    return doc.slides[0].title;
  }
  if (doc.mode === 'book') {
    return doc.cover?.title || doc.chapters?.[0]?.title || doc.name;
  }
  return doc.name;
}

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

export function blocksToPlainText(blocks: ContentBlock[]): string {
  return blocks
    .map((b) => {
      if (b.type === 'text') return stripHtml(b.html);
      if (b.type === 'image') return `[Зображення: ${b.alt || 'image'}]`;
      if (b.type === 'table') return b.rows.map((r) => r.join('\t')).join('\n');
      if (b.type === 'attachment') return `[Файл: ${b.name}]`;
      return '---';
    })
    .join('\n\n');
}