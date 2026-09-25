import React, { useState } from 'react';
import { 
  ShieldCheck, Users, QrCode, BookOpen, CheckCircle, Clock, 
  Printer, UserCheck, Search, Award, FileCheck, Edit3, Save, Check, 
  FileText, Plus, Download, UploadCloud, ChevronLeft, Trash2, FolderPlus,
  HelpCircle, Filter, Send, Layers, AlertCircle, MessageSquare, TrendingUp, Trophy
} from 'lucide-react';

export default function ServantDashboard({ user }) {
  const [mainTab, setMainTab] = useState('subjects_hub'); // 'subjects_hub', 'exams_bank_hub', 'analytics_hub', 'attendance_qr'
  const [selectedGrade, setSelectedGrade] = useState('first');

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

  const [activeSubject, setActiveSubject] = useState(null);

  // Forms for Subjects
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectTeacher, setNewSubjectTeacher] = useState('');
  const [showAddRefModal, setShowAddRefModal] = useState(false);
  const [newRefTitle, setNewRefTitle] = useState('');

  // Question Bank State
  const [questionBank, setQuestionBank] = useState([
    {
      id: 'qb-1',
      subject: 'العقيدة المسيحية الأساسية',
      grade: 'first',
      type: 'mcq',
      difficulty: 'easy',
      questionText: 'ما هو سر الأسرار وينبوع كل النعم الكنسية؟',
      options: ['سر المعمودية', 'سر الإفخارستيا (التناول)', 'سر التوبة والاعتراف', 'سر الزيجة'],
      correctAnswer: 'سر الإفخارستيا (التناول)',
      points: 5
    },
    {
      id: 'qb-2',
      subject: 'العقيدة المسيحية الأساسية',
      grade: 'first',
      type: 'true_false',
      difficulty: 'easy',
      questionText: 'صلاة باكر في الأجبية تُصلى تذكاراً لقيامة السيد المسيح من بين الأموات.',
      options: ['صح', 'خطأ'],
      correctAnswer: 'صح',
      points: 5
    },
    {
      id: 'qb-3',
      subject: 'تاريخ الكنيسة والمجامع',
      grade: 'second',
      type: 'mcq',
      difficulty: 'medium',
      questionText: 'في أي مجمع مسكوني تم إقرار قانون الإيمان النيقاوي؟',
      options: ['مجمع نيقية 325م', 'مجمع القسطنطينية 381م', 'مجمع أفسس 431م', 'مجمع خلقيدونية'],
      correctAnswer: 'مجمع نيقية 325م',
      points: 5
    }
  ]);

  const [examSubSection, setExamSubSection] = useState('bank');
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    subject: 'العقيدة المسيحية الأساسية',
    type: 'mcq',
    difficulty: 'medium',
    questionText: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    points: 5
  });

  const [createdExams, setCreatedExams] = useState([
    {
      id: 'ex-1',
      title: 'امتحان منتصف الفصل في العقيدة والطقوس',
      subject: 'العقيدة المسيحية الأساسية',
      grade: 'first',
      durationMinutes: 20,
      totalScore: 30,
      questionsCount: 4,
      status: 'active'
    }
  ]);

  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamSubject, setNewExamSubject] = useState('العقيدة المسيحية الأساسية');
  const [newExamDuration, setNewExamDuration] = useState(20);

  // Students Data with Attendance, Scores, Red Flags, and Servant Comments
  const [studentsByGrade, setStudentsByGrade] = useState({
    first: [
      { id: '101', fullName: 'كيرلس عماد صبحي', phone: '01012345672', attendanceRate: 92, examScore: 28, points: 145, comment: 'ملتزم جداً وله استجابة سريعة في الحفظ والمشاركات.', isRedFlag: false },
      { id: '102', fullName: 'مينا سمير جرجس', phone: '01211122233', attendanceRate: 88, examScore: 25, points: 110, comment: 'هادئ ومواظب، يحتاج تشجيعاً في الأسئلة المقالية.', isRedFlag: false },
      { id: '103', fullName: 'مارك عاطف فهيم', phone: '01287654321', attendanceRate: 60, examScore: 14, points: 55, comment: 'تغيب لجمعتين متتاليتين، تم الاتصال بوالده ويحتاج افتقاداً منزلياً.', isRedFlag: true },
      { id: '104', fullName: 'بولا رأفت نعيم', phone: '01099887766', attendanceRate: 50, examScore: 12, points: 40, comment: 'منقطع عن الحضور وعنده تعارض مع دروس الثانوية، يحتاج متابعة.', isRedFlag: true }
    ],
    second: [
      { id: '201', fullName: 'ديفيد مجدي لمعي', phone: '01234567894', attendanceRate: 98, examScore: 30, points: 220, comment: 'ممتاز في التناول والصلاة ويصلح بقوة للترشيح لفصل أليشع.', isRedFlag: false },
      { id: '202', fullName: 'مينا كمال عزيز', phone: '01223456781', attendanceRate: 94, examScore: 29, points: 190, comment: 'قائد مجموعة متميز وله روح خدمة ومحبة بين زملائه.', isRedFlag: false },
      { id: '203', fullName: 'أبانوب رفعت موريس', phone: '01198765432', attendanceRate: 85, examScore: 24, points: 130, comment: 'منتظم في الحضور ولكن يحتاج تحفيزاً في قراءة الإنجيل اليومية.', isRedFlag: false },
      { id: '204', fullName: 'يوسف هاني فخري', phone: '01544332211', attendanceRate: 65, examScore: 15, points: 60, comment: 'نسبة الحضور متراجعة والدرجة ضعيفة، يحتاج جلسة مع أب الاعتراف.', isRedFlag: true }
    ],
    third: [
      { id: '301', fullName: 'توماس رأفت شحاتة', phone: '01123456783', attendanceRate: 90, examScore: 27, points: 160, comment: 'ملتزم رغم ضغوط شهادة الثانوية العامة.', isRedFlag: false },
      { id: '302', fullName: 'جورج فادي عزمي', phone: '01022334455', attendanceRate: 55, examScore: 16, points: 45, comment: 'متغيب بسبب مواعيد الدروس الخصوصية، مطلوب افتقاده تليفونياً.', isRedFlag: true }
    ],
    elisha: [
      { id: '401', fullName: 'فادي نبيل رمزي', phone: '01098765435', attendanceRate: 100, examScore: 30, points: 260, comment: 'نموذج رائع لخادم المستقبل، يجيد التحضير وسيكولوجية المخدومين.', isRedFlag: false },
      { id: '402', fullName: 'بيتر سامي نصيف', phone: '01277665544', attendanceRate: 96, examScore: 28, points: 230, comment: 'ملتزم في الأسرار والافتقاد الميداني التجريبي.', isRedFlag: false }
    ]
  });

  const [savedCommentId, setSavedCommentId] = useState(null);

  // Handle Update Comment
  const handleCommentChange = (studentId, text) => {
    setStudentsByGrade(prev => {
      const list = prev[selectedGrade] || [];
      const updated = list.map(s => s.id === studentId ? { ...s, comment: text } : s);
      return { ...prev, [selectedGrade]: updated };
    });
  };

  const handleSaveComment = (studentId) => {
    setSavedCommentId(studentId);
    setTimeout(() => setSavedCommentId(null), 2000);
  };

  // Handlers for Add Question & Subject
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

  const handleAddQuestionSubmit = (e) => {
    e.preventDefault();
    if (!newQuestion.questionText.trim()) return;

    const qItem = {
      id: `qb-${Date.now()}`,
      subject: newQuestion.subject,
      grade: selectedGrade,
      type: newQuestion.type,
      difficulty: newQuestion.difficulty,
      questionText: newQuestion.questionText,
      options: newQuestion.type === 'mcq' ? newQuestion.options.filter(Boolean) : (newQuestion.type === 'true_false' ? ['صح', 'خطأ'] : null),
      correctAnswer: newQuestion.type === 'true_false' ? (newQuestion.correctAnswer || 'صح') : (newQuestion.correctAnswer || newQuestion.options[0]),
      points: Number(newQuestion.points) || 5
    };

    setQuestionBank([qItem, ...questionBank]);
    setShowAddQuestionModal(false);
  };

  const handleCreateExamSubmit = (e) => {
    e.preventDefault();
    if (!newExamTitle.trim()) return;

    const examItem = {
      id: `ex-${Date.now()}`,
      title: newExamTitle.trim(),
      subject: newExamSubject,
      grade: selectedGrade,
      durationMinutes: Number(newExamDuration) || 20,
      totalScore: 30,
      questionsCount: questionBank.filter(q => q.grade === selectedGrade).length || 3,
      status: 'active'
    };

    setCreatedExams([examItem, ...createdExams]);
    setNewExamTitle('');
    setShowCreateExamModal(false);
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
  const currentGradeQuestions = questionBank.filter(q => q.grade === selectedGrade);
  const currentGradeStudents = studentsByGrade[selectedGrade] || [];

  // Analytics Calculations
  const totalStudents = currentGradeStudents.length;
  const avgAttendance = totalStudents ? Math.round(currentGradeStudents.reduce((acc, s) => acc + s.attendanceRate, 0) / totalStudents) : 0;
  const avgScore = totalStudents ? Math.round(currentGradeStudents.reduce((acc, s) => acc + s.examScore, 0) / totalStudents) : 0;
  const redFlagsCount = currentGradeStudents.filter(s => s.isRedFlag).length;
  
  // Sorted Top Students (Honor Roll)
  const topStudents = [...currentGradeStudents].sort((a, b) => b.points - a.points).slice(0, 3);

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
                selectedGrade === g ? 'bg-white text-maroon-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
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
          className={`py-2 px-3 rounded-xl flex items-center gap-1.5 transition-all shrink-0 relative ${
            mainTab === 'analytics_hub' ? 'bg-maroon-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>الإحصائيات والأوائل والتقييم</span>
          {redFlagsCount > 0 && (
            <span className="w-2 h-2 bg-red-500 rounded-full inline-block mr-1 animate-pulse"></span>
          )}
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
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">مواد ومناهج: {getGradeTitle(selectedGrade)}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">إدارة المواد الدراسية ورفع المراجع والمذكرات العلمية للمخدومين.</p>
                </div>
                <button
                  onClick={() => setShowAddSubjectModal(true)}
                  className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة مادة جديدة</span>
                </button>
              </div>

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
                    <button type="button" onClick={() => setShowAddSubjectModal(false)} className="bg-white border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-xl font-bold">
                      إلغاء
                    </button>
                    <button type="submit" className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl">
                      حفظ المادة
                    </button>
                  </div>
                </form>
              )}

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
                      <h4 className="font-extrabold text-slate-900 text-base group-hover:text-maroon-800 transition-colors mb-1">{sub.name}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed mb-4">اضغط للدخول ورفع المراجع، المذكرات العلمية، ومتابعة المحتوى.</p>
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
                    <button type="button" onClick={() => setShowAddRefModal(false)} className="bg-white border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-xl font-bold">
                      إلغاء
                    </button>
                    <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 rounded-xl flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>تأكيد الإضافة وإتاحته للمخدومين</span>
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {activeSubject.references.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">لم يتم إضافة مراجع لهذه المادة بعد.</div>
                ) : (
                  activeSubject.references.map((rf) => (
                    <div key={rf.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <h5 className="font-extrabold text-slate-900 text-sm">{rf.title}</h5>
                        <span className="text-[11px] text-slate-400 mt-1 block">ملف PDF • {rf.size} • تاريخ الإضافة: {rf.date}</span>
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

      {/* 2. Question Bank & Exams Hub */}
      {mainTab === 'exams_bank_hub' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <button
              onClick={() => setExamSubSection('bank')}
              className={`text-xs px-4 py-2 rounded-xl font-bold transition-all ${
                examSubSection === 'bank' ? 'bg-maroon-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              بنك الأسئلة ({currentGradeQuestions.length})
            </button>
            <button
              onClick={() => setExamSubSection('assign')}
              className={`text-xs px-4 py-2 rounded-xl font-bold transition-all ${
                examSubSection === 'assign' ? 'bg-maroon-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              تكليف ونشر امتحان (Assign Exam)
            </button>
          </div>

          {examSubSection === 'bank' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">بنك الأسئلة: {getGradeTitle(selectedGrade)}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">يضيف خدام المواد الأسئلة مصنفة حسب الصعوبة والنوع ليتم توليد الامتحانات منها.</p>
                </div>
                <button
                  onClick={() => setShowAddQuestionModal(true)}
                  className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة سؤال لبنك الأسئلة</span>
                </button>
              </div>

              {showAddQuestionModal && (
                <form onSubmit={handleAddQuestionSubmit} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3">
                  <h5 className="font-extrabold text-xs text-maroon-900">إضافة سؤال جديد لبنك الأسئلة ({getGradeTitle(selectedGrade)})</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">المادة</label>
                      <select
                        value={newQuestion.subject}
                        onChange={(e) => setNewQuestion({ ...newQuestion, subject: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      >
                        {currentGradeSubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع السؤال</label>
                      <select
                        value={newQuestion.type}
                        onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      >
                        <option value="mcq">اختيار من متعدد (MCQ)</option>
                        <option value="true_false">صح أو خطأ</option>
                        <option value="essay">سؤال مقالي (يصححه الخادم)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">درجة الصعوبة</label>
                      <select
                        value={newQuestion.difficulty}
                        onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      >
                        <option value="easy">سهل جداً 🟢</option>
                        <option value="medium">متوسط 🟡</option>
                        <option value="hard">صعب 🔴</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">نص السؤال</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="اكتب صيغة السؤال هنا..."
                      value={newQuestion.questionText}
                      onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button type="button" onClick={() => setShowAddQuestionModal(false)} className="bg-white border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-xl font-bold">
                      إلغاء
                    </button>
                    <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 rounded-xl">
                      إضافة السؤال للبنك
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {currentGradeQuestions.map((q, idx) => (
                  <div key={q.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">س {idx + 1}</span>
                        <span className="bg-maroon-50 text-maroon-900 border border-maroon-200 px-2 py-0.5 rounded font-bold text-[10px]">{q.subject}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        q.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-800' : q.difficulty === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {q.difficulty === 'easy' ? 'سهل جداً 🟢' : q.difficulty === 'medium' ? 'متوسط 🟡' : 'صعب 🔴'}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800">{q.questionText}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {examSubSection === 'assign' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">تكليف ونشر امتحان (Assign Exam)</h4>
                  <p className="text-xs text-slate-500 mt-0.5">نشر امتحان لمخدومي {getGradeTitle(selectedGrade)}.</p>
                </div>
                <button
                  onClick={() => setShowCreateExamModal(true)}
                  className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>تجهيز وتكليف امتحان</span>
                </button>
              </div>

              {showCreateExamModal && (
                <form onSubmit={handleCreateExamSubmit} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3">
                  <h5 className="font-extrabold text-xs text-maroon-900">نشر امتحان جديد لـ ({getGradeTitle(selectedGrade)})</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">المادة</label>
                      <select
                        value={newExamSubject}
                        onChange={(e) => setNewExamSubject(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      >
                        {currentGradeSubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان الامتحان</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: امتحان أعمال شهر أكتوبر"
                        value={newExamTitle}
                        onChange={(e) => setNewExamTitle(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">المدة (بالدقائق)</label>
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={newExamDuration}
                        onChange={(e) => setNewExamDuration(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button type="button" onClick={() => setShowCreateExamModal(false)} className="bg-white border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-xl font-bold">
                      إلغاء
                    </button>
                    <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 rounded-xl">
                      تأكيد النشر للمخدومين
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {createdExams.map((ex) => (
                  <div key={ex.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-extrabold text-slate-900 text-sm">{ex.title}</span>
                        <span className="bg-maroon-100 text-maroon-900 font-bold px-2 py-0.5 rounded text-[10px]">{ex.subject}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">المدة: {ex.durationMinutes} دقيقة • الدرجة العظمى: {ex.totalScore} درجة</span>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-xl text-[11px]">متاح ونشط للطلاب ✓</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Analytics, Honor Roll, Red Flags, & Servant Comments Hub */}
      {mainTab === 'analytics_hub' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          {/* Header */}
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-base">
              الإحصائيات ولوحة الشرف والتقييم الرعوي: {getGradeTitle(selectedGrade)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              متابعة نسب الحضور، تكريم الأوائل، كشف العلامات الحمراء (المتغيبين والمقصرين)، وكتابة تقييم وملاحظات الخدام.
            </p>
          </div>

          {/* Quick Metrics KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
              <span className="text-[11px] text-slate-500 font-bold block">إجمالي المخدومين</span>
              <span className="text-xl font-extrabold text-slate-900">{totalStudents}</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
              <span className="text-[11px] text-slate-500 font-bold block">متوسط الحضور</span>
              <span className="text-xl font-extrabold text-emerald-600">{avgAttendance}%</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
              <span className="text-[11px] text-slate-500 font-bold block">متوسط الامتحانات</span>
              <span className="text-xl font-extrabold text-amber-600">{avgScore} / 30</span>
            </div>

            <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-center">
              <span className="text-[11px] text-red-700 font-bold block">علامات حمراء (افتقاد عاجل)</span>
              <span className="text-xl font-extrabold text-red-600 flex items-center justify-center gap-1">
                <span>🔴</span>
                <span>{redFlagsCount}</span>
              </span>
            </div>
          </div>

          {/* Honor Roll (Top 3 Students) */}
          <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 p-5 rounded-2xl space-y-3">
            <h4 className="font-extrabold text-amber-950 text-sm flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-600" />
              لوحة الشرف والأوائل ({getGradeTitle(selectedGrade)}) 🏆
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {topStudents.map((st, rank) => (
                <div key={st.id} className="bg-white border border-amber-200/80 p-3.5 rounded-xl flex items-center justify-between text-xs shadow-2xs">
                  <div>
                    <span className="font-extrabold text-slate-900 block text-xs">
                      {rank === 0 ? '🥇' : rank === 1 ? '🥈' : '🥉'} {st.fullName}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      حضور: {st.attendanceRate}% • امتحان: {st.examScore}/30
                    </span>
                  </div>
                  <span className="text-amber-700 font-extrabold text-xs">{st.points} نقطة</span>
                </div>
              ))}
            </div>
          </div>

          {/* Student Evaluation Table with Servant Comments & Red Flags */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-maroon-800" />
              سجل تقييمات وملاحظات الخدام لكل مخدوم
            </h4>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-3">المخدوم</th>
                    <th className="py-3 px-2">الحضور</th>
                    <th className="py-3 px-2">الدرجة</th>
                    <th className="py-3 px-2">الحالة</th>
                    <th className="py-3 px-4">ملاحظات وتقييم الخادم (هل ملتزم / يصلح لإعداد خدام)</th>
                    <th className="py-3 px-3">حفظ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentGradeStudents.map((st) => (
                    <tr key={st.id} className={`hover:bg-slate-50/80 transition-colors ${st.isRedFlag ? 'bg-red-50/30' : ''}`}>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {st.fullName}
                        <span className="text-[10px] text-slate-400 block font-normal">{st.phone}</span>
                      </td>
                      <td className="py-3 px-2 font-bold text-slate-800">{st.attendanceRate}%</td>
                      <td className="py-3 px-2 font-bold text-slate-800">{st.examScore}/30</td>
                      <td className="py-3 px-2">
                        {st.isRedFlag ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-red-200">
                            🔴 افتقاد
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            🟢 منتظم
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="اكتب ملاحظة رعوية، مستوى التزامه، أو ترشيحه لإعداد خدام..."
                          value={st.comment}
                          onChange={(e) => handleCommentChange(st.id, e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-maroon-800"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleSaveComment(st.id)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1 ${
                            savedCommentId === st.id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-maroon-800 hover:bg-maroon-700 text-white shadow-xs'
                          }`}
                        >
                          {savedCommentId === st.id ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                          <span>{savedCommentId === st.id ? 'تم الحفظ' : 'حفظ'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
