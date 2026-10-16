import React from 'react';
import { Camera, MapPin, Church } from 'lucide-react';
import { compressImage } from '../../utils/imageCompressor';

export default function RegisterStepPersonal({
  photoUrl,
  setPhotoUrl,
  gender,
  setGender,
  birthDate,
  setBirthDate,
  confessionFather,
  setConfessionFather,
  confessionChurch,
  setConfessionChurch,
  address,
  setAddress
}) {
  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      {/* 1. Profile Picture Upload */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3">
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold text-slate-700">
            الصورة الشخصية <span className="text-red-500">*</span>
          </label>
          <span className="text-[10px] text-maroon-700 font-bold">إلزامية للتعرف في الخدمة</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
            {photoUrl ? (
              <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <div className="flex-1">
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-maroon-700 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition-all">
              <Camera className="w-3.5 h-3.5 text-maroon-700" />
              <span>{photoUrl ? 'تغيير الصورة' : 'اختر صورة شخصية'}</span>
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
                className="text-[10px] text-rose-600 hover:underline mr-2 font-bold"
              >
                إزالة الصورة
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Gender & Birth Date */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            النوع <span className="text-red-500">*</span>
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 text-xs focus:outline-none focus:border-maroon-700 focus:bg-white"
          >
            <option value="male">شاب (ذكر)</option>
            <option value="female">شابة (أنثى)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            تاريخ الميلاد <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-maroon-700 focus:bg-white"
          />
        </div>
      </div>

      {/* 3. Confession Father & Church */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            اسم أب الاعتراف <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={confessionFather}
            onChange={(e) => setConfessionFather(e.target.value)}
            placeholder="مثال: أبونا يوحنا"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-maroon-700 focus:bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            كنيسة أب الاعتراف <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={confessionChurch}
              onChange={(e) => setConfessionChurch(e.target.value)}
              placeholder="مثال: ماريوحنا المعراج"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pl-8 text-xs focus:outline-none focus:border-maroon-700 focus:bg-white"
            />
            <Church className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
          </div>
        </div>
      </div>

      {/* 4. Address */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          عنوان السكن أو المنطقة <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="المنطقة، الشارع، رقم العمارة (للافتقاد)..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pl-8 text-xs focus:outline-none focus:border-maroon-700 focus:bg-white"
          />
          <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
        </div>
      </div>
    </div>
  );
}
