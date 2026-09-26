import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';

// Тип для даних форми клієнта.
// Це робить код зрозумілішим і допомагає TypeScript перевіряти поля.
type ClientFormData = {
  client_number: string;
  name: string;
  email: string;
  phone: string;
  address: string;
};

// Головний компонент форми клієнта.
// Він використовується у двох режимах:
// 1. Створення нового клієнта
// 2. Редагування вже існуючого клієнта
export const ClientForm: React.FC = () => {
  // navigate використовується для переходів між сторінками.
  // Наприклад, після успішного збереження ми переходимо до списку клієнтів.
  const navigate = useNavigate();

  // id беремо з URL.
  // Якщо id є — це режим редагування.
  // Якщо id немає — це режим створення нового клієнта.
  const { id } = useParams();

  // Хук перекладів.
  // Дає доступ до функції t(...), яка повертає перекладений текст.
  const { t } = useLanguage();

  // Хук повідомлень.
  // showSuccess показує повідомлення про успіх.
  // showError показує повідомлення про помилку.
  const { showSuccess, showError } = useToastContext();

  // React Query client потрібен для оновлення кешу після збереження.
  // Наприклад, щоб список клієнтів автоматично підтягнув свіжі дані.
  const queryClient = useQueryClient();

  // Локальний стан форми.
  // Тут зберігаються значення всіх полів, які користувач вводить або редагує.
  const [formData, setFormData] = useState<ClientFormData>({
    client_number: '',
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  // ---------------------------------------------------------
  // 1. Завантаження поточної сесії користувача
  // ---------------------------------------------------------
  // Нам потрібно знати, хто зараз авторизований.
  // Це потрібно для:
  // - перевірки доступу
  // - збереження user_id у таблицю clients
  // - фільтрації клієнтів лише поточного користувача
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();

      // Якщо Supabase повернув помилку — перериваємо запит.
      if (error) throw error;

      // Повертаємо саме об’єкт session.
      return data.session;
    },
  });

  // ---------------------------------------------------------
  // 2. Завантаження клієнта для режиму редагування
  // ---------------------------------------------------------
  // Якщо в URL є id, значить ми хочемо відкрити існуючого клієнта.
  // Якщо id немає — цей запит не запускається.
  const { data: client, isLoading: clientLoading } = useQuery({
    // Ключ кешу.
    // Додаємо id і user id, щоб React Query правильно відрізняв записи.
    queryKey: ['client', id, session?.user?.id],

    queryFn: async () => {
      // Якщо немає id або користувач ще не визначений —
      // немає сенсу виконувати запит.
      if (!id || !session?.user?.id) return null;

      // Отримуємо одного клієнта за його id,
      // але також перевіряємо user_id для безпеки.
      // Це важливо при ввімкненому RLS.
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) throw error;

      return data;
    },

    // enabled визначає, чи можна запускати цей запит.
    // Якщо ми створюємо нового клієнта, id немає — значить запит не потрібен.
    enabled: !!id && !!session?.user?.id,
  });

  // ---------------------------------------------------------
  // 3. Коли клієнт завантажився — заповнюємо форму
  // ---------------------------------------------------------
  // Це працює тільки в режимі редагування.
  // Коли з бази прийшов об’єкт client, ми переносимо його значення в formData.
  useEffect(() => {
    if (client) {
      setFormData({
        client_number: client.client_number || '',
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
      });
    }
  }, [client]);

  // ---------------------------------------------------------
  // 4. Якщо створюється новий клієнт — генеруємо номер
  // ---------------------------------------------------------
  // Цей useEffect спрацьовує тільки тоді, коли:
  // - ми не редагуємо існуючого клієнта
  // - є авторизований користувач
  useEffect(() => {
    if (!id && session?.user?.id) {
      void generateClientNumber();
    }
  }, [id, session?.user?.id]);

  // ---------------------------------------------------------
  // 5. Функція генерації номера клієнта
  // ---------------------------------------------------------
  // Логіка така:
  // - беремо останнього клієнта поточного користувача
  // - дивимось його client_number
  // - дістаємо останнє число
  // - збільшуємо на 1
  // - формуємо новий номер, наприклад CLI-0001, CLI-0002, ...
  const generateClientNumber = async () => {
    if (!session?.user?.id) return;

    const { data, error } = await supabase
      .from('clients')
      .select('client_number')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Якщо не вдалося отримати попередній номер,
    // не блокуємо користувача повністю.
    // Просто ставимо стартовий номер CLI-0001.
    if (error) {
      console.error('Помилка генерації номера клієнта:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });

      setFormData((prev) => ({
        ...prev,
        client_number: 'CLI-0001',
      }));

      showError(error.message || 'Не вдалося згенерувати номер клієнта');
      return;
    }

    // За замовчуванням стартуємо з 1.
    let nextNumber = 1;

    // Якщо попередній client_number існує,
    // наприклад "CLI-0007", то витягуємо "0007"
    // і збільшуємо число на 1.
    if (data?.client_number) {
      const match = data.client_number.match(/\d+$/);

      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }

    // Формуємо новий номер з доповненням нулями зліва.
    // Наприклад:
    // 1 -> CLI-0001
    // 12 -> CLI-0012
    const clientNumber = `CLI-${String(nextNumber).padStart(4, '0')}`;

    // Записуємо номер у форму.
    setFormData((prev) => ({
      ...prev,
      client_number: clientNumber,
    }));
  };

  // ---------------------------------------------------------
  // 6. Mutation для збереження клієнта
  // ---------------------------------------------------------
  // useMutation використовується для змін даних:
  // - insert
  // - update
  //
  // Тут одна функція обробляє і створення, і редагування.
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Перевіряємо, що користувач авторизований.
      if (!session?.user?.id) {
        throw new Error('Користувач не авторизований');
      }

      // Нормалізуємо значення перед збереженням.
      // Це допомагає уникнути зайвих пробілів і різного написання email.
      const normalizedName = formData.name.trim();
      const normalizedEmail = formData.email.trim().toLowerCase();
      const normalizedPhone = formData.phone.trim();
      const normalizedAddress = formData.address.trim();
      const normalizedClientNumber = formData.client_number.trim();

      // Мінімальна валідація: ім'я клієнта обов'язкове.
      if (!normalizedName) {
        throw new Error("Введіть ім'я клієнта");
      }

      // Якщо номер не сформувався — теж не зберігаємо.
      if (!normalizedClientNumber) {
        throw new Error('Не вдалося сформувати номер клієнта');
      }

      // Загальний об’єкт для insert/update.
      const payload = {
        client_number: normalizedClientNumber,
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        address: normalizedAddress,
        user_id: session.user.id,
      };

      // Якщо id є — редагуємо існуючого клієнта.
      if (id) {
        const { error } = await supabase
          .from('clients')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', session.user.id);

        if (error) throw error;
      } else {
        // Якщо id немає — створюємо нового клієнта.
        const { error } = await supabase.from('clients').insert([payload]);

        if (error) throw error;
      }
    },

    // Виконується після успішного збереження.
    onSuccess: async () => {
      // Оновлюємо кеш списку клієнтів.
      await queryClient.invalidateQueries({ queryKey: ['clients'] });

      // Показуємо повідомлення про успіх.
      showSuccess(t('clientSaved') || 'Клієнта збережено');

      // Повертаємо користувача до списку клієнтів.
      navigate('/clients');
    },

    // Виконується при помилці збереження.
    onError: (error: any) => {
      console.error('Помилка збереження клієнта:', error);

      showError(
        error?.message ||
          t('errorSavingClient') ||
          'Не вдалося зберегти клієнта'
      );
    },
  });

  // ---------------------------------------------------------
  // 7. Обробник submit форми
  // ---------------------------------------------------------
  // Викликається при натисканні кнопки збереження або Enter у формі.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Запускаємо mutation на збереження.
    saveMutation.mutate();
  };

  // ---------------------------------------------------------
  // 8. Загальний стан завантаження сторінки
  // ---------------------------------------------------------
  // Сторінка вважається "loading", якщо:
  // - ще завантажується сесія
  // - або ми в режимі редагування і ще завантажується клієнт
  const isPageLoading = sessionLoading || (Boolean(id) && clientLoading);

  // ---------------------------------------------------------
  // 9. Розмітка компонента
  // ---------------------------------------------------------
  return (
    <div className="min-h-screen pt-20 pb-8 px-4 md:px-6 max-w-4xl mx-auto">
      {/* Кнопка повернення до списку клієнтів */}
      <button
        onClick={() => navigate('/clients')}
        className="flex items-center justify-center p-2 bg-white/10 backdrop-blur-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl mb-6 transition-all active:scale-95"
        title={t('back')}
        type="button"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      {/* Заголовок сторінки залежить від режиму:
          якщо є id — редагування,
          якщо id немає — новий клієнт */}
      <h1 className="text-2xl font-semibold text-white mb-6">
        {id ? t('edit') || 'Редагувати' : t('newClient') || 'Новий клієнт'}
      </h1>

      <Card className="p-6">
        {isPageLoading ? (
          // Показуємо текст завантаження, поки потрібні дані ще не прийшли
          <p className="text-white/60">
            {t('loading') || 'Завантаження'}...
          </p>
        ) : (
          // Основна форма
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Номер клієнта.
                Для нового клієнта він генерується автоматично,
                тому поле заблоковане.
                Для редагування можна залишити як є або теж заблокувати. */}
            <Input
              label={t('clientNumber') || 'Номер клієнта'}
              value={formData.client_number}
              onChange={(e) =>
                setFormData({ ...formData, client_number: e.target.value })
              }
              disabled={!id}
            />

            {/* Ім'я клієнта — основне обов'язкове поле */}
            <Input
              label={t('clientName') || "Ім'я клієнта"}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />

            {/* Email клієнта */}
            <Input
              label={t('email') || 'Email'}
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />

            {/* Телефон клієнта */}
            <Input
              label={t('phone') || 'Телефон'}
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />

            {/* Адреса клієнта.
                Для адреси краще textarea, бо текст може бути довшим. */}
            <Textarea
              label={t('address') || 'Адреса'}
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              rows={3}
            />

            {/* Кнопки дій */}
            <div className="flex gap-2 pt-2 justify-end">
              {/* Скасування — повернення до списку без збереження */}
              <button
                type="button"
                onClick={() => navigate('/clients')}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-gray-300 hover:text-white transition-all active:scale-95"
                title={t('cancel') || 'Скасувати'}
              >
                <X className="h-4 w-4" />
              </button>

              {/* Збереження.
                  Кнопка блокується, якщо:
                  - вже йде збереження
                  - немає авторизованого користувача
                  - не сформувався номер клієнта */}
              <button
                type="submit"
                disabled={
                  saveMutation.isPending ||
                  !session?.user?.id ||
                  !formData.client_number.trim()
                }
                className="p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all active:scale-95 disabled:opacity-50"
                title={t('save') || 'Зберегти'}
              >
                <Save className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};