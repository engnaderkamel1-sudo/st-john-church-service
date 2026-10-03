import React, { useState, useMemo } from 'react';
import { Cake, Calendar, Gift, Users, User, Search, Sparkles, AlertCircle, Phone, MessageCircle } from 'lucide-react';

export default function ServantBirthdaysHub({ allUsers = [], getGradeTitle, onSelectStudent }) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'servants' | 'students'
  const [stageFilter, setStageFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to calculate days until next birthday and turning age
  const processedUsers = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    return allUsers
      .filter(u => u.birthDate && typeof u.birthDate === 'string' && u.birthDate.includes('-'))
      .map(u => {
        const [bYearStr, bMonthStr, bDayStr] = u.birthDate.split('-');
        const bYear = parseInt(bYearStr, 10);
        const bMonth = parseInt(bMonthStr, 10) - 1; // 0-indexed
        const bDay = parseInt(bDayStr, 10);

        if (isNaN(bMonth) || isNaN(bDay)) return null;

        // Birthday this year
        let nextBirthday = new Date(currentYear, bMonth, bDay);
        // If birthday already passed this year, it falls in next year
        if (
          bMonth < todayMonth || 
          (bMonth === todayMonth && bDay < todayDate)
        ) {
          nextBirthday = new Date(currentYear + 1, bMonth, bDay);
        }

        // Difference in days
        const diffTime = nextBirthday.getTime() - new Date(currentYear, todayMonth, todayDate).getTime();
        const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));
        const isToday = daysRemaining === 0;
        const isWithin3Days = daysRemaining >= 1 && daysRemaining <= 3;
        const isWithin7Days = daysRemaining >= 1 && daysRemaining <= 7;
        const turningAge = bYear ? nextBirthday.getFullYear() - bYear : null;

        return {
          ...u,
          bDay,
          bMonth: bMonth + 1,
          daysRemaining,
          isToday,
          isWithin3Days,
          isWithin7Days,
          turningAge
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [allUsers]);

  // Filtered by role and stage
  const filteredUsers = useMemo(() => {
    return processedUsers.filter(u => {
      // Role filter
      if (filterType === 'servants' && u.role === 'student') return false;
      if (filterType === 'students' && u.role !== 'student') return false;

      // Stage filter (only applies to students)
      if (filterType === 'students' && stageFilter !== 'all' && u.grade !== stageFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (u.fullName || '').toLowerCase().includes(q);
        const phoneMatch = (u.phone || '').includes(q);
        return nameMatch || phoneMatch;
      }

      return true;
    });
  }, [processedUsers, filterType, stageFilter, searchQuery]);

  const todayBirthdays = filteredUsers.filter(u => u.isToday);
  const upcoming3Days = filteredUsers.filter(u => u.isWithin3Days);
  const remainingBirthdays = filteredUsers.filter(u => !u.isToday && !u.isWithin3Days);

  const getRoleBadge = (u) => {
    if (u.role === 'admin') return <span className="text-[10px] bg-red-100 text-red-900 border border-red-200 px-2 py-0.5 rounded-full font-bold">مسؤول 👑</span>;
    if (u.role === 'servant_leader') return <span className="text-[10px] bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-full font-bold">أمين خدمة 🛡️</span>;
    if (u.role === 'servant') return <span className="text-[10px] bg-blue-100 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-full font-bold">خادم ✝️</span>;
    return (
      <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
        {getGradeTitle ? getGradeTitle(u.grade) : u.grade || 'مخدوم'} 🎓
      </span>
    );
  };

  return (
    <div className="space-y-6 text-right">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-700 via-maroon-800 to-maroon-900 rounded-3xl p-5 sm:p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cake className="w-6 h-6 text-gold-300 animate-bounce" />
            <h2 className="text-lg sm:text-xl font-extrabold text-white">دليل أعياد الميلاد 🎂</h2>
          </div>
          <p className="text-xs sm:text-sm text-gold-200/90">
            متابعة أعياد ميلاد المخدومين وأسرة الخدام لافتقادهم وإدخال البهجة لقلوبهم
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="bg-white/10 backdrop-blur-xs border border-white/20 px-3.5 py-1.5 rounded-2xl text-center">
            <span className="text-[10px] text-gold-200 block">اليوم</span>
            <span className="text-base font-extrabold text-white">{todayBirthdays.length} 🎈</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs border border-white/20 px-3.5 py-1.5 rounded-2xl text-center">
            <span className="text-[10px] text-gold-200 block">خلال ٣ أيام</span>
            <span className="text-base font-extrabold text-white">{upcoming3Days.length} ⏳</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Main Role Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'all' ? 'bg-maroon-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({processedUsers.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('students')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'students' ? 'bg-maroon-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              المخدومين ({processedUsers.filter(u => u.role === 'student').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('servants')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'servants' ? 'bg-maroon-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الخدام ({processedUsers.filter(u => u.role !== 'student').length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو التليفون..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 pl-9 text-xs focus:outline-none focus:border-maroon-700"
            />
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          </div>
        </div>

        {/* Stage Filter if students selected */}
        {filterType === 'students' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500 font-bold shrink-0 ml-1">المرحلة:</span>
            {['all', 'first', 'second', 'third', 'elisha'].map((stg) => (
              <button
                key={stg}
                type="button"
                onClick={() => setStageFilter(stg)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                  stageFilter === stg
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {stg === 'all' ? 'جميع المراحل' : getGradeTitle(stg)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 1. TODAY'S BIRTHDAYS (Prominent Celebration Card) */}
      {todayBirthdays.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm sm:text-base">
            <Sparkles className="w-5 h-5 text-amber-600 animate-spin" />
            <span>🎉 أعياد ميلاد اليوم (عيد ميلاد سعيد!)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {todayBirthdays.map((u) => (
              <div 
                key={u.id}
                onClick={() => onSelectStudent && onSelectStudent(u)}
                className="bg-white border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-2xs hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 border border-amber-300">
                    {u.photoUrl ? (
                      <img src={u.photoUrl} alt={u.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{u.fullName ? u.fullName[0] : '🎂'}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">{u.fullName}</h4>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {getRoleBadge(u)}
                      {u.turningAge && (
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded">
                          يتم {u.turningAge} سنة 🎈
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {u.phone && (
                    <>
                      <a
                        href={`https://wa.me/20${u.phone.replace(/^0+/, '')}?text=${encodeURIComponent(`كل سنة وأنت طيب يا ${u.fullName}، سنة حلوة ومباركة مع بابا يسوع وعيد ميلاد سعيد! 🎂🎉 أسرة خدمة القديس يوحنا المعمدان`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 flex items-center justify-center transition-all shadow-2xs"
                        title="إرسال تهنئة عبر واتساب 💬"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                      <a
                        href={`tel:${u.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 flex items-center justify-center transition-all shadow-2xs"
                        title="اتصال هاتف 📞"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </>
                  )}
                  <span className="bg-amber-500 text-white text-xs font-black px-2.5 py-1 rounded-xl shadow-2xs inline-block animate-pulse">
                    اليوم 🎂
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. UPCOMING WITHIN 3 DAYS (URGENT REMINDERS) */}
      {upcoming3Days.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-800">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>قادمة خلال ٣ أيام (تنبيه مسبق للخدام):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {upcoming3Days.map((u) => (
              <div 
                key={u.id}
                onClick={() => onSelectStudent && onSelectStudent(u)}
                className="bg-white border border-amber-200/80 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-2xs hover:border-maroon-700 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-base overflow-hidden shrink-0 border border-slate-200">
                    {u.photoUrl ? (
                      <img src={u.photoUrl} alt={u.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{u.fullName ? u.fullName[0] : 'U'}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">{u.fullName}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {getRoleBadge(u)}
                      <span className="text-[11px] text-slate-500 font-mono" dir="ltr">
                        {u.bDay}/{u.bMonth}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {u.phone && (
                    <>
                      <a
                        href={`https://wa.me/20${u.phone.replace(/^0+/, '')}?text=${encodeURIComponent(`كل سنة وأنت طيب يا ${u.fullName}، سنة حلوة ومباركة مع بابا يسوع وعيد ميلاد سعيد مقدماً! 🎂🎉 أسرة خدمة القديس يوحنا المعمدان`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 flex items-center justify-center transition-all shadow-2xs"
                        title="إرسال تهنئة عبر واتساب 💬"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                      <a
                        href={`tel:${u.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 flex items-center justify-center transition-all shadow-2xs"
                        title="اتصال هاتف 📞"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </>
                  )}
                  <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-2 py-1 rounded-xl">
                    بعد {u.daysRemaining === 1 ? 'يوم' : u.daysRemaining === 2 ? 'يومين' : `${u.daysRemaining} أيام`} ⏳
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. REST OF UPCOMING BIRTHDAYS */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-700">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span>باقي أعياد الميلاد القادمة ({remainingBirthdays.length}):</span>
        </div>

        {remainingBirthdays.length === 0 && todayBirthdays.length === 0 && upcoming3Days.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-400 space-y-2">
            <Cake className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold">لا توجد تواريخ ميلاد مسجلة مطابقة للبحث حالياً.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-2xs">
            {remainingBirthdays.map((u) => (
              <div 
                key={u.id}
                onClick={() => onSelectStudent && onSelectStudent(u)}
                className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 border border-slate-200">
                    {u.photoUrl ? (
                      <img src={u.photoUrl} alt={u.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{u.fullName ? u.fullName[0] : 'U'}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-bold text-xs text-slate-900 truncate">{u.fullName}</h5>
                    <div className="flex items-center gap-2 mt-0.5">
                      {getRoleBadge(u)}
                      <span className="text-[10px] text-slate-400 font-mono" dir="ltr">{u.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {u.phone && (
                    <div className="flex items-center gap-1">
                      <a
                        href={`https://wa.me/20${u.phone.replace(/^0+/, '')}?text=${encodeURIComponent(`كل سنة وأنت طيب يا ${u.fullName}، سنة حلوة ومباركة مع بابا يسوع وعيد ميلاد سعيد مقدماً! 🎂🎉 أسرة خدمة القديس يوحنا المعمدان`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 flex items-center justify-center transition-all shadow-2xs"
                        title="إرسال تهنئة عبر واتساب 💬"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`tel:${u.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 flex items-center justify-center transition-all shadow-2xs"
                        title="اتصال هاتف 📞"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                  <span className="text-xs font-bold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded-lg">
                    {u.bDay} / {u.bMonth}
                  </span>
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    بعد {u.daysRemaining} يوم
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
