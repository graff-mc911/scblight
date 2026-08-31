import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  Image as ImageIcon, 
  Layout, 
  Receipt as ReceiptIcon,
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Check, 
  FileCheck
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { supabase } from '../lib/supabase';
import { generateCustomPDF } from '../lib/receiptPdfGenerator';

type DocType = 'document' | 'images' | 'presentation' | 'receipt';

export const ReceiptForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [docType, setDocType] = useState<DocType>('document');
  const [docTitle, setDocTitle] = useState('Офіційний документ');
  const [docSubtitle, setDocSubtitle] = useState('');
  const [docContent, setDocContent] = useState('Текст документа...');
  const [docFooter, setDocFooter] = useState('');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [docNumber, setDocNumber] = useState('001');
  
  // Для чека / витрат
  const [storeName, setStoreName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [category, setCategory] = useState('Матеріали');

  // Зображення
  const [images, setImages] = useState<string[]>([]);

  // Презентація (слайди)
  const [slides, setSlides] = useState([
    { title: 'Титульний слайд', text: 'Опис проєкту та основна інформація' },
    { title: 'Перелік робіт', text: '1. Демонтаж\n2. Монтаж\n3. Фінішне оздоблення' }
  ]);

  const [isGenerating, setIsGenerating] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const applyTemplate = (type: string) => {
    if (type === 'act') {
      setDocType('document');
      setDocTitle('АКТ ПРИЙОМУ-ПЕРЕДАЧІ РОБІТ');
      setDocSubtitle("Об'єкт: Ремонтно-будівельні роботи");
      setDocContent("Ми, що нижче підписалися, підтверджуємо виконання робіт у повному обсязі.\n\n1. Електромонтажні роботи: 100%\n2. Внутрішнє оздоблення: 100%\n\nПретензій до якості та термінів немає.");
      setDocFooter('Виконавець: __________ / Замовник: __________');
    } else if (type === 'letter') {
      setDocType('document');
      setDocTitle('ОФІЦІЙНЕ ЗВЕРНЕННЯ');
      setDocSubtitle('Щодо виконання будівельного проєкту');
      setDocContent('Повідомляємо про успішне завершення запланованого етапу робіт.\n\nПросимо переглянути додані звіти та надати погодження.');
      setDocFooter('З повагою, команда проекту');
    } else if (type === 'presentation') {
      setDocType('presentation');
      setSlides([
        { title: 'Будівельний Проєкт', text: 'Комплексний ремонт та оздоблення приміщень' },
        { title: 'Етапи реалізації', text: '• Проектування та закупівля матеріалів\n• Монтажні роботи\n• Здача під ключ' },
        { title: 'Контакти та гарантія', text: 'Гарантія на всі виконані роботи. Контактний телефон: +380...' }
      ]);
    }
  };

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      generateCustomPDF({
        type: docType,
        title: docTitle,
        subtitle: docSubtitle,
        content: docContent,
        footer: docFooter,
        date: docDate,
        number: docNumber,
        storeName,
        totalAmount,
        category,
        images,
        slides
      });
    } catch (err) {
      console.error(err);
      alert('Помилка при створенні PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span>Назад</span>
        </button>
        <h1 className="text-xl font-bold text-white">Створення PDF Документа</h1>
      </div>

      {/* Швидкі шаблони */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => applyTemplate('act')}>
          <FileCheck className="w-4 h-4 mr-1 text-green-400" /> Шаблон: Акт робіт
        </Button>
        <Button variant="outline" size="sm" onClick={() => applyTemplate('letter')}>
          <FileText className="w-4 h-4 mr-1 text-blue-400" /> Шаблон: Лист
        </Button>
        <Button variant="outline" size="sm" onClick={() => applyTemplate('presentation')}>
          <Layout className="w-4 h-4 mr-1 text-amber-400" /> Шаблон: Презентація
        </Button>
      </div>

      {/* Перемикач типів */}
      <Card className="p-4 bg-slate-900 border-slate-800">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          ТИП ДОКУМЕНТА
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setDocType('document')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
              docType === 'document'
                ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                : 'border-slate-800 text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4" /> Документ / Акт
          </button>
          <button
            type="button"
            onClick={() => setDocType('images')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
              docType === 'images'
                ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                : 'border-slate-800 text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <ImageIcon className="w-4 h-4" /> Фото в PDF
          </button>
          <button
            type="button"
            onClick={() => setDocType('presentation')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
              docType === 'presentation'
                ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                : 'border-slate-800 text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <Layout className="w-4 h-4" /> Презентація
          </button>
          <button
            type="button"
            onClick={() => setDocType('receipt')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
              docType === 'receipt'
                ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                : 'border-slate-800 text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <ReceiptIcon className="w-4 h-4" /> Чек / Витрата
          </button>
        </div>
      </Card>

      {/* Поля вводу */}
      <Card className="p-6 bg-slate-900 border-slate-800 space-y-4 text-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Дата</label>
            <input
              type="date"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Номер документа</label>
            <input
              type="text"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            />
          </div>
        </div>

        {/* Форма Документа / Акта */}
        {docType === 'document' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Заголовок</label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Підзаголовок / Об'єкт</label>
              <input
                type="text"
                value={docSubtitle}
                onChange={(e) => setDocSubtitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Текст документа</label>
              <textarea
                rows={6}
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Підпис / Підвал</label>
              <input
                type="text"
                value={docFooter}
                onChange={(e) => setDocFooter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>
          </div>
        )}

        {/* Форма Фото в PDF */}
        {docType === 'images' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                id="photo-upload"
                className="hidden"
                onChange={handleImageUpload}
              />
              <label
                htmlFor="photo-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg"
              >
                <Plus className="w-4 h-4 mr-2" /> Додати фотографії
              </label>
              <p className="text-xs text-slate-400 mt-2">Виберіть фото робіт, креслень чи чеків</p>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group border border-slate-700 rounded-lg overflow-hidden h-32">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Форма Презентації */}
        {docType === 'presentation' && (
          <div className="space-y-4">
            {slides.map((slide, idx) => (
              <div key={idx} className="p-4 border border-slate-800 bg-slate-800/40 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold text-amber-400">
                  <span>Слайд #{idx + 1}</span>
                  {slides.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSlides(slides.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Видалити
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Заголовок слайду"
                  value={slide.title}
                  onChange={(e) => {
                    const next = [...slides];
                    next[idx].title = e.target.value;
                    setSlides(next);
                  }}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                />
                <textarea
                  rows={2}
                  placeholder="Текст слайду"
                  value={slide.text}
                  onChange={(e) => {
                    const next = [...slides];
                    next[idx].text = e.target.value;
                    setSlides(next);
                  }}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                />
              </div>
            ))}
            <Button
              variant="outline"
              type="button"
              onClick={() => setSlides([...slides, { title: `Слайд ${slides.length + 1}`, text: '' }])}
            >
              <Plus className="w-4 h-4 mr-2" /> Додати слайд
            </Button>
          </div>
        )}

        {/* Форма чека */}
        {docType === 'receipt' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Магазин / Постачальник</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Епіцентр, Леруа Мерлен..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Сума (грн / €)</label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Категорія</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="Матеріали">Матеріали</option>
                  <option value="Інструменти">Інструменти</option>
                  <option value="Транспорт">Транспорт</option>
                  <option value="Послуги">Послуги</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-800">
          <Button
            type="button"
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3"
          >
            <Download className="w-5 h-5 mr-2" />
            {isGenerating ? 'Генерується...' : 'Завантажити готовий PDF'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
