import React, { useState } from 'react';
import { 
  ShieldCheck, Users, QrCode, BookOpen, CheckCircle, Clock, 
  Printer, UserCheck, Search, Award, FileCheck, Edit3, Save, Check, 
  FileText, Plus, Download, UploadCloud, ChevronLeft, Trash2, FolderPlus
} from 'lucide-react';

export default function ServantDashboard({ user }) {
  // Main Navigation Hubs for Servant
  const [mainTab, setMainTab] = useState('subjects_hub'); // 'subjects_hub', 'exams_bank_hub', 'analytics_hub', 'attendance_qr'
  const [selectedGrade, setSelectedGrade] = useState('first'); // 'first', 'second', 'third', 'elisha'

  // Dynamic QR
  const todayStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const [qrCodeData, setQrCodeData] = useState(`STJOHN-ATTENDANCE-${new Date().toISOString().split('T')[0]}`);

  // Subjects Managed by Grade
  const [subjectsByGrade, setSubjectsByGrade] = useState({
    first: [
      {
        id: 'sub-f1',
        name: 'مقدمة في العهد القديم',
        teacher: 'أ. بيشوي نعيم',
        references: [
          { id: 'rf-1', title: 'ملخص أسفار الشريعة والأنبياء', size: '2.1 MB', date: '2026-09-08' },
          { id: 'rf-2', title: 'خريطة رحلة الخروج وأسئلة مراجعة', size: '1.5 MB', date: '2026-09-15' }
        ]
      },
      {
        id: 'sub-f2',
        name: 'العقيدة المسيحية الأساسية',
        teacher: 'د. ميشيل سامي',
        references: [
          { id: 'rf-3', title: 'مذكرة الثالوث القدوس وسر التجسد', size: '3.4 MB', date: '2026-09-10' }
        ]
      }
    ],
    second: [
      {
        id: 'sub-s1',
        name: 'تاريخ الكنيسة والمجامع',
        teacher: 'أ. بيشوي نعيم',
        references: [
          { id: 'rf-4', title: 'مجمع نيقية والرد على الأريوسية', size: '3.0 MB', date: '2026-09-12' },
          { id: 'rf-5', title: 'عصر الاستشهاد وتاريخ الرهبنة', size: '2.5 MB', date: '2026-09-19' }
        ]
      },
      {
        id: 'sub-s2',
        name: 'طقوس الكنيسة القبطية',
        teacher: 'أ. أنطون يوسف',
        references: [
          { id: 'rf-6', title: 'طقس القداس الإلهي وصلوات التسبحة', size: '4.2 MB', date: '2026-09-14' }
        ]
      }
    ],
    third: [
      {
        id: 'sub-t1',
        name: 'دراسات في العهد الجديد والرسائل',
        teacher: 'م. مينا عاطف',
        references: [
          { id: 'rf-7', title: 'شرح وتأملات في رسالة رومية', size: '3.8 MB', date: '2026-09-11' }
        ]
      }
    ],
    elisha: [
      {
        id: 'sub-e1',
        name: 'مهارات إعداد الخادم والقيادة',
        teacher: 'أمين الخدمة',
        references: [
          { id: 'rf-8', title: 'فن إلقاء الدرس وسيكولوجية المراهقين', size: '4.5 MB', date: '2026-09-05' },
          { id: 'rf-9', title: 'أسس الافتقاد الرعوي والعمل الميداني', size: '2.9 MB', date: '2026-09-18' }
        ]
      },
      {
        id: 'sub-e2',
        name: 'اللاهوت المقارن والأبائيات',
        teacher: 'د. ميشيل سامي',
        references: [
          { id: 'rf-10', title: 'كتابات الآباء الرسوليين والدفاعيات', size: '3.6 MB', date: '2026-09-16' }
        ]
      }
    ]
  });

  // Selected Subject for inside view
  const [activeSubject, setActiveSubject] = useState(null);

  // Forms
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectTeacher, setNewSubjectTeacher] = useState('');

  const [showAddRefModal, setShowAddRefModal] = useState(false);
  const [newRefTitle, setNewRefTitle] = useState('');

  // Handle Add Subject
  const handleAddSubject = (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    const newSub = {
      id: `sub-${Date.now()}`,
      name: newSubjectName.trim(),
      teacher: newSubjectTeacher.trim() || user.fullName || 'خادم المادة',
      references: []
    };

    setSubjectsByGrade(prev => ({
      ...prev,
      [selectedGrade]: [...(prev[selectedGrade] || []), newSub]
    }));

    setNewSubjectName('');
    setNewSubjectTeacher('');
    setShowAddSubjectModal(false);
  };

  // Handle Add Reference inside Subject
  const handleAddReference = (e) => {
    e.preventDefault();
    if (!newRefTitle.trim() || !activeSubject) return;

    const newRef = {
      id: `rf-${Date.now()}`,
      title: newRefTitle.trim(),
      size: '2.5 MB',
      date: new Date().toISOString().split('T')[0]
    };

    setSubjectsByGrade(prev => {
      const currentList = prev[selectedGrade] || [];
      const updatedList = currentList.map(s => {
        if (s.id === activeSubject.id) {
          const updatedRefs = [newRef, ...s.references];
          setActiveSubject({ ...s, references: updatedRefs });
          return { ...s, references: updatedRefs };
        }
        return s;
      });
      return { ...prev, [selectedGrade]: updatedList };
    });

    setNewRefTitle('');
    setShowAddRefModal(false);
  };

  const getGradeTitle = (g) => {
    const titles = {
      first: 'سنة أولى ثانوي',
      second: 'سنة ثانية ثانوي',
      third: 'سنة ثالثة ثانوي',
      elisha: 'فصل أليشع (إعداد خدام)'
    };
    return titles[g] || g;
  };

  const currentGradeSubjects = subjectsByGrade[selectedGrade] || [];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12 text-right">
      {/* Servant Profile Card (Light Mode) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 w-full sm:w-auto">
          <div className="w-13 h-13 rounded-2xl bg-maroon-800 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-xs">
            <ShieldCheck className="w-7 h-7 text-gold-300" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">{user.fullName || 'أ. بيشوي نعيم'}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span className="bg-maroon-50 text-maroon-900 border border-maroon-200 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                لوحة الخدام
              </span>
              <span>النطاق: {user.servantScope === 'all' ? 'أمين خدمة عام' : getGradeTitle(user.servantScope)}</span>
            </div>
          </div>
        </div>

        {/* Grade Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto">
          {['first', 'second', 'third', 'elisha'].map((g) => (
            <button
              key={g}
              onClick={() => { setSelectedGrade(g); setActiveSubject(null); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedGrade === g
                  ? 'bg-white text-maroon-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {getGradeTitle(g)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 flex items-center justify-around text-xs font-bold sticky top-16 z-30 shadow-xs overflow-x-auto">
        <button
          onClick={() => { setMainTab('subjects_hub'); setActiveSubject(null); }}
          className={`py-2 px-3 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
            mainTab === 'subjects_hub' ? 'bg-maroon-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>المواد والمناهج</span>
        </button>

        <button
          onClick={() => setMainTab('exams_bank_hub')}
          className={`py-2 px-3 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
            mainTab === 'exams_bank_hub' ? 'bg-maroon-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>بنك الأسئلة والامتحانات</span>
        </button>

        <button
          onClick={() => setMainTab('analytics_hub')}
          className={`py-2 px-3 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
            mainTab === 'analytics_hub' ? 'bg-maroon-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>الإحصائيات والأوائل</span>
        </button>

        <button
          onClick={() => setMainTab('attendance_qr')}
          className={`py-2 px-3 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
            mainTab === 'attendance_qr' ? 'bg-maroon-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>كود الحضور (QR)</span>
        </button>
      </div>

      {/* 1. Subjects & Curriculum Management Hub */}
      {mainTab === 'subjects_hub' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          {!activeSubject ? (
            // All Subjects in this Grade
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    مواد ومناهج: {getGradeTitle(selectedGrade)}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    إدارة المواد الدراسية ورفع المراجع والمادة العلمية لكل مادة للمخدومين.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddSubjectModal(true)}
                  className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة مادة جديدة</span>
                </button>
              </div>

              {/* Add Subject Modal / Form */}
              {showAddSubjectModal && (
                <form onSubmit={handleAddSubject} className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl space-y-3">
                  <h4 className="font-extrabold text-xs text-maroon-900">إضافة مادة دراسية جديدة لـ ({getGradeTitle(selectedGrade)})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم المادة</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: طقوس الكنيسة، تاريخ كنيسة، عقيدة"
                        value={newSubjectName}
                        onChange={(e) => setNewSubjectName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">خادم المادة المسئول</label>
                      <input
                        type="text"
                        placeholder="اسم الخادم (اختياري)"
                        value={newSubjectTeacher}
                        onChange={(e) => setNewSubjectTeacher(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddSubjectModal(false)}
                      className="bg-white border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-xl font-bold"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl"
                    >
                      حفظ المادة
                    </button>
                  </div>
                </form>
              )}

              {/* Subjects Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentGradeSubjects.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => setActiveSubject(sub)}
                    className="bg-slate-50 border border-slate-200 hover:border-maroon-700 p-5 rounded-2xl cursor-pointer transition-all hover:shadow-md group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] bg-maroon-100 text-maroon-900 font-extrabold px-2.5 py-0.5 rounded-full">
                          {sub.teacher}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">{sub.references.length} مراجع مرفوعة</span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-base group-hover:text-maroon-800 transition-colors mb-1">
                        {sub.name}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed mb-4">
                        اضغط للدخول ورفع المراجع، المذكرات العلمية، ومتابعة المحتوى.
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-maroon-800 pt-3 border-t border-slate-200/60">
                      <span>إدارة مراجع المادة ({sub.references.length})</span>
                      <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Inside Subject: Manage References
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs text-slate-400 font-bold">المادة الحالية</span>
                  <h4 className="font-extrabold text-slate-900 text-lg">{activeSubject.name}</h4>
                  <span className="text-xs text-maroon-800 font-semibold">المسئول: {activeSubject.teacher}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddRefModal(true)}
                    className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>إضافة مرجع / ملخص</span>
                  </button>
                  <button
                    onClick={() => setActiveSubject(null)}
                    className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200"
                  >
                    ← العودة لقائمة المواد
                  </button>
                </div>
              </div>

              {/* Add Reference Form */}
              {showAddRefModal && (
                <form onSubmit={handleAddReference} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                  <h5 className="font-extrabold text-xs text-slate-800">إضافة مرجع أو مذكرة لمادة ({activeSubject.name})</h5>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان المرجع / الملخص</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: مذكرة شرح الدرس الأول + أسئلة تطبيقية"
                      value={newRefTitle}
                      onChange={(e) => setNewRefTitle(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddRefModal(false)}
                      className="bg-white border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-xl font-bold"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 rounded-xl flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>تأكيد الإضافة وإتاحته للمخدومين</span>
                    </button>
                  </div>
                </form>
              )}

              {/* References List */}
              <div className="space-y-3">
                {activeSubject.references.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    لم يتم إضافة مراجع لهذه المادة بعد. اضغط على زر "إضافة مرجع / ملخص" بالأعلى لإتاحة أول مادة علمية.
                  </div>
                ) : (
                  activeSubject.references.map((rf) => (
                    <div
                      key={rf.id}
                      className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <h5 className="font-extrabold text-slate-900 text-sm">{rf.title}</h5>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          ملف PDF • {rf.size} • تاريخ الإضافة: {rf.date}
                        </span>
                      </div>
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2.5 py-1 rounded-lg text-[10px]">
                        متاح للمخدومين ✓
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Placeholders for Stage 4 & 5 to be filled in next steps */}
      {mainTab === 'exams_bank_hub' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center space-y-2">
          <FileText className="w-10 h-10 text-maroon-800 mx-auto" />
          <h4 className="font-extrabold text-slate-900 text-base">بنك الأسئلة والامتحانات المتقدم</h4>
          <p className="text-xs text-slate-500">جاري تفعيله في المرحلة 4 (إضافة أسئلة بالصعوبة والأنواع وتكليف الامتحان).</p>
        </div>
      )}

      {mainTab === 'analytics_hub' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center space-y-2">
          <Award className="w-10 h-10 text-maroon-800 mx-auto" />
          <h4 className="font-extrabold text-slate-900 text-base">الإحصائيات والأوائل والعلامات الحمراء</h4>
          <p className="text-xs text-slate-500">جاري تفعيله في المرحلة 5 (لوحة الشرف والعلامات الحمراء وكومنتات الخدام).</p>
        </div>
      )}

      {/* 4. Tab: Attendance QR */}
      {mainTab === 'attendance_qr' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="mb-4">
              <span className="text-[11px] bg-maroon-50 text-maroon-900 border border-maroon-200 font-bold px-3 py-1 rounded-full">
                كود حضور خدمة اليوم
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-2">{todayStr}</h3>
              <p className="text-xs text-slate-500">ساري من 10:30 صباحاً حتى 02:00 ظهراً</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
              <div className="w-52 h-52 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-2">
                <QrCode className="w-40 h-40 text-slate-900" />
              </div>
              <div className="mt-2 text-slate-600 text-[11px] font-mono font-bold" dir="ltr">
                {qrCodeData}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => setQrCodeData(`STJOHN-ATTENDANCE-${new Date().toISOString().split('T')[0]}-${Math.floor(1000 + Math.random() * 9000)}`)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-3.5 rounded-xl transition-all"
              >
                تحديث الكود
              </button>
              <button
                onClick={() => window.print()}
                className="bg-maroon-800 hover:bg-maroon-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 shadow"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة للقاعة</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm text-right flex flex-col justify-between text-xs">
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-maroon-800" />
                دليل الحضور السريع
              </h4>
              <p className="text-slate-600 leading-relaxed">
                اعرض هذا الكود عند مدخل قاعة الخدمة. يقوم المخدومون بمسحه عبر كاميرا هواتفهم المدمجة في حساباتهم وتسجيل الحضور وإضافة النقاط مباشرة.
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-slate-500 mt-4">
              النافذة المعتمدة: 10:30 ص إلى 02:00 م.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
