import React, { useState } from 'react';
import { 
  X, User, Phone, Mail, ShieldCheck, KeyRound, 
  LogOut, Save, CheckCircle2, AlertCircle, Edit2,
  Camera, Heart, MapPin, Briefcase, GraduationCap, Users, Calendar
} from 'lucide-react';
import { db } from '../../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { compressImage } from '../../utils/imageCompressor';

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
  
  // Extended Profile State
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || '');
  const [birthDate, setBirthDate] = useState(user?.birthDate || '');
  const [gender, setGender] = useState(user?.gender || 'male');
  const [education, setEducation] = useState(user?.education || '');
  const [job, setJob] = useState(user?.job || '');
  const [maritalStatus, setMaritalStatus] = useState(user?.maritalStatus || 'single');
  const [spouseName, setSpouseName] = useState(user?.spouseName || '');
  const [hasChildren, setHasChildren] = useState(Boolean(user?.hasChildren));
  const [childrenDetails, setChildrenDetails] = useState(user?.childrenDetails || '');
  const [address, setAddress] = useState(user?.address || '');
  const [confessionFather, setConfessionFather] = useState(user?.confessionFather || '');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync state if user changes
  React.useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setPhotoUrl(user.photoUrl || '');
      setBirthDate(user.birthDate || '');
      setGender(user.gender || 'male');
      setEducation(user.education || '');
      setJob(user.job || '');
      setMaritalStatus(user.maritalStatus || 'single');
      setSpouseName(user.spouseName || '');
      setHasChildren(Boolean(user.hasChildren));
      setChildrenDetails(user.childrenDetails || '');
      setAddress(user.address || '');
      setConfessionFather(user.confessionFather || '');
    }
  }, [user]);

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
        photoUrl: photoUrl || '',
        gender: gender || 'male',
        birthDate: birthDate || '',
        education: education.trim(),
        job: job.trim(),
        maritalStatus: maritalStatus || 'single',
        spouseName: maritalStatus === 'married' ? spouseName.trim() : '',
        hasChildren: maritalStatus === 'married' ? hasChildren : false,
        childrenDetails: (maritalStatus === 'married' && hasChildren) ? childrenDetails.trim() : '',
        address: address.trim(),
        confessionFather: confessionFather.trim(),
        updatedAt: serverTimestamp()
      };
      if (password.trim()) {
        updates.password = password.trim();
      }

      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, updates);

      if (onUpdateUser) {
        onUpdateUser({
          ...updates,
          id: user.id
        });
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
            {/* Avatar / Photo Upload */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative">
                {photoUrl ? (
                  <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-7 h-7 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-slate-800 block mb-1">الصورة الشخصية</span>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-maroon-700 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition-all">
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
                      className="text-[11px] text-rose-600 hover:underline font-bold"
                    >
                      إزالة
                    </button>
                  )}
                </div>
              </div>
            </div>

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

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">النوع:</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-maroon-700"
                >
                  <option value="male">شاب (ذكر)</option>
                  <option value="female">شابة (أنثى)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">تاريخ الميلاد:</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2 py-2 text-xs font-semibold focus:outline-none focus:border-maroon-700"
                />
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

            {/* Educational & Job Details */}
            <div className="border border-slate-200 bg-slate-50/70 p-3.5 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-maroon-900 block">الدراسة والعمل</span>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الكلية / التخصص الدراسي</label>
                <div className="relative">
                  <input
                    type="text"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    placeholder="مثال: كلية التجارة، هندسة عين شمس..."
                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-maroon-700"
                  />
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الوظيفة / المهنة الحالية</label>
                <div className="relative">
                  <input
                    type="text"
                    value={job}
                    onChange={(e) => setJob(e.target.value)}
                    placeholder="طالب / مهندس / محاسب..."
                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-maroon-700"
                  />
                  <Briefcase className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
              </div>
            </div>

            {/* Marital Status & Family */}
            <div className="border border-slate-200 bg-slate-50/70 p-3.5 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-maroon-900 block">الحالة الاجتماعية والأسرة</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setMaritalStatus('single')}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    maritalStatus === 'single'
                      ? 'bg-maroon-800 text-white border-maroon-800 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  أعزب
                </button>
                <button
                  type="button"
                  onClick={() => setMaritalStatus('engaged')}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    maritalStatus === 'engaged'
                      ? 'bg-maroon-800 text-white border-maroon-800 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  خاطب / مخطوبة
                </button>
                <button
                  type="button"
                  onClick={() => setMaritalStatus('married')}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    maritalStatus === 'married'
                      ? 'bg-maroon-800 text-white border-maroon-800 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  متزوج
                </button>
              </div>

              {maritalStatus === 'married' && (
                <div className="bg-white border border-amber-200 rounded-xl p-3 space-y-2.5 mt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم شريك الحياة</label>
                    <input
                      type="text"
                      value={spouseName}
                      onChange={(e) => setSpouseName(e.target.value)}
                      placeholder="اسم الزوج / الزوجة"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-maroon-700"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hasChildrenProfile"
                      checked={hasChildren}
                      onChange={(e) => setHasChildren(e.target.checked)}
                      className="w-4 h-4 text-maroon-800 rounded-sm focus:ring-maroon-700 accent-maroon-800"
                    />
                    <label htmlFor="hasChildrenProfile" className="text-xs font-bold text-slate-700 cursor-pointer">
                      هل يوجد أولاد؟
                    </label>
                  </div>

                  {hasChildren && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        بيانات وأعمار الأبناء
                      </label>
                      <input
                        type="text"
                        value={childrenDetails}
                        onChange={(e) => setChildrenDetails(e.target.value)}
                        placeholder="مثال: فيلوباتير (٤ سنين)، ميرنا (سنة)"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-maroon-700"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pastoral Care: Address & Confession Father */}
            <div className="border border-slate-200 bg-slate-50/70 p-3.5 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-maroon-900 block">الافتقاد والتواصل</span>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان السكن بالتفصيل</label>
                <div className="relative">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="المنطقة، الشارع، رقم العمارة، الشقة..."
                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-maroon-700"
                  />
                  <MapPin className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">أب الاعتراف والكنيسة</label>
                <input
                  type="text"
                  value={confessionFather}
                  onChange={(e) => setConfessionFather(e.target.value)}
                  placeholder="اسم أبونا وكنيسته..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-maroon-700"
                />
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
