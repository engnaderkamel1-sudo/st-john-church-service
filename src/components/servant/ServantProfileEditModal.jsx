import React, { useState, useEffect } from 'react';
import {
  X, User, Camera, Save, AlertCircle, CheckCircle2,
  MapPin, Church, Briefcase, GraduationCap, Calendar
} from 'lucide-react';
import { db } from '../../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { compressImage } from '../../utils/imageCompressor';

/**
 * نافذة تعديل البيانات الشخصية لحساب خادم أو مستخدم من لوحة المشرف / أمين الخدمة.
 */
export default function ServantProfileEditModal({ targetUser, onClose, onSaved }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [gender, setGender] = useState('male');
  const [birthDate, setBirthDate] = useState('');
  const [education, setEducation] = useState('');
  const [job, setJob] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('single');
  const [childrenCount, setChildrenCount] = useState(0);
  const [address, setAddress] = useState('');
  const [confessionFather, setConfessionFather] = useState('');
  const [confessionChurch, setConfessionChurch] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!targetUser) return;
    setFullName(targetUser.fullName || '');
    setEmail(targetUser.email || '');
    setPhotoUrl(targetUser.photoUrl || '');
    setGender(targetUser.gender || 'male');
    setBirthDate(targetUser.birthDate || '');
    setEducation(targetUser.education || '');
    setJob(targetUser.job || '');
    setMaritalStatus(targetUser.maritalStatus || 'single');
    setChildrenCount(targetUser.childrenCount ?? (targetUser.childrenDetails ? 1 : 0));
    setAddress(targetUser.address || '');
    setConfessionFather(targetUser.confessionFather || '');
    setConfessionChurch(targetUser.confessionChurch || '');
    setErrorMsg('');
    setSuccessMsg('');
  }, [targetUser]);

  if (!targetUser) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('يرجى إدخال الاسم بالكامل.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const updates = {
        fullName: fullName.trim(),
        email: email.trim(),
        photoUrl: photoUrl || '',
        gender: gender || 'male',
        birthDate: birthDate || '',
        education: education.trim(),
        job: job.trim(),
        maritalStatus: maritalStatus || 'single',
        childrenCount: maritalStatus === 'married' ? (Number(childrenCount) || 0) : 0,
        hasChildren: maritalStatus === 'married' && Number(childrenCount) > 0,
        address: address.trim(),
        confessionFather: confessionFather.trim(),
        confessionChurch: confessionChurch.trim(),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, 'users', targetUser.id), updates);
      setSuccessMsg('تم حفظ البيانات بنجاح');

      if (onSaved) {
        onSaved({ ...targetUser, ...updates });
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Error updating servant profile by admin:', err);
      setErrorMsg('حدث خطأ أثناء حفظ البيانات.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200 font-cairo text-right">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-l from-maroon-900 via-maroon-800 to-amber-950 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300 font-bold shrink-0 overflow-hidden">
              {photoUrl ? (
                <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <span>{fullName ? fullName[0] : 'خ'}</span>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold truncate">
                تعديل بيانات الحساب
              </h3>
              <p className="text-[11px] text-amber-200/85 truncate">
                {targetUser.fullName || 'بدون اسم'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Photo */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
              {photoUrl ? (
                <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-800 block mb-1">الصورة الشخصية</span>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-maroon-700 rounded-xl text-xs font-bold text-slate-700">
                  <Camera className="w-3.5 h-3.5 text-maroon-700" />
                  <span>{photoUrl ? 'تغيير الصورة' : 'رفع صورة'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const compressed = await compressImage(file, 400, 0.72);
                          if (compressed) setPhotoUrl(compressed);
                        } catch (err) {
                          console.error('Image compression error:', err);
                        }
                      }
                    }}
                  />
                </label>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                  >
                    إزالة
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الاسم بالكامل</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-maroon-700"
            />
          </div>

          {/* Gender & Birth Date */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">النوع</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-maroon-700"
              >
                <option value="male">شاب (ذكر)</option>
                <option value="female">شابة (أنثى)</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-slate-700 mb-1">
                <Calendar className="w-3.5 h-3.5 text-maroon-700" />
                <span>تاريخ الميلاد</span>
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={`w-full border rounded-xl px-2 py-2 text-xs font-semibold focus:outline-none focus:border-maroon-700 ${
                  !birthDate ? 'bg-amber-50 border-amber-400' : 'bg-white border-slate-300'
                }`}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              placeholder="example@gmail.com"
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-maroon-700"
            />
          </div>

          {/* Confession & Address */}
          <div className="border border-slate-200 bg-slate-50/70 p-3 rounded-2xl space-y-2.5">
            <span className="text-xs font-bold text-maroon-900 block">بيانات الافتقاد والأبوة الروحية</span>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان السكن</label>
              <div className="relative">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="المنطقة، الشارع، رقم العمارة..."
                  className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-maroon-700"
                />
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم أب الاعتراف</label>
                <input
                  type="text"
                  value={confessionFather}
                  onChange={(e) => setConfessionFather(e.target.value)}
                  placeholder="مثال: أبونا يوحنا"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-maroon-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">كنيسة أب الاعتراف</label>
                <div className="relative">
                  <input
                    type="text"
                    value={confessionChurch}
                    onChange={(e) => setConfessionChurch(e.target.value)}
                    placeholder="مثال: ماريوحنا بالمعراج"
                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-maroon-700"
                  />
                  <Church className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Education & Job */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">الدراسة / التخصص</label>
              <div className="relative">
                <input
                  type="text"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-maroon-700"
                />
                <GraduationCap className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">العمل / المهنة</label>
              <div className="relative">
                <input
                  type="text"
                  value={job}
                  onChange={(e) => setJob(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-maroon-700"
                />
                <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Marital Status */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-700">الحالة الاجتماعية</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { val: 'single', label: 'أعزب' },
                { val: 'engaged', label: 'خاطب / مخطوبة' },
                { val: 'married', label: 'متزوج' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setMaritalStatus(opt.val)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    maritalStatus === opt.val
                      ? 'bg-maroon-800 text-white border-maroon-800'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {maritalStatus === 'married' && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-bold text-slate-600">عدد الأولاد:</span>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={childrenCount}
                  onChange={(e) => setChildrenCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-20 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-center text-xs font-bold"
                />
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[42px] py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[2] min-h-[42px] py-2 bg-maroon-800 hover:bg-maroon-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'جاري الحفظ...' : 'حفظ البيانات'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
