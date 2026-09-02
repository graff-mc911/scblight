/**
 * EPUB export — базова структура для майбутньої повної реалізації.
 */
import type { ContentBlock, UniversalDocument } from './types';

function blocksToHtml(blocks: ContentBlock[]): string {
  return blocks
    .map((b) => {
      if (b.type === 'text') return `<div>${b.html}</div>`;
      if (b.type === 'image') return `<img src="${b.src}" alt="${b.alt || ''}"/>`;
      if (b.type === 'table') {
        const rows = b.rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
        return `<table>${rows}</table>`;
      }
      if (b.type === 'attachment') return `<p>📎 ${b.name}</p>`;
      if (b.type === 'divider') return '<hr/>';
      return '';
    })
    .join('\n');
}

export function exportBookToEpub(doc: UniversalDocument): Blob {
  const title = doc.cover?.title || doc.name || 'Книга';
  const author = doc.cover?.author || 'Автор';
  const chapters = doc.chapters || [];

  let body = '';
  if (doc.cover?.image) {
    body += `<div class="cover"><img src="${doc.cover.image}" alt="Обкладинка"/><h1>${title}</h1><p>${author}</p></div>`;
  }

  const walk = (items: typeof chapters, depth: number) => {
    for (const ch of items) {
      body += `<section id="${ch.id}"><h${Math.min(depth + 1, 3)}>${ch.title}</h${Math.min(depth + 1, 3)}>`;
      body += blocksToHtml(ch.blocks);
      if (ch.children?.length) walk(ch.children, depth + 1);
      body += '</section>';
    }
  };
  walk(chapters, 1);

  const html = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${title}</title><meta charset="utf-8"/></head>
<body>${body}</body>
</html>`;

  return new Blob([html], { type: 'application/epub+zip' });
}