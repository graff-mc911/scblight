/** A4 @ 72dpi CSS-px equivalents used for on-screen canvas pages */
export const PAGE_W = 595;
export const PAGE_H = 842;

export type PageFormat = 'a4-portrait' | 'a4-landscape' | 'letter';

export function pageSize(format: PageFormat): { w: number; h: number } {
  if (format === 'a4-landscape') return { w: PAGE_H, h: PAGE_W };
  if (format === 'letter') return { w: 612, h: 792 };
  return { w: PAGE_W, h: PAGE_H };
}

export function makeBlankPageDataUrl(
  format: PageFormat = 'a4-portrait',
  background = '#ffffff',
): string {
  const { w, h } = pageSize(format);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);
  // subtle margin guide
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.strokeRect(36, 36, w - 72, h - 72);
  return canvas.toDataURL('image/png');
}

export type TemplateId = 'invoice' | 'contract' | 'act' | 'letter';

export function makeTemplatePageDataUrl(template: TemplateId): string {
  const { w, h } = pageSize('a4-portrait');
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 28px sans-serif';

  const titles: Record<TemplateId, string> = {
    invoice: 'РАХУНОК-ФАКТУРА / INVOICE',
    contract: 'ДОГОВІР / CONTRACT',
    act: 'АКТ ВИКОНАНИХ РОБІТ',
    letter: 'ОФІЦІЙНИЙ ЛИСТ',
  };
  ctx.fillText(titles[template], 48, 72);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText(new Date().toLocaleDateString('uk-UA'), 48, 100);

  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(48, 120);
  ctx.lineTo(w - 48, 120);
  ctx.stroke();

  if (template === 'invoice') {
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('Опис', 48, 160);
    ctx.fillText('К-сть', 280, 160);
    ctx.fillText('Ціна', 360, 160);
    ctx.fillText('Сума', 460, 160);
    ctx.strokeStyle = '#e2e8f0';
    for (let i = 0; i < 6; i += 1) {
      const y = 180 + i * 36;
      ctx.strokeRect(48, y, w - 96, 32);
    }
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(320, 420, w - 368, 90);
    ctx.fillStyle = '#0f172a';
    ctx.font = '13px sans-serif';
    ctx.fillText('Підсумок: ___________', 340, 450);
    ctx.fillText('ПДВ: ___________', 340, 475);
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('Разом: ___________', 340, 500);
  } else if (template === 'contract') {
    ctx.fillStyle = '#334155';
    ctx.font = '13px sans-serif';
    const lines = [
      '1. Сторони договору',
      'Замовник: ________________________________',
      'Виконавець: ______________________________',
      '',
      '2. Предмет договору',
      '____________________________________________',
      '____________________________________________',
      '',
      '3. Термін виконання',
      'З _____________ по _____________',
      '',
      '4. Підписи сторін',
      'Замовник _____________    Виконавець _____________',
    ];
    lines.forEach((line, i) => ctx.fillText(line, 48, 160 + i * 28));
  } else if (template === 'act') {
    ctx.fillStyle = '#334155';
    ctx.font = '13px sans-serif';
    [
      'Ми, що нижче підписалися, склали цей акт про те, що',
      'роботи виконані в повному обсязі та прийняті.',
      '',
      'Перелік робіт:',
      '1. ________________________________________',
      '2. ________________________________________',
      '3. ________________________________________',
      '',
      'Замовник _____________ / _____________',
      'Виконавець _____________ / _____________',
    ].forEach((line, i) => ctx.fillText(line, 48, 160 + i * 28));
  } else {
    ctx.fillStyle = '#334155';
    ctx.font = '13px sans-serif';
    [
      'Шановний(а) ______________________________,',
      '',
      '____________________________________________',
      '____________________________________________',
      '____________________________________________',
      '',
      'З повагою,',
      '______________________________',
    ].forEach((line, i) => ctx.fillText(line, 48, 160 + i * 28));
  }

  return canvas.toDataURL('image/png');
}
