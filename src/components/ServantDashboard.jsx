import React, { useState } from 'react';
import { 
  ShieldCheck, Users, QrCode, BookOpen, CheckCircle, Clock, 
  Printer, UserCheck, Search, Award, FileCheck, Edit3, Save, Check, 
  FileText, Plus, Download, UploadCloud, Calendar
} from 'lucide-react';

export default function ServantDashboard({ user }) {
  // Main Hubs: attendance, students, curriculum, grading
  const [mainTab, setMainTab] = useState('attendance_qr'); // attendance_qr, students_hub, curriculum_hub, exams_hub
  const [examSubTab, setExamSubTab] = useState('grading'); // grading, paper, create_exam
  const [selectedGrade, setSelectedGrade] = useState('all');
  
  // Dynamic QR
  const todayStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const [qrCodeData, setQrCodeData] = useState(`STJOHN-ATTENDANCE-${new Date().toISOString().split('T')[0]}`);
  const [qrGeneratedTime, setQrGeneratedTime] = useState(new Date().toLocaleTimeString('ar-EG'));

  // Students list
  const [students, setStudents] = useState([
    { id: '1', fullName: 'مينا كمال عزيز', phone: '01223456781', grade: 'second', attendanceRate: 95, points: 140, lastSeen: 'الجمعة الماضية', paperScore: 28 },
    { id: '2', fullName: 'كيرلس عماد صبحي', phone: '01012345672', grade: 'first', attendanceRate: 88, points: 110, lastSeen: 'اليوم', paperScore: 25 },
    { id: '3', fullName: 'توماس رأفت شحاتة', phone: '01123456783', grade: 'third', attendanceRate: 70, points: 85, lastSeen: 'منذ أسبوعين', paperScore: 19 },
    { id: '4', fullName: 'ديفيد مجدي لمعي', phone: '01234567894', grade: 'elisha', attendanceRate: 100, points: 210, lastSeen: 'اليوم', paperScore: 30 },
    { id: '5', fullName: 'فادي نبيل رمزي', phone: '01098765435', grade: 'elisha', attendanceRate: 92, points: 180, lastSeen: 'الجمعة الماضية', paperScore: 27 },
  ]);

  const [searchQuery, setSearchQuery] = useState('');

  // Curriculum Data by Grade
  const [curriculumList, setCurriculumList] = useState([
    {
      id: 'c1',
      grade: 'first',
      week: 'الأسبوع الأول',
      title: 'مقدمة في العهد القديم وأسفار الشريعة',
      fileType: 'PDF',
      fileSize: '2.4 MB',
      uploadDate: '2026-09-05'
    },
    {
      id: 'c2',
      grade: 'second',
      week: 'الأسبوع الثاني',
      title: 'عقيدة التجسد والفداء والرد على التساؤلات',
      fileType: 'PDF',
      fileSize: '3.1 MB',
      uploadDate: '2026-09-12'
    },
    {
      id: 'c3',
      grade: 'third',
      week: 'الأسبوع الثالث',
      title: 'سفر الرؤيا والرجاء المسيحي في الأوقات الصعبة',
      fileType: 'PDF',
      fileSize: '1.8 MB',
      uploadDate: '2026-09-19'
    },
    {
      id: 'c4',
      grade: 'elisha',
      week: 'محاضرة 1',
      title: 'سيكولوجية المخدوم في سن المراهقة وأساليب الإقناع',
      fileType: 'PDF',
      fileSize: '4.2 MB',
      uploadDate: '2026-09-08'
    },
    {
      id: 'c5',
      grade: 'elisha',
      week: 'محاضرة 2',
      title: 'إعداد وتحضير درس مدارس الأحد التفاعلي',
      fileType: 'PDF',
      fileSize: '3.5 MB',
      uploadDate: '2026-09-15'
    }
  ]);

  // Form for adding new curriculum
  const [newLesson, setNewLesson] = useState({ grade: 'first', week: '', title: '' });
  const [showAddLesson, setShowAddLesson] = useState(false);

  // Pending Approvals
  const [pendingApprovals, setPendingApprovals] = useState([
    { id: 'p1', fullName: 'مارك عاطف فهيم', phone: '01287654321', grade: 'first', date: 'أمس' },
    { id: 'p2', fullName: 'أبانوب رفعت موريس', phone: '01198765432', grade: 'second', date: 'اليوم' }
  ]);

  // Essay Grading Submissions
  const [pendingEssays, setPendingEssays] = useState([
    {
      id: 'sub-1',
      studentName: 'مينا كمال عزيز',
      grade: 'second',
      examTitle: 'امتحان العقيدة والطقس',
      questionText: 'اكتب باختصار عن أهمية قراءة الكتاب المقدس يومياً في حياة الشاب المسيحي.',
      studentAnswer: 'الكتاب المقدس هو غذاء الروح اليومي وصوت الله الحي لنا، يرشدنا في قراراتنا اليومية ويحمينا من الخطية ويعطينا سلاماً واستنارة في دراستنا وتعاملاتنا.',
      autoScore: 20,
      essayScore: '',
      status: 'pending'
    },
    {
      id: 'sub-2',
      studentName: 'ديفيد مجدي لمعي',
      grade: 'elisha',
      examTitle: 'اختبار مهارات إعداد الخادم',
      questionText: 'اذكر باختصار ثلاث صفات روحية وسلوكية يجب أن يتحلى بها خادم المسيح في التعامل مع المخدومين.',
      studentAnswer: '١. المحبة والقدوة في السلوك والكلام. ٢. الصلاة الدائمة من أجل المخدومين وافتقادهم. ٣. سعة الصدر والإنصات الجيد لمشاكلهم دون إدانة.',
      autoScore: 20,
      essayScore: '',
      status: 'pending'
    }
  ]);

  // Paper Scores
  const [paperScores, setPaperScores] = useState({ '1': 28, '2': 25, '3': 19, '4': 30, '5': 27 });
  const [paperSavedSuccess, setPaperSavedSuccess] = useState(false);

  const handleApprove = (id) => {
    setPendingApprovals(prev => prev.filter(p => p.id !== id));
  };

  const handleRefreshQR = () => {
    const newCode = `STJOHN-ATTENDANCE-${new Date().toISOString().split('T')[0]}-${Math.floor(1000 + Math.random() * 9000)}`;
    setQrCodeData(newCode);
    setQrGeneratedTime(new Date().toLocaleTimeString('ar-EG'));
  };

  const handleGradeEssay = (subId, score) => {
    setPendingEssays(prev => prev.map(item => {
      if (item.id === subId) {
        return { ...item, essayScore: score, status: 'graded' };
      }
      return item;
    }));
  };

  const handleSavePaperScores = () => {
    setPaperSavedSuccess(true);
    setTimeout(() => setPaperSavedSuccess(false), 3000);
  };

  const handleAddLessonSubmit = (e) => {
    e.preventDefault();
    if (!newLesson.title || !newLesson.week) return;

    setCurriculumList([
      {
        id: `c-${Date.now()}`,
        grade: newLesson.grade,
        week: newLesson.week,
        title: newLesson.title,
        fileType: 'PDF',
        fileSize: '2.5 MB',
        uploadDate: new Date().toISOString().split('T')[0]
      },
      ...curriculumList
    ]);

    setNewLesson({ grade: 'first', week: '', title: '' });
    setShowAddLesson(false);
  };

  const getGradeTitle = (g) => {
    const titles = {
      all: 'جميع الفصول',
      first: 'سنة أولى',
      second: 'سنة ثانية',
      third: 'سنة ثالثة',
      elisha: 'فصل أليشع (إعداد خدام)'
    };
    return titles[g] || g;
  };

  const filteredStudents = students.filter(s => {
    const matchesGrade = selectedGrade === 'all' || s.grade === selectedGrade;
    const matchesSearch = s.fullName.includes(searchQuery) || s.phone.includes(searchQuery);
    return matchesGrade && matchesSearch;
  });

  const filteredCurriculum = curriculumList.filter(c => selectedGrade === 'all' || c.grade === selectedGrade);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Servant Compact Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-right w-full sm:w-auto">
          <div className="w-12 h-12 rounded-xl bg-maroon-900/80 border border-gold-400/30 text-gold-300 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck className="w-6 h-6 text-gold-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">{user.fullName || 'أ. بيشوي نعيم'}</h2>
            <div className="text-xs text-slate-400 mt-0.5">
              <span>لوحة الخدام • {user.servantScope === 'all' ? 'أمين خدمة عام' : getGradeTitle(user.servantScope)}</span>
            </div>
          </div>
        </div>

        {/* Action Badges */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 block">المخدومين</span>
            <span className="text-xs font-bold text-white">{students.length}</span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 block">فصل أليشع</span>
            <span className="text-xs font-bold text-gold-400">{students.filter(s => s.grade === 'elisha').length}</span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 block">تصحيح معلق</span>
            <span className="text-xs font-bold text-amber-400">{pendingEssays.filter(e => e.status === 'pending').length}</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Hub */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 flex items-center justify-around text-xs font-bold sticky top-16 z-30 backdrop-blur-md overflow-x-auto">
        <button
          onClick={() => setMainTab('attendance_qr')}
          className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shrink-0 ${
            mainTab === 'attendance_qr' ? 'bg-gold-500 text-maroon-950 shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>كود الحضور (QR)</span>
        </button>

        <button
          onClick={() => setMainTab('curriculum_hub')}
          className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shrink-0 ${
            mainTab === 'curriculum_hub' ? 'bg-gold-500 text-maroon-950 shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>المناهج السنوية</span>
        </button>

        <button
          onClick={() => setMainTab('exams_hub')}
          className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shrink-0 relative ${
            mainTab === 'exams_hub' ? 'bg-gold-500 text-maroon-950 shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>الامتحانات والتقييم</span>
          {pendingEssays.filter(e => e.status === 'pending').length > 0 && (
            <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
          )}
        </button>

        <button
          onClick={() => setMainTab('students_hub')}
          className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shrink-0 relative ${
            mainTab === 'students_hub' ? 'bg-gold-500 text-maroon-950 shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>المخدومين</span>
          {pendingApprovals.length > 0 && (
            <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
          )}
        </button>
      </div>

      {/* 1. Tab: Attendance QR */}
      {mainTab === 'attendance_qr' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center text-center">
            <div className="mb-4">
              <span className="text-[11px] bg-maroon-900/60 border border-gold-400/30 text-gold-300 px-3 py-1 rounded-full font-semibold">
                كود الحضور المعتمد لليوم
              </span>
              <h3 className="text-base font-bold text-white mt-2">{todayStr}</h3>
              <p className="text-xs text-slate-400">ساري من 10:30 صباحاً حتى 02:00 ظهراً</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-xl border-4 border-gold-400/50 flex flex-col items-center justify-center">
              <div className="w-52 h-52 bg-slate-100 border border-slate-300 rounded-xl flex flex-col items-center justify-center p-2">
                <QrCode className="w-40 h-40 text-slate-900" />
              </div>
              <div className="mt-2 text-slate-700 text-[11px] font-mono font-bold" dir="ltr">
                {qrCodeData}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={handleRefreshQR}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold py-2 px-3.5 rounded-xl transition-all"
              >
                تحديث الكود
              </button>
              <button
                onClick={() => window.print()}
                className="bg-gold-500 hover:bg-gold-400 text-maroon-950 text-xs font-bold py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 shadow"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة للقاعة</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-right flex flex-col justify-between text-xs">
            <div>
              <h4 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gold-400" />
                دليل الحضور السريع
              </h4>
              <p className="text-slate-300 leading-relaxed">
                اعرض هذا الكود عند مدخل قاعة الخدمة. يقوم المخدومون بمسحه عبر كاميرا هواتفهم المدمجة في حساباتهم وتسجيل الحضور وإضافة النقاط مباشرة.
              </p>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-slate-400 mt-4">
              النافذة المعتمدة: 10:30 ص إلى 02:00 م.
            </div>
          </div>
        </div>
      )}

      {/* 2. Tab: Curriculum Hub (المناهج السنوية) */}
      {mainTab === 'curriculum_hub' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 text-right">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-white text-base">إدارة المناهج والخطط السنوية</h3>
              <p className="text-xs text-slate-400 mt-0.5">رفع وتحديث ملازم ومذكرات الدروس وتوزيع المنهج لكل مرحلة وفصل أليشع.</p>
            </div>
            <button
              onClick={() => setShowAddLesson(!showAddLesson)}
              className="bg-gold-500 hover:bg-gold-400 text-maroon-950 font-bold text-xs py-2 px-4 rounded-xl transition-all shadow flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة درس / ملزمة جديدة</span>
            </button>
          </div>

          {/* Add Lesson Modal/Inline Form */}
          {showAddLesson && (
            <form onSubmit={handleAddLessonSubmit} className="bg-slate-950/80 border border-gold-500/30 p-4 rounded-2xl space-y-3">
              <h4 className="font-bold text-xs text-gold-300">بيانات الدرس أو المذكرة الجديدة</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">المرحلة الدراسية</label>
                  <select
                    value={newLesson.grade}
                    onChange={(e) => setNewLesson({ ...newLesson, grade: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="first">سنة أولى ثانوي</option>
                    <option value="second">سنة ثانية ثانوي</option>
                    <option value="third">سنة ثالثة ثانوي</option>
                    <option value="elisha">فصل أليشع (إعداد خدام)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">الأسبوع / المحاضرة</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: الأسبوع الرابع"
                    value={newLesson.week}
                    onChange={(e) => setNewLesson({ ...newLesson, week: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">عنوان الدرس</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: سر المعمودية في الكنيسة الأولى"
                    value={newLesson.title}
                    onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLesson(false)}
                  className="bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 rounded-lg flex items-center gap-1"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>حفظ وإتاحة للمخدومين</span>
                </button>
              </div>
            </form>
          )}

          {/* Grade Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {['all', 'first', 'second', 'third', 'elisha'].map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all ${
                  selectedGrade === g ? 'bg-gold-500 text-maroon-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {getGradeTitle(g)}
              </button>
            ))}
          </div>

          {/* Curriculum Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCurriculum.map((item) => (
              <div
                key={item.id}
                className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-maroon-900 text-gold-300 text-[10px] font-bold px-2 py-0.5 rounded">
                      {getGradeTitle(item.grade)}
                    </span>
                    <span className="text-slate-400 text-[11px]">{item.week}</span>
                  </div>
                  <h4 className="font-bold text-white text-sm">{item.title}</h4>
                  <div className="text-[11px] text-slate-500">
                    ملف {item.fileType} • {item.fileSize} • تاريخ النشر: {item.uploadDate}
                  </div>
                </div>

                <button
                  onClick={() => alert(`جاري تنزيل ملزمة: ${item.title}`)}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-gold-300 rounded-xl transition-colors shrink-0"
                  title="تحميل الملف"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Tab: Unified Exams & Grading Hub */}
      {mainTab === 'exams_hub' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5 text-right">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <button
              onClick={() => setExamSubTab('grading')}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                examSubTab === 'grading' ? 'bg-gold-500 text-maroon-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              تصحيح الأسئلة المقالية ({pendingEssays.filter(e => e.status === 'pending').length})
            </button>
            <button
              onClick={() => setExamSubTab('paper')}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                examSubTab === 'paper' ? 'bg-gold-500 text-maroon-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              رصد درجات الامتحانات الورقية
            </button>
          </div>

          {/* Subview 1: Essay Grading */}
          {examSubTab === 'grading' && (
            <div className="space-y-3">
              {pendingEssays.map((item) => (
                <div key={item.id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div>
                      <span className="font-bold text-white">{item.studentName}</span>
                      <span className="text-slate-400 text-[11px] mr-2">({getGradeTitle(item.grade)})</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      item.status === 'graded' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {item.status === 'graded' ? `تم التقدير (${item.essayScore}/10)` : 'بانتظار التقدير'}
                    </span>
                  </div>

                  <div>
                    <div className="text-gold-400 font-bold mb-1">السؤال: {item.questionText}</div>
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-200 leading-relaxed font-normal">
                      {item.studentAnswer}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <span className="text-slate-400 text-[11px]">تقدير الدرجة (من 10):</span>
                    <div className="flex items-center gap-1">
                      {[7, 8, 9, 10].map((score) => (
                        <button
                          key={score}
                          onClick={() => handleGradeEssay(item.id, score)}
                          className={`text-xs px-2 py-0.5 rounded font-bold transition-colors ${
                            item.essayScore === score ? 'bg-gold-500 text-maroon-950 shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Subview 2: Paper Exam Scoring */}
          {examSubTab === 'paper' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">رصد الدرجات الورقية (من 30 درجة):</span>
                <button
                  onClick={handleSavePaperScores}
                  className="bg-gold-500 hover:bg-gold-400 text-maroon-950 font-bold text-xs py-1.5 px-3.5 rounded-xl transition-all shadow flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ الدرجات</span>
                </button>
              </div>

              {paperSavedSuccess && (
                <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs p-2.5 rounded-xl flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تم حفظ درجات الامتحان الورقي بنجاح!</span>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="py-2 px-3">الاسم</th>
                      <th className="py-2 px-3">المرحلة</th>
                      <th className="py-2 px-3">الدرجة الورقية (من 30)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 font-bold text-white">{s.fullName}</td>
                        <td className="py-2 px-3">{getGradeTitle(s.grade)}</td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={paperScores[s.id] ?? s.paperScore}
                            onChange={(e) => setPaperScores({ ...paperScores, [s.id]: e.target.value })}
                            className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-center font-bold text-gold-400 focus:outline-none focus:border-gold-400"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Tab: Students Hub */}
      {mainTab === 'students_hub' && (
        <div className="space-y-6">
          {pendingApprovals.length > 0 && (
            <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 shadow-lg text-right">
              <h4 className="font-bold text-amber-300 text-xs sm:text-sm mb-3 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" />
                طلبات انضمام جديدة بانتظار الاعتماد ({pendingApprovals.length})
              </h4>
              <div className="space-y-2">
                {pendingApprovals.map((req) => (
                  <div key={req.id} className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white">{req.fullName}</span>
                      <span className="text-slate-400 mr-2 text-[11px]">({getGradeTitle(req.grade)}) • {req.phone}</span>
                    </div>
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1 px-3 rounded-lg text-xs"
                    >
                      قبول وتسكين
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                {['all', 'first', 'second', 'third', 'elisha'].map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGrade(g)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all ${
                      selectedGrade === g ? 'bg-gold-500 text-maroon-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {getGradeTitle(g)}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-60">
                <input
                  type="text"
                  placeholder="بحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 pl-8 text-xs text-white focus:outline-none focus:border-gold-400"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">الاسم</th>
                    <th className="py-2.5 px-3">المرحلة</th>
                    <th className="py-2.5 px-3">الهاتف</th>
                    <th className="py-2.5 px-3">نسبة الحضور</th>
                    <th className="py-2.5 px-3">النقاط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-white">{s.fullName}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          s.grade === 'elisha' ? 'bg-maroon-900 text-gold-300 border border-gold-400/40' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {getGradeTitle(s.grade)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono" dir="ltr">{s.phone}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-400">{s.attendanceRate}%</td>
                      <td className="py-2.5 px-3 text-gold-400 font-bold">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
