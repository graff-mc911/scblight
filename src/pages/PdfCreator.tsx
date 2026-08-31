import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { 
  FileText, 
  Image as ImageIcon, 
  Layout, 
  Download, 
  Eye, 
  Printer, 
  Plus, 
  Trash2,
  FileCheck
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

type DocumentMode = 'document' | 'images' | 'presentation';

export default function PdfCreator() {
  const [mode, setMode] = useState<DocumentMode>('document');
  
  // Текстовий документ
  const [docTitle, setDocTitle] = useState('Офіційний документ');
  const [docSubtitle, setDocSubtitle] = useState('');
  const [docContent, setDocContent] = useState('Введіть текст вашого документа тут...');
  const [docFooter, setDocFooter] = useState('Створено автоматично');
  
  // Зображення
  const [images, setImages] = useState<string[]>([]);
  
  // Презентація
  const [slides, setSlides] = useState([
    { title: 'Титульний слайд', text: 'Опис проєкту та основна інформація' },
    { title: 'План робіт', text: '1. Підготовчий етап\n2. Основні роботи\n3. Здача об’єкта' }
  ]);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Обробка завантаження зображень
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Вибір готового шаблону
  const applyTemplate = (templateType: string) => {
    if (templateType === 'letter') {
      setMode('document');
      setDocTitle('ОФІЦІЙНЕ ЗВЕРНЕННЯ / ЛИСТ');
      setDocSubtitle('Кому: Замовнику / Партнеру');
      setDocContent('Шановний пане / пані,\n\nПовідомляємо вам про успішне виконання запланованого етапу робіт відповідно до договору.\n\nПросимо ознайомитися з матеріалами та підтвердити прийняття.\n\nЗ повагою,\nВиконавець робіт');
      setDocFooter('Контактний тел: +380 / Email: info@example.com');
    } else if (templateType === 'act') {
      setMode('document');
      setDocTitle('АКТ ПРИЙОМУ-ПЕРЕДАЧІ РОБІТ');
      setDocSubtitle('Об’єкт: Ремонт та внутрішні роботи');
      setDocContent('Ми, що нижче підписалися, склали цей акт про те, що всі монтажні та будівельні роботи виконані в повному обсязі, якісно та в узгоджені строки.\n\nПерелік робіт:\n- Електромонтажні роботи: 100%\n- Опоряджувальні роботи: 100%\n\nПретензій до якості та строків виконання робіт Замовник не має.');
      setDocFooter('Підписи сторін: ____________ (Виконавець)  /  ____________ (Замовник)');
    } else if (templateType === 'presentation') {
      setMode('presentation');
      setSlides([
        { title: 'Презентація Проєкту', text: 'Комплексні рішення для ремонту та будівництва' },
        { title: 'Переваги нашої команди', text: '• Професійний досвід\n• Сучасне обладнання\n• Гарантія якості та дотримання строків' },
        { title: 'Контакти та консультація', text: 'Зв’яжіться з нами для розрахунку вартості вашого проєкту.' }
      ]);
    }
  };

  // Генерація PDF
  const generatePdfInstance = (): jsPDF => {
    if (mode === 'presentation') {
      // Альбомна орієнтація
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      slides.forEach((slide, idx) => {
        if (idx > 0) doc.addPage();
        
        // Фон слайду
        doc.setFillColor(245, 247, 250);
        doc.rect(0, 0, 297, 210, 'F');

        // Верхній декоративний акцент
        doc.setFillColor(255, 215, 0); // Yellow/Gold
        doc.rect(0, 0, 297, 8, 'F');

        // Заголовок
        doc.setFontSize(24);
        doc.setTextColor(33, 37, 41);
        doc.text(slide.title, 20, 35);

        // Лінія
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 42, 277, 42);

        // Вміст слайду
        doc.setFontSize(14);
        doc.setTextColor(70, 70, 70);
        const splitText = doc.splitTextToSize(slide.text, 257);
        doc.text(splitText, 20, 58);

        // Номер сторінки
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(`Слайд ${idx + 1} з ${slides.length}`, 277, 195, { align: 'right' });
      });
      return doc;
    } else if (mode === 'images') {
      // Документ із зображеннями
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      if (images.length === 0) {
        doc.text('Зображення відсутні. Завантажте файли.', 20, 20);
      } else {
        images.forEach((img, idx) => {
          if (idx > 0) doc.addPage();
          doc.addImage(img, 'JPEG', 15, 15, 180, 240, undefined, 'FAST');
        });
      }
      return doc;
    } else {
      // Звичайний текстовий документ
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Заголовок
      doc.setFontSize(20);
      doc.setTextColor(20, 20, 20);
      doc.text(docTitle, 20, 25);

      // Підзаголовок (якщо є)
      if (docSubtitle) {
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(docSubtitle, 20, 33);
        doc.setDrawColor(220, 220, 220);
        doc.line(20, 38, 190, 38);
      }

      // Тіло документа
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      const startY = docSubtitle ? 48 : 38;
      const splitContent = doc.splitTextToSize(docContent, 170);
      doc.text(splitContent, 20, startY);

      // Підвал (Footer)
      if (docFooter) {
        doc.setFontSize(9);
        doc.setTextColor(130, 130, 130);
        doc.text(docFooter, 20, 280);
      }

      return doc;
    }
  };

  const handleDownload = () => {
    const doc = generatePdfInstance();
    doc.save(`${docTitle || 'document'}.pdf`);
  };

  const handlePreview = () => {
    const doc = generatePdfInstance();
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    setPreviewUrl(url);
  };

  const handlePrint = () => {
    const doc = generatePdfInstance();
    doc.autoPrint();
    const pdfBlob = doc.output('bloburl');
    window.open(pdfBlob, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Конструктор та Конвертер PDF</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Створюйте офіційні документи, презентації або конвертуйте зображення в один PDF-файл.
          </p>
        </div>

        {/* Швидкі готові шаблони */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => applyTemplate('letter')}>
            <FileText className="w-4 h-4 mr-1.5 text-blue-500" /> Шаблон: Лист
          </Button>
          <Button variant="outline" size="sm" onClick={() => applyTemplate('act')}>
            <FileCheck className="w-4 h-4 mr-1.5 text-green-500" /> Шаблон: Акт робіт
          </Button>
          <Button variant="outline" size="sm" onClick={() => applyTemplate('presentation')}>
            <Layout className="w-4 h-4 mr-1.5 text-amber-500" /> Шаблон: Презентація
          </Button>
        </div>
      </div>

      {/* Перемикач режимів */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setMode('document')}
          className={`flex items-center px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
            mode === 'document'
              ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <FileText className="w-4 h-4 mr-2" /> Документ / Текст
        </button>
        <button
          onClick={() => setMode('images')}
          className={`flex items-center px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
            mode === 'images'
              ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <ImageIcon className="w-4 h-4 mr-2" /> Зображення в PDF
        </button>
        <button
          onClick={() => setMode('presentation')}
          className={`flex items-center px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
            mode === 'presentation'
              ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <Layout className="w-4 h-4 mr-2" /> Презентація (Слайди)
        </button>
      </div>

      {/* Форма редагування */}
      <Card className="p-6 space-y-4">
        {mode === 'document' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Заголовок документа</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Наприклад: Кошторис або Договір"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Підзаголовок / Додаткова інформація</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                value={docSubtitle}
                onChange={(e) => setDocSubtitle(e.target.value)}
                placeholder="Замовник, об'єкт або дата"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Тіло документа</label>
              <textarea
                rows={8}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 font-sans"
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                placeholder="Введіть повний текст..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Підвал (Footer)</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                value={docFooter}
                onChange={(e) => setDocFooter(e.target.value)}
                placeholder="Контакти або місце для підписів"
              />
            </div>
          </div>
        )}

        {mode === 'images' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                id="image-upload"
                onChange={handleImageUpload}
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg"
              >
                <Plus className="w-4 h-4 mr-2" /> Додати фото / зображення
              </label>
              <p className="text-xs text-gray-500 mt-2">Підтримуються JPG, PNG (кожне фото буде розміщене на окремій сторінці)</p>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group border rounded-lg overflow-hidden h-36">
                    <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === 'presentation' && (
          <div className="space-y-4">
            {slides.map((slide, idx) => (
              <div key={idx} className="p-4 border rounded-lg dark:border-gray-700 space-y-2 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm text-gray-500">Слайд #{idx + 1}</span>
                  {slides.length > 1 && (
                    <button
                      onClick={() => setSlides(slides.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 text-sm flex items-center"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Видалити
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Заголовок слайду"
                  className="w-full px-3 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 font-medium"
                  value={slide.title}
                  onChange={(e) => {
                    const next = [...slides];
                    next[idx].title = e.target.value;
                    setSlides(next);
                  }}
                />
                <textarea
                  rows={3}
                  placeholder="Текст слайду (пункти або опис)"
                  className="w-full px-3 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                  value={slide.text}
                  onChange={(e) => {
                    const next = [...slides];
                    next[idx].text = e.target.value;
                    setSlides(next);
                  }}
                />
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => setSlides([...slides, { title: `Слайд ${slides.length + 1}`, text: '' }])}
            >
              <Plus className="w-4 h-4 mr-2" /> Додати слайд
            </Button>
          </div>
        )}

        {/* Кнопки дій */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button onClick={handleDownload} className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold">
            <Download className="w-4 h-4 mr-2" /> Завантажити PDF
          </Button>
          <Button variant="outline" onClick={handlePreview}>
            <Eye className="w-4 h-4 mr-2" /> Попередній перегляд
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Друк
          </Button>
        </div>
      </Card>

      {/* Попередній перегляд у вікні */}
      {previewUrl && (
        <Card className="p-4 space-y-2">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Попередній перегляд документа:</h3>
            <Button size="sm" variant="outline" onClick={() => setPreviewUrl(null)}>
              Закрити перегляд
            </Button>
          </div>
          <iframe src={previewUrl} className="w-full h-[550px] rounded border dark:border-gray-700" title="PDF Preview" />
        </Card>
      )}
    </div>
  );
}
