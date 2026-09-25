import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Users, QrCode, BookOpen, CheckCircle, Clock, 
  Printer, UserCheck, AlertCircle, Search, Filter, Phone, Award
} from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

export default function ServantDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('attendance_qr'); // attendance_qr, students, approvals
  const [selectedGrade, setSelectedGrade] = useState('all'); // all, first, second, third, elisha
  
  // Dynamic QR state for today
  const todayStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const [qrCodeData, setQrCodeData] = useState(`STJOHN-ATTENDANCE-${new Date().toISOString().split('T')[0]}`);
  const [qrGeneratedTime, setQrGeneratedTime] = useState(new Date().toLocaleTimeString('ar-EG'));

  // Students state
  const [students, setStudents] = useState([
    { id: '1', fullName: 'مينا كمال عزيز', phone: '01223456781', grade: 'second', attendanceRate: 95, points: 140, lastSeen: 'الجمعة الماضية', status: 'active' },
    { id: '2', fullName: 'كيرلس عماد صبحي', phone: '01012345672', grade: 'first', attendanceRate: 88, points: 110, lastSeen: 'اليوم', status: 'active' },
    { id: '3', fullName: 'توماس رأفت شحاتة', phone: '01123456783', grade: 'third', attendanceRate: 70, points: 85, lastSeen: 'منذ أسبوعين', status: 'active' },
    { id: '4', fullName: 'ديفيد مجدي لمعي', phone: '01234567894', grade: 'elisha', attendanceRate: 100, points: 210, lastSeen: 'اليوم', status: 'active' },
    { id: '5', fullName: 'فادي نبيل رمزي', phone: '01098765435', grade: 'elisha', attendanceRate: 92, points: 180, lastSeen: 'الجمعة الماضية', status: 'active' },
  ]);

  const [searchQuery, setSearchQuery] = useState('');

  // Approvals State
  const [pendingApprovals, setPendingApprovals] = useState([
    { id: 'p1', fullName: 'مارك عاطف فهيم', phone: '01287654321', grade: 'first', date: 'أمس', type: 'مخدوم جديد' },
    { id: 'p2', fullName: 'أبانوب رفعت موريس', phone: '01198765432', grade: 'second', date: 'اليوم', type: 'مخدوم جديد' }
  ]);

  const handleApprove = (id) => {
    setPendingApprovals(prev => prev.filter(p => p.id !== id));
  };

  const handleRefreshQR = () => {
    const newCode = `STJOHN-ATTENDANCE-${new Date().toISOString().split('T')[0]}-${Math.floor(1000 + Math.random() * 9000)}`;
    setQrCodeData(newCode);
    setQrGeneratedTime(new Date().toLocaleTimeString('ar-EG'));
  };

  const getGradeTitle = (g) => {
    const titles = {
      all: 'جميع الفصول',
      first: 'سنة أولى ثانوي',
      second: 'سنة ثانية ثانوي',
      third: 'سنة ثالثة ثانوي',
      elisha: 'فصل أليشع (إعداد خدام)'
    };
    return titles[g] || g;
  };

  const filteredStudents = students.filter(s => {
    const matchesGrade = selectedGrade === 'all' || s.grade === selectedGrade;
    const matchesSearch = s.fullName.includes(searchQuery) || s.phone.includes(searchQuery);
    return matchesGrade && matchesSearch;
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Servant Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-right w-full sm:w-auto">
          <div className="w-12 h-12 rounded-xl bg-maroon-900/80 border border-gold-400/40 text-gold-300 flex items-center justify-center font-bold text-lg shrink-0">
            <ShieldCheck className="w-6 h-6 text-gold-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{user.fullName || 'أ. بيشوي نعيم'}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="bg-gold-500/20 text-gold-300 border border-gold-400/30 px-2 py-0.5 rounded font-semibold">
                لوحة تحكم الخادم
              </span>
              <span>النطاق: {user.servantScope === 'all' ? 'أمين خدمة عام' : getGradeTitle(user.servantScope)}</span>
            </div>
          </div>
        </div>

        {/* Global Stats */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
          <div className="bg-slate-950/60 border border-slate-800 px-3.5 py-2 rounded-xl text-center min-w-[80px]">
            <span className="text-[11px] text-slate-400 block">المخدومين</span>
            <span className="text-sm font-bold text-white">{students.length} مخدوم</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 px-3.5 py-2 rounded-xl text-center min-w-[80px]">
            <span className="text-[11px] text-slate-400 block">فصل أليشع</span>
            <span className="text-sm font-bold text-gold-400">
              {students.filter(s => s.grade === 'elisha').length} طالب
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 px-3.5 py-2 rounded-xl text-center min-w-[80px]">
            <span className="text-[11px] text-slate-400 block">طلبات معلقة</span>
            <span className="text-sm font-bold text-amber-400">{pendingApprovals.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('attendance_qr')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'attendance_qr'
              ? 'border-gold-400 text-gold-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>كود الحضور (QR الخدمة)</span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'students'
              ? 'border-gold-400 text-gold-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>قوائم الفصول والمخدومين</span>
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition-colors relative ${
            activeTab === 'approvals'
              ? 'border-gold-400 text-gold-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>طلبات الانضمام</span>
          {pendingApprovals.length > 0 && (
            <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {pendingApprovals.length}
            </span>
          )}
        </button>
      </div>

      {/* 1. QR Attendance Generator Tab */}
      {activeTab === 'attendance_qr' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* QR Display Card */}
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center text-center">
            <div className="mb-4">
              <span className="text-xs bg-maroon-900/60 border border-gold-400/30 text-gold-300 px-3 py-1 rounded-full font-semibold">
                كود حضور خدمة اليوم
              </span>
              <h3 className="text-lg font-bold text-white mt-2">{todayStr}</h3>
              <p className="text-xs text-slate-400">ساري من 10:30 صباحاً حتى 02:00 ظهراً</p>
            </div>

            {/* Generated QR Viewport */}
            <div className="bg-white p-6 rounded-2xl shadow-2xl border-4 border-gold-400/60 flex flex-col items-center justify-center">
              <div className="w-56 h-56 bg-slate-100 border-2 border-slate-300 rounded-xl flex flex-col items-center justify-center p-3 relative overflow-hidden">
                <QrCode className="w-44 h-44 text-slate-900" />
                <div className="absolute inset-0 bg-gold-500/5 pointer-events-none"></div>
              </div>
              <div className="mt-3 text-slate-700 text-xs font-mono font-bold" dir="ltr">
                {qrCodeData}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
              <button
                onClick={handleRefreshQR}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold py-2.5 px-4 rounded-xl transition-all"
              >
                تحديث الكود (آخر تحديث: {qrGeneratedTime})
              </button>
              <button
                onClick={() => window.print()}
                className="bg-gold-500 hover:bg-gold-400 text-maroon-950 text-xs font-bold py-2.5 px-4 rounded-xl transition-all flex items-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الكود للقاعة</span>
              </button>
            </div>
          </div>

          {/* Quick Attendance Instructions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-right flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gold-400" />
                تعليمات الحضور الذكي
              </h4>
              <ul className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-gold-400 font-bold">•</span>
                  <span>يقوم الخادم بعرض هذه الشاشة على هاتفه عند باب القاعة أو طباعتها وتعليقها.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold-400 font-bold">•</span>
                  <span>يفتح المخدوم كاميرا حسابه ويمسح الكود لتسجيل حضوره وإضافة نقاطه تلقائياً.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold-400 font-bold">•</span>
                  <span>النافذة الزمنية محددة بدقة من 10:30 صباحاً حتى 02:00 ظهراً لمنع التسجيل المسبق أو المتأخر.</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 mt-6 text-xs text-slate-400">
              💡 نصيحة للخدمة: يمكنك تحديث الكود كل ساعة لمنع تصويره وتبادله بين الشباب خارج الكنيسة.
            </div>
          </div>
        </div>
      )}

      {/* 2. Students List by Grade Tab */}
      {activeTab === 'students' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
              {['all', 'first', 'second', 'third', 'elisha'].map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGrade(g)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all ${
                    selectedGrade === g
                      ? 'bg-gold-500 text-maroon-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {getGradeTitle(g)}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="بحث بالاسم أو التليفون..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 pl-8 text-xs text-white focus:outline-none focus:border-gold-400"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 px-4">اسم المخدوم</th>
                  <th className="py-3 px-4">المرحلة</th>
                  <th className="py-3 px-4">رقم الهاتف</th>
                  <th className="py-3 px-4">نسبة الحضور</th>
                  <th className="py-3 px-4">النقاط</th>
                  <th className="py-3 px-4">آخر ظهور</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{s.fullName}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        s.grade === 'elisha'
                          ? 'bg-maroon-900 text-gold-300 border border-gold-400/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {getGradeTitle(s.grade)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono" dir="ltr">{s.phone}</td>
                    <td className="py-3 px-4">
                      <span className={`font-bold ${s.attendanceRate >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {s.attendanceRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gold-400 font-bold">{s.points}</td>
                    <td className="py-3 px-4 text-slate-400">{s.lastSeen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Approvals Tab */}
      {activeTab === 'approvals' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-white text-base">طلبات الانضمام الجديدة للمراجعة</h3>
          
          {pendingApprovals.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              لا توجد طلبات انضمام جديدة معلقة حالياً.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((req) => (
                <div
                  key={req.id}
                  className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="text-right">
                    <div className="font-bold text-white text-sm">{req.fullName}</div>
                    <div className="text-slate-400 mt-1 flex items-center gap-2">
                      <span>الهاتف: {req.phone}</span>
                      <span>•</span>
                      <span>الصف: {getGradeTitle(req.grade)}</span>
                      <span>•</span>
                      <span>تاريخ الطلب: {req.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>قبول وتسكين</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
