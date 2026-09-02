import type { ContentBlock, UniversalDocument } from './types';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBlocks(blocks: ContentBlock[]): string {
  return blocks
    .map((b) => {
      if (b.type === 'text') return `<div class="text-block">${b.html}</div>`;
      if (b.type === 'image')
        return `<figure class="image-block"><img src="${b.src}" alt="${escapeHtml(b.alt || '')}" style="max-width:100%"/></figure>`;
      if (b.type === 'table') {
        const rows = b.rows
          .map(
            (r) =>
              `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`,
          )
          .join('');
        return `<table class="table-block" border="1" cellpadding="8">${rows}</table>`;
      }
      if (b.type === 'attachment')
        return `<div class="attachment">📎 ${escapeHtml(b.name)} (${Math.round(b.size / 1024)} KB)</div>`;
      if (b.type === 'divider') return '<hr class="divider"/>';
      return '';
    })
    .join('\n');
}

export function exportDocumentHtml(doc: UniversalDocument): void {
  let body = '';

  if (doc.mode === 'document' && doc.sections) {
    body = doc.sections
      .map(
        (s) =>
          `<section id="${s.id}"><h2>${escapeHtml(s.title)}</h2>${renderBlocks(s.blocks)}</section>`,
      )
      .join('\n');
  } else if (doc.mode === 'presentation' && doc.slides) {
    body = doc.slides
      .map(
        (s) =>
          `<section class="slide" style="background:${s.backgroundColor || '#1e293b'}"><h2>${escapeHtml(s.title)}</h2>${renderBlocks(s.blocks)}</section>`,
      )
      .join('\n');
  } else if (doc.mode === 'book') {
    const cover = doc.cover
      ? `<header class="cover"><h1>${escapeHtml(doc.cover.title)}</h1><p>${escapeHtml(doc.cover.author)}</p>${doc.cover.image ? `<img src="${doc.cover.image}" alt="cover"/>` : ''}</header>`
      : '';
    const chapters = (doc.chapters || [])
      .map((ch) => `<section class="chapter"><h2>${escapeHtml(ch.title)}</h2>${renderBlocks(ch.blocks)}</section>`)
      .join('\n');
    body = cover + chapters;
  }

  const html = `<!DOCTYPE html><html lang="uk"><head><meta charset="utf-8"/><title>${escapeHtml(doc.name)}</title>
<style>
body{font-family:Inter,system-ui,sans-serif;max-width:900px;margin:0 auto;padding:2rem;line-height:1.6;color:#1e293b}
.slide{min-height:60vh;padding:2rem;margin-bottom:2rem;border-radius:12px;color:#fff}
.table-block{width:100%;border-collapse:collapse;margin:1rem 0}
.divider{margin:2rem 0;border:none;border-top:1px solid #cbd5e1}
.attachment{padding:1rem;background:#f1f5f9;border-radius:8px;margin:1rem 0}
.cover{text-align:center;padding:4rem 0;border-bottom:2px solid #e2e8f0;margin-bottom:3rem}
</style></head><body><h1>${escapeHtml(doc.name)}</h1>${body}</body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.name.replace(/[^\w\u0400-\u04FF.-]+/g, '_')}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function createShareLink(doc: UniversalDocument): string {
  const blob = new Blob([JSON.stringify(doc)], { type: 'application/json' });
  return URL.createObjectURL(blob);
}