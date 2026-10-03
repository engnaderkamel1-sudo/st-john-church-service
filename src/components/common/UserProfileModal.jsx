import React, { useState } from 'react';
import { 
  X, User, Phone, Mail, ShieldCheck, KeyRound, 
  LogOut, Save, CheckCircle2, AlertCircle, Edit2 
} from 'lucide-react';
import { db } from '../../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export default function UserProfileModal({
  isOpen,
  onClose,
  user,
  onLogout,
  onUpdateUser
}) {
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !user) return null;

  const isAppAdmin = user && (user.role === 'admin' || user.phone === '01275571569' || (user.email && (user.email.includes('nader.kamel') || user.email.includes('st.johnmaadiservantsprep@gmail.com'))));

  const handleSaveProfile = async (e) => {
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
        updatedAt: serverTimestamp()
      };
      if (password.trim()) {
        updates.password = password.trim();
      }

      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, updates);

      if (onUpdateUser) {
        onUpdateUser({ fullName: fullName.trim(), email: email.trim() });
      }

      setSuccessMsg('تم تحديث بياناتك بنجاح! ✓');
      setPassword('');
      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err) {
      console.error('Error updating user profile:', err);
      setErrorMsg('حدث خطأ أثناء حفظ التعديلات.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200 font-sans text-right">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-l from-maroon-900 via-maroon-800 to-amber-950 text-white p-5 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300 text-lg font-bold">
              {user.fullName ? user.fullName[0] : 'U'}
            </div>
            <div>
              <h3 className="text-base font-extrabold flex items-center gap-2">
                الملف الشخصي والحساب 👤
              </h3>
              <p className="text-xs text-amber-200/80">
                إدارة وتعديل بيانات حسابك وتسجيل الخروج
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Status Badge */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">الصفة والصلاحية:</span>
            <span className="text-xs font-black px-3 py-1 rounded-full bg-maroon-50 text-maroon-900 border border-maroon-200">
              {isAppAdmin 
                ? 'مشرف التطبيق 👑' 
                : user.role === 'servant_leader' 
                ? 'أمين خدمة 🛡️' 
                : user.role === 'student' 
                ? 'مخدوم 🎓' 
                : 'خادم عام ✝️'}
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الاسم بالكامل:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700"
                  placeholder="أدخل اسمك"
                  required
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رقم الهاتف (اسم المستخدم):
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={user.phone || ''}
                  disabled
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-500 cursor-not-allowed"
                  dir="ltr"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">رقم الهاتف مرتبط بالحساب ولا يمكن تعديله.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                البريد الإلكتروني (اختياري):
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700"
                  placeholder="example@gmail.com"
                  dir="ltr"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                تغيير كلمة المرور (اتركه فارغاً إن لم ترغب بالتغيير):
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700"
                  placeholder="كلمة مرور جديدة"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
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

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-maroon-800 hover:bg-maroon-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'جاري الحفظ...' : 'حفظ تعديلات الحساب'}</span>
            </button>
          </form>

          {/* Logout Section */}
          <div className="border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onLogout) onLogout();
              }}
              className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج من الحساب 🚪</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
