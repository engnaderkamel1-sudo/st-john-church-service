import React from 'react';
import { User, Phone, Lock, BookOpen, GraduationCap, Mail } from 'lucide-react';

export default function RegisterStepAccount({
  role,
  setRole,
  fullName,
  setFullName,
  email,
  setEmail,
  phone,
  setPhone,
  password,
  setPassword,
  grade,
  setGrade
}) {
  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
        <label className="block text-xs font-bold text-slate-700 mb-2">اختر صفتك في الخدمة:</label>
        <div className="grid grid-cols-2 gap-2 bg-slate-200/70 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setRole('student')}
            className={`py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
              role === 'student'
                ? 'bg-white text-maroon-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>مخدوم</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('servant')}
            className={`py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
              role === 'servant'
                ? 'bg-maroon-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>خادم</span>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          الاسم ثلاثي <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="مثال: جورج سمير حنا"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs focus:outline-none focus:border-maroon-700 focus:bg-white transition-colors"
          />
          <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-bold text-slate-700">
            البريد الإلكتروني <span className="text-red-500">*</span>
          </label>
          <span className="text-[10px] text-maroon-700 font-bold">إلزامي لتأمين الحساب واستعادته</span>
        </div>
        <div className="relative">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@domain.com"
            dir="ltr"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs text-right focus:outline-none focus:border-maroon-700 focus:bg-white transition-colors"
          />
          <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          رقم الهاتف <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
            dir="ltr"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs text-right focus:outline-none focus:border-maroon-700 focus:bg-white transition-colors"
          />
          <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          كلمة المرور <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs focus:outline-none focus:border-maroon-700 focus:bg-white transition-colors"
          />
          <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        </div>
      </div>

      {role === 'student' && (
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            المرحلة الدراسية <span className="text-red-500">*</span>
          </label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-maroon-700 focus:bg-white transition-colors"
          >
            <option value="first">سنة أولى</option>
            <option value="second">سنة ثانية</option>
            <option value="third">سنة ثالثة</option>
            <option value="elisha">فصل أليشع (إعداد خدام)</option>
          </select>
        </div>
      )}
    </div>
  );
}
