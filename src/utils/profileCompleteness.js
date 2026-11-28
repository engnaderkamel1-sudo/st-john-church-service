/**
 * فحص اكتمال البيانات الأساسية للمستخدم (تاريخ الميلاد وبيانات التعرف والافتقاد).
 * يعيد قائمة الحقول الناقصة وحالة اكتمال الملف.
 */
export function getMissingProfileFields(user) {
  if (!user) {
    return { missingFields: [], hasMissingBirthDate: false, isComplete: true };
  }

  const missingFields = [];

  const hasValidBirthDate =
    typeof user.birthDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(user.birthDate.trim());

  if (!hasValidBirthDate) {
    missingFields.push({ key: 'birthDate', label: 'تاريخ الميلاد' });
  }
  if (!user.photoUrl || !String(user.photoUrl).trim()) {
    missingFields.push({ key: 'photoUrl', label: 'الصورة الشخصية' });
  }
  if (!user.confessionFather || !String(user.confessionFather).trim()) {
    missingFields.push({ key: 'confessionFather', label: 'أب الاعتراف' });
  }
  if (!user.confessionChurch || !String(user.confessionChurch).trim()) {
    missingFields.push({ key: 'confessionChurch', label: 'كنيسة أب الاعتراف' });
  }
  if (!user.address || !String(user.address).trim()) {
    missingFields.push({ key: 'address', label: 'عنوان السكن' });
  }

  return {
    missingFields,
    hasMissingBirthDate: !hasValidBirthDate,
    isComplete: missingFields.length === 0,
  };
}

/**
 * تنسيق رقم الهاتف المصري لفتح محادثة واتساب مباشرة.
 */
export function formatWhatsAppPhone(phone) {
  if (!phone) return '';
  let cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.startsWith('0020')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('20')) {
    // مسبوق بالفعل بكود مصر
  } else if (cleaned.startsWith('01')) {
    cleaned = '20' + cleaned.substring(1);
  } else if (cleaned.startsWith('1')) {
    cleaned = '20' + cleaned;
  }
  return cleaned;
}
