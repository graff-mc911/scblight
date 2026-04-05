#!/usr/bin/env python3
"""
Script to add missing signature and email-related translations
"""

# Real missing keys that need translations
missing_keys = {
    'signature': {
        'en': 'Signature',
        'uk': 'Підпис',
        'de': 'Unterschrift',
        'pl': 'Podpis',
        'es': 'Firma',
        'fr': 'Signature',
        'it': 'Firma',
        'pt': 'Assinatura',
        'nl': 'Handtekening',
        'cs': 'Podpis',
        'sk': 'Podpis',
        'ro': 'Semnătură',
        'hu': 'Aláírás',
        'tr': 'İmza',
        'ar': 'التوقيع',
        'zh': '签名',
        'ja': '署名',
        'ko': '서명',
        'hi': 'हस्ताक्षर',
        'bn': 'স্বাক্ষর',
        'vi': 'Chữ ký',
        'id': 'Tanda tangan',
    },
    'signInvoice': {
        'en': 'Sign invoice',
        'uk': 'Підписати рахунок',
        'de': 'Rechnung unterschreiben',
        'pl': 'Podpisz fakturę',
        'es': 'Firmar factura',
        'fr': 'Signer la facture',
        'it': 'Firma fattura',
        'pt': 'Assinar fatura',
        'nl': 'Factuur ondertekenen',
        'cs': 'Podepsat fakturu',
        'sk': 'Podpísať faktúru',
        'ro': 'Semnează factura',
        'hu': 'Számla aláírása',
        'tr': 'Faturayı imzala',
        'ar': 'توقيع الفاتورة',
        'zh': '签署发票',
        'ja': '請求書に署名',
        'ko': '송장 서명',
        'hi': 'चालान पर हस्ताक्षर करें',
        'bn': 'চালান স্বাক্ষর করুন',
        'vi': 'Ký hóa đơn',
        'id': 'Tanda tangani faktur',
    },
    'signerName': {
        'en': 'Signer name',
        'uk': 'Ім\'я підписанта',
        'de': 'Name des Unterzeichners',
        'pl': 'Nazwisko podpisującego',
        'es': 'Nombre del firmante',
        'fr': 'Nom du signataire',
        'it': 'Nome del firmatario',
        'pt': 'Nome do signatário',
        'nl': 'Naam ondertekenaar',
        'cs': 'Jméno podepsaného',
        'sk': 'Meno podpísaného',
        'ro': 'Numele semnatarului',
        'hu': 'Aláíró neve',
        'tr': 'İmzalayanın adı',
        'ar': 'اسم الموقع',
        'zh': '签名人姓名',
        'ja': '署名者名',
        'ko': '서명자 이름',
        'hi': 'हस्ताक्षरकर्ता का नाम',
        'bn': 'স্বাক্ষরকারীর নাম',
        'vi': 'Tên người ký',
        'id': 'Nama penandatangan',
    },
    'enterSignerName': {
        'en': 'Enter signer name',
        'uk': 'Введіть ім\'я підписанта',
        'de': 'Name des Unterzeichners eingeben',
        'pl': 'Wprowadź nazwisko podpisującego',
        'es': 'Ingrese el nombre del firmante',
        'fr': 'Entrez le nom du signataire',
        'it': 'Inserisci il nome del firmatario',
        'pt': 'Digite o nome do signatário',
        'nl': 'Voer naam ondertekenaar in',
        'cs': 'Zadejte jméno podepsaného',
        'sk': 'Zadajte meno podpísaného',
        'ro': 'Introduceți numele semnatarului',
        'hu': 'Adja meg az aláíró nevét',
        'tr': 'İmzalayanın adını girin',
        'ar': 'أدخل اسم الموقع',
        'zh': '输入签名人姓名',
        'ja': '署名者名を入力',
        'ko': '서명자 이름 입력',
        'hi': 'हस्ताक्षरकर्ता का नाम दर्ज करें',
        'bn': 'স্বাক্ষরকারীর নাম লিখুন',
        'vi': 'Nhập tên người ký',
        'id': 'Masukkan nama penandatangan',
    },
    'drawSignature': {
        'en': 'Draw signature',
        'uk': 'Намалюйте підпис',
        'de': 'Unterschrift zeichnen',
        'pl': 'Narysuj podpis',
        'es': 'Dibujar firma',
        'fr': 'Dessiner la signature',
        'it': 'Disegna firma',
        'pt': 'Desenhar assinatura',
        'nl': 'Handtekening tekenen',
        'cs': 'Nakreslit podpis',
        'sk': 'Nakresliť podpis',
        'ro': 'Desenează semnătura',
        'hu': 'Aláírás rajzolása',
        'tr': 'İmza çiz',
        'ar': 'ارسم التوقيع',
        'zh': '绘制签名',
        'ja': '署名を描く',
        'ko': '서명 그리기',
        'hi': 'हस्ताक्षर बनाएं',
        'bn': 'স্বাক্ষর আঁকুন',
        'vi': 'Vẽ chữ ký',
        'id': 'Gambar tanda tangan',
    },
    'saveSignature': {
        'en': 'Save signature',
        'uk': 'Зберегти підпис',
        'de': 'Unterschrift speichern',
        'pl': 'Zapisz podpis',
        'es': 'Guardar firma',
        'fr': 'Enregistrer la signature',
        'it': 'Salva firma',
        'pt': 'Salvar assinatura',
        'nl': 'Handtekening opslaan',
        'cs': 'Uložit podpis',
        'sk': 'Uložiť podpis',
        'ro': 'Salvează semnătura',
        'hu': 'Aláírás mentése',
        'tr': 'İmzayı kaydet',
        'ar': 'حفظ التوقيع',
        'zh': '保存签名',
        'ja': '署名を保存',
        'ko': '서명 저장',
        'hi': 'हस्ताक्षर सहेजें',
        'bn': 'স্বাক্ষর সংরক্ষণ করুন',
        'vi': 'Lưu chữ ký',
        'id': 'Simpan tanda tangan',
    },
    'signatureSaved': {
        'en': 'Signature saved',
        'uk': 'Підпис збережено',
        'de': 'Unterschrift gespeichert',
        'pl': 'Podpis zapisany',
        'es': 'Firma guardada',
        'fr': 'Signature enregistrée',
        'it': 'Firma salvata',
        'pt': 'Assinatura salva',
        'nl': 'Handtekening opgeslagen',
        'cs': 'Podpis uložen',
        'sk': 'Podpis uložený',
        'ro': 'Semnătură salvată',
        'hu': 'Aláírás mentve',
        'tr': 'İmza kaydedildi',
        'ar': 'تم حفظ التوقيع',
        'zh': '签名已保存',
        'ja': '署名が保存されました',
        'ko': '서명이 저장되었습니다',
        'hi': 'हस्ताक्षर सहेजा गया',
        'bn': 'স্বাক্ষর সংরক্ষিত',
        'vi': 'Chữ ký đã lưu',
        'id': 'Tanda tangan disimpan',
    },
    'failedSaveSignature': {
        'en': 'Failed to save signature',
        'uk': 'Не вдалося зберегти підпис',
        'de': 'Unterschrift konnte nicht gespeichert werden',
        'pl': 'Nie udało się zapisać podpisu',
        'es': 'Error al guardar la firma',
        'fr': 'Échec de l\'enregistrement de la signature',
        'it': 'Impossibile salvare la firma',
        'pt': 'Falha ao salvar assinatura',
        'nl': 'Handtekening opslaan mislukt',
        'cs': 'Nepodařilo se uložit podpis',
        'sk': 'Nepodarilo sa uložiť podpis',
        'ro': 'Nu s-a putut salva semnătura',
        'hu': 'Az aláírás mentése nem sikerült',
        'tr': 'İmza kaydedilemedi',
        'ar': 'فشل حفظ التوقيع',
        'zh': '保存签名失败',
        'ja': '署名の保存に失敗しました',
        'ko': '서명 저장 실패',
        'hi': 'हस्ताक्षर सहेजने में विफल',
        'bn': 'স্বাক্ষর সংরক্ষণ ব্যর্থ',
        'vi': 'Lưu chữ ký thất bại',
        'id': 'Gagal menyimpan tanda tangan',
    },
    'signed': {
        'en': 'Signed',
        'uk': 'Підписано',
        'de': 'Unterschrieben',
        'pl': 'Podpisany',
        'es': 'Firmado',
        'fr': 'Signé',
        'it': 'Firmato',
        'pt': 'Assinado',
        'nl': 'Ondertekend',
        'cs': 'Podepsáno',
        'sk': 'Podpísané',
        'ro': 'Semnat',
        'hu': 'Aláírva',
        'tr': 'İmzalandı',
        'ar': 'موقع',
        'zh': '已签名',
        'ja': '署名済み',
        'ko': '서명됨',
        'hi': 'हस्ताक्षरित',
        'bn': 'স্বাক্ষরিত',
        'vi': 'Đã ký',
        'id': 'Ditandatangani',
    },
    'sendInvoice': {
        'en': 'Send invoice',
        'uk': 'Надіслати рахунок',
        'de': 'Rechnung senden',
        'pl': 'Wyślij fakturę',
        'es': 'Enviar factura',
        'fr': 'Envoyer la facture',
        'it': 'Invia fattura',
        'pt': 'Enviar fatura',
        'nl': 'Factuur verzenden',
        'cs': 'Odeslat fakturu',
        'sk': 'Odoslať faktúru',
        'ro': 'Trimite factura',
        'hu': 'Számla küldése',
        'tr': 'Fatura gönder',
        'ar': 'إرسال الفاتورة',
        'zh': '发送发票',
        'ja': '請求書を送信',
        'ko': '송장 보내기',
        'hi': 'चालान भेजें',
        'bn': 'চালান পাঠান',
        'vi': 'Gửi hóa đơn',
        'id': 'Kirim faktur',
    },
    'recipientEmail': {
        'en': 'Recipient email',
        'uk': 'Email одержувача',
        'de': 'E-Mail des Empfängers',
        'pl': 'E-mail odbiorcy',
        'es': 'Correo del destinatario',
        'fr': 'Email du destinataire',
        'it': 'Email destinatario',
        'pt': 'Email do destinatário',
        'nl': 'E-mailadres ontvanger',
        'cs': 'E-mail příjemce',
        'sk': 'E-mail príjemcu',
        'ro': 'Email destinatar',
        'hu': 'Címzett e-mail címe',
        'tr': 'Alıcı e-postası',
        'ar': 'البريد الإلكتروني للمستلم',
        'zh': '收件人电子邮件',
        'ja': '受信者のメール',
        'ko': '수신자 이메일',
        'hi': 'प्राप्तकर्ता का ईमेल',
        'bn': 'প্রাপকের ইমেল',
        'vi': 'Email người nhận',
        'id': 'Email penerima',
    },
    'invoiceSent': {
        'en': 'Invoice sent successfully',
        'uk': 'Рахунок успішно надіслано',
        'de': 'Rechnung erfolgreich gesendet',
        'pl': 'Faktura wysłana pomyślnie',
        'es': 'Factura enviada exitosamente',
        'fr': 'Facture envoyée avec succès',
        'it': 'Fattura inviata con successo',
        'pt': 'Fatura enviada com sucesso',
        'nl': 'Factuur succesvol verzonden',
        'cs': 'Faktura úspěšně odeslána',
        'sk': 'Faktúra úspešne odoslaná',
        'ro': 'Factură trimisă cu succes',
        'hu': 'Számla sikeresen elküldve',
        'tr': 'Fatura başarıyla gönderildi',
        'ar': 'تم إرسال الفاتورة بنجاح',
        'zh': '发票发送成功',
        'ja': '請求書が正常に送信されました',
        'ko': '송장이 성공적으로 전송되었습니다',
        'hi': 'चालान सफलतापूर्वक भेजा गया',
        'bn': 'চালান সফলভাবে পাঠানো হয়েছে',
        'vi': 'Hóa đơn đã gửi thành công',
        'id': 'Faktur berhasil dikirim',
    },
    'failedSendInvoice': {
        'en': 'Failed to send invoice',
        'uk': 'Не вдалося надіслати рахунок',
        'de': 'Rechnung konnte nicht gesendet werden',
        'pl': 'Nie udało się wysłać faktury',
        'es': 'Error al enviar la factura',
        'fr': 'Échec de l\'envoi de la facture',
        'it': 'Impossibile inviare la fattura',
        'pt': 'Falha ao enviar fatura',
        'nl': 'Factuur verzenden mislukt',
        'cs': 'Nepodařilo se odeslat fakturu',
        'sk': 'Nepodarilo sa odoslať faktúru',
        'ro': 'Nu s-a putut trimite factura',
        'hu': 'A számla küldése nem sikerült',
        'tr': 'Fatura gönderilemedi',
        'ar': 'فشل إرسال الفاتورة',
        'zh': '发送发票失败',
        'ja': '請求書の送信に失敗しました',
        'ko': '송장 전송 실패',
        'hi': 'चालान भेजने में विफल',
        'bn': 'চালান পাঠাতে ব্যর্থ',
        'vi': 'Gửi hóa đơn thất bại',
        'id': 'Gagal mengirim faktur',
    },
}

# Read the file
with open('src/lib/languages.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add to baseTranslations first
base_start = content.find('const baseTranslations')
base_section_start = content.find('{', base_start)
base_section_end = content.find('\n};', base_section_start)

# Find where to insert in baseTranslations (before the closing brace)
insertion_point = base_section_end

# Create new entries for baseTranslations
new_base_entries = []
for key in missing_keys.keys():
    key_pattern = f"  {key}:"
    if key_pattern not in content[base_start:base_section_end]:
        value = missing_keys[key]['en']
        escaped_value = value.replace("'", "\\'")
        new_base_entries.append(f"  {key}: '{escaped_value}',")

if new_base_entries:
    insertion = '\n' + '\n'.join(new_base_entries) + '\n'
    content = content[:insertion_point] + insertion + content[insertion_point:]

print(f"Added {len(new_base_entries)} entries to baseTranslations")

# Now add language-specific translations
languages = ['uk', 'de', 'pl', 'es', 'fr', 'it', 'pt', 'nl', 'cs', 'sk', 'ro', 'hu', 'tr', 'ar', 'zh', 'ja', 'ko', 'hi', 'bn', 'vi', 'id']

for lang_code in languages:
    lang_pattern = f"  {lang_code}: {{"
    if lang_pattern in content:
        start_idx = content.find(lang_pattern)
        brace_count = 0
        i = start_idx + len(lang_pattern)

        while i < len(content):
            if content[i] == '{':
                brace_count += 1
            elif content[i] == '}':
                if brace_count == 0:
                    # Found the closing brace
                    new_translations = []
                    for key in missing_keys.keys():
                        key_pattern = f"    {key}:"
                        section = content[start_idx:i]
                        if key_pattern not in section and lang_code in missing_keys[key]:
                            value = missing_keys[key][lang_code]
                            escaped_value = value.replace("'", "\\'")
                            new_translations.append(f"    {key}: '{escaped_value}',")

                    if new_translations:
                        insertion = '\n' + '\n'.join(new_translations) + '\n  '
                        content = content[:i] + insertion + content[i:]
                    break
                else:
                    brace_count -= 1
            i += 1

# Write back
with open('src/lib/languages.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Translation keys added for all {len(languages)} languages!")
