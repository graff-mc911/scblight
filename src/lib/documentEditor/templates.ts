import type { UniversalDocument } from './types';
import { createDocument, emptyTextBlock, uid } from './utils';

function textBlock(html: string) {
  return { ...emptyTextBlock(), html };
}

function plainToHtml(text: string): string {
  return text
    .split('\n')
    .map((line) => (line.trim() ? `<p>${line}</p>` : '<p><br></p>'))
    .join('');
}

export type QuickTemplateId = 'blank' | 'act' | 'letter' | 'presentation' | 'receipt';

export function createQuickTemplate(id: QuickTemplateId): UniversalDocument {
  if (id === 'blank') {
    return createDocument('Новий документ', 'document');
  }

  if (id === 'act') {
    const doc = createDocument('Акт прийому-передачі робіт', 'document');
    if (doc.sections?.[0]) {
      doc.sections[0].title = 'Акт';
      doc.sections[0].blocks = [
        textBlock(
          plainToHtml(
            "Об'єкт: Ремонтно-будівельні роботи\n\nАКТ ПРИЙОМУ-ПЕРЕДАЧІ РОБІТ\n\nМи, що нижче підписалися, підтверджуємо виконання робіт у повному обсязі.\n\n1. Електромонтажні роботи\n2. Сантехнічні роботи\n3. Оздоблювальні роботи\n\nВиконавець: __________ / Замовник: __________",
          ),
        ),
      ];
    }
    return doc;
  }

  if (id === 'letter') {
    const doc = createDocument('Офіційний лист', 'document');
    if (doc.sections?.[0]) {
      doc.sections[0].blocks = [
        textBlock(
          plainToHtml(
            'ОФІЦІЙНЕ ЗВЕРНЕННЯ\n\nЩодо виконання будівельного проєкту\n\nПовідомляємо про успішне завершення запланованого етапу робіт.\n\nЗ повагою,\nКоманда проекту',
          ),
        ),
      ];
    }
    return doc;
  }

  if (id === 'presentation') {
    const doc = createDocument('Презентація проєкту', 'presentation');
    doc.slides = [
      {
        id: uid(),
        title: 'Будівельний проєкт',
        blocks: [textBlock('<p>Комплексний ремонт та оздоблення приміщень</p>')],
      },
      {
        id: uid(),
        title: 'Етапи реалізації',
        blocks: [
          textBlock(
            '<ul><li>Проектування та закупівля матеріалів</li><li>Монтажні роботи</li><li>Здача під ключ</li></ul>',
          ),
        ],
      },
      {
        id: uid(),
        title: 'Контакти',
        blocks: [textBlock('<p>Гарантія на всі виконані роботи. Тел: +380...</p>')],
      },
    ];
    return doc;
  }

  const doc = createDocument('Чек / квитанція', 'document');
  if (doc.sections?.[0]) {
    doc.sections[0].title = 'Чек';
    doc.sections[0].blocks = [
      textBlock(
        plainToHtml(
          'Магазин: _____________\nДата: _____________\nСума: _____________\nКатегорія: Матеріали',
        ),
      ),
    ];
  }
  return doc;
}

export function createDocumentFromText(name: string, text: string): UniversalDocument {
  const doc = createDocument(name, 'document');
  if (doc.sections?.[0]) {
    doc.sections[0].blocks = [textBlock(plainToHtml(text))];
  }
  return doc;
}