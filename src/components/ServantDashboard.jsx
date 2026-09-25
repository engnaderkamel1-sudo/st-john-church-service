import React, { useState } from 'react';
import { 
  ShieldCheck, Users, QrCode, BookOpen, CheckCircle, Clock, 
  Printer, UserCheck, Search, Award, FileCheck, Edit3, Save, Check, 
  FileText, Plus, Download, UploadCloud, ChevronLeft, Trash2, FolderPlus,
  HelpCircle, Filter, Send, Layers
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
      type: 'mcq', // mcq, true_false, essay
      difficulty: 'easy', // easy, medium, hard
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
    },
    {
      id: 'qb-4',
      subject: 'مهارات إعداد الخادم والقيادة',
      grade: 'elisha',
      type: 'essay',
      difficulty: 'hard',
      questionText: 'اذكر باختصار ثلاث صفات روحية وسلوكية يجب أن يتحلى بها خادم المسيح في التعامل مع المخدومين.',
      options: null,
      correctAnswer: 'مقال تحليلي',
      points: 10
    }
  ]);

  // Exam Sub-tab inside Exams Hub: 'bank', 'assign', 'grading'
  const [examSubSection, setExamSubSection] = useState('bank');
  
  // Add Question Form
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

  // Assign Exam State
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

  // Handlers
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
    setNewQuestion({
      subject: currentGradeSubjects[0]?.name || 'العقيدة',
      type: 'mcq',
      difficulty: 'medium',
      questionText: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 5
    });
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

  const handleGradeEssay = (subId, score) => {
    setPendingEssays(prev => prev.map(item => {
      if (item.id === subId) {
        return { ...item, essayScore: score, status: 'graded' };
      }
      return item;
    }));
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
          className={`py-2 px-3 rounded-xl flex items-center gap-1.5 transition-all shrink-0 relative ${
            mainTab === 'exams_bank_hub' ? 'bg-maroon-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>بنك الأسئلة والامتحانات</span>
          {pendingEssays.filter(e => e.status === 'pending').length > 0 && (
            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
          )}
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

      {/* 2. Question Bank & Exams Hub (بنك الأسئلة والامتحانات) */}
      {mainTab === 'exams_bank_hub' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          {/* Sub Switcher: Bank vs Assign vs Grading */}
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
            <button
              onClick={() => setExamSubSection('grading')}
              className={`text-xs px-4 py-2 rounded-xl font-bold transition-all relative ${
                examSubSection === 'grading' ? 'bg-maroon-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              تصحيح الأسئلة المقالية
              {pendingEssays.filter(e => e.status === 'pending').length > 0 && (
                <span className="w-2 h-2 bg-amber-500 rounded-full inline-block mr-1"></span>
              )}
            </button>
          </div>

          {/* Section A: Question Bank */}
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

              {/* Add Question Modal */}
              {showAddQuestionModal && (
                <form onSubmit={handleAddQuestionSubmit} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3">
                  <h5 className="font-extrabold text-xs text-maroon-900">إضافة سؤال جديد لبنك الأسئلة ({getGradeTitle(selectedGrade)})</h5>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">المادة التابع لها</label>
                      <select
                        value={newQuestion.subject}
                        onChange={(e) => setNewQuestion({ ...newQuestion, subject: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800"
                      >
                        {currentGradeSubjects.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع السؤال</label>
                      <select
                        value={newQuestion.type}
                        onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800"
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
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800"
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
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-maroon-800"
                    />
                  </div>

                  {newQuestion.type === 'mcq' && (
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-700">خيارات الإجابة</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {newQuestion.options.map((opt, idx) => (
                          <input
                            key={idx}
                            type="text"
                            required
                            placeholder={`خيار ${idx + 1}`}
                            value={opt}
                            onChange={(e) => {
                              const opts = [...newQuestion.options];
                              opts[idx] = e.target.value;
                              setNewQuestion({ ...newQuestion, options: opts });
                            }}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs"
                          />
                        ))}
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mt-2 mb-1">الإجابة الصحيحة</label>
                        <select
                          value={newQuestion.correctAnswer}
                          onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                        >
                          <option value="">اختر الإجابة الصحيحة...</option>
                          {newQuestion.options.filter(Boolean).map((opt, i) => (
                            <option key={i} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {newQuestion.type === 'true_false' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">الإجابة الصحيحة</label>
                      <select
                        value={newQuestion.correctAnswer}
                        onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      >
                        <option value="صح">صح</option>
                        <option value="خطأ">خطأ</option>
                      </select>
                    </div>
                  )}

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

              {/* Questions List */}
              <div className="space-y-3">
                {currentGradeQuestions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">لا توجد أسئلة مسجلة في هذا الصف بعد.</div>
                ) : (
                  currentGradeQuestions.map((q, idx) => (
                    <div key={q.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">س {idx + 1}</span>
                          <span className="bg-maroon-50 text-maroon-900 border border-maroon-200 px-2 py-0.5 rounded-md font-bold text-[10px]">
                            {q.subject}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold">
                            {q.type === 'mcq' ? 'اختيار من متعدد' : q.type === 'true_false' ? 'صح/خطأ' : 'مقالي'}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          q.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-800' : q.difficulty === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {q.difficulty === 'easy' ? 'سهل جداً 🟢' : q.difficulty === 'medium' ? 'متوسط 🟡' : 'صعب 🔴'}
                        </span>
                      </div>
                      <p className="font-bold text-slate-800 leading-relaxed">{q.questionText}</p>
                      {q.options && (
                        <div className="text-[11px] text-slate-500 flex flex-wrap gap-2 pt-1">
                          {q.options.map((opt, i) => (
                            <span key={i} className={`px-2 py-0.5 rounded-lg border ${opt === q.correctAnswer ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold' : 'bg-white border-slate-200'}`}>
                              {opt} {opt === q.correctAnswer && '✓'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Section B: Assign / Create Exam */}
          {examSubSection === 'assign' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">تكليف ونشر امتحان جديد (Assign Exam)</h4>
                  <p className="text-xs text-slate-500 mt-0.5">تحديد ميعاد، مدة، ومادة الامتحان وإتاحته لمخدومي {getGradeTitle(selectedGrade)}.</p>
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
                      <span className="text-[11px] text-slate-500">المدة: {ex.durationMinutes} دقيقة • الدرجة العظمى: {ex.totalScore} درجة • عدد الأسئلة: {ex.questionsCount}</span>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-xl text-[11px]">
                      متاح ونشط للطلاب ✓
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section C: Essay Grading */}
          {examSubSection === 'grading' && (
            <div className="space-y-3">
              <h4 className="font-extrabold text-slate-900 text-sm">تصحيح الأسئلة المقالية المسلمة</h4>
              {pendingEssays.map((item) => (
                <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div>
                      <span className="font-bold text-slate-900">{item.studentName}</span>
                      <span className="text-slate-500 text-[11px] mr-2">({getGradeTitle(item.grade)})</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      item.status === 'graded' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.status === 'graded' ? `تم التقدير (${item.essayScore}/10)` : 'بانتظار تقدير الخادم'}
                    </span>
                  </div>
                  <div>
                    <div className="text-maroon-800 font-bold mb-1">السؤال: {item.questionText}</div>
                    <div className="bg-white border border-slate-200 p-2.5 rounded-xl text-slate-700 leading-relaxed font-normal">
                      {item.studentAnswer}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <span className="text-slate-500 text-[11px] font-bold">تقدير الدرجة:</span>
                    {[7, 8, 9, 10].map((score) => (
                      <button
                        key={score}
                        onClick={() => handleGradeEssay(item.id, score)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                          item.essayScore === score ? 'bg-maroon-800 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Placeholder for Stage 5: Analytics & Observations */}
      {mainTab === 'analytics_hub' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center space-y-2">
          <Award className="w-10 h-10 text-maroon-800 mx-auto" />
          <h4 className="font-extrabold text-slate-900 text-base">الإحصائيات والأوائل والعلامات الحمراء</h4>
          <p className="text-xs text-slate-500">جاري تفعيله في المرحلة 5 (لوحة الشرف والعلامات الحمراء وكومنتات الخدام لكل مخدوم).</p>
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
