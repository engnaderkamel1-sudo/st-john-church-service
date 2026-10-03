import React, { useState, useEffect } from 'react';
import { Plus, FileText, Sparkles, Presentation, PenTool, CheckCircle, Award, UserCheck } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import ServantAiStudioModal from './ServantAiStudioModal';
import AiPresentationViewer from './AiPresentationViewer';

export default function ServantExamsBank({
  selectedGrade,
  getGradeTitle,
  currentGradeSubjects,
  questionBank,
  setQuestionBank,
  createdExams,
  setCreatedExams,
  allUsers = [],
  fetchAllUsers
}) {
  const [examSubSection, setExamSubSection] = useState('bank'); // 'bank' | 'assign' | 'paper'
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showAiStudioModal, setShowAiStudioModal] = useState(false);
  const [activePresentation, setActivePresentation] = useState(null);
  const [newQuestion, setNewQuestion] = useState({
    subject: '',
    type: 'mcq',
    difficulty: 'medium',
    questionText: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    points: 5
  });

  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamSubject, setNewExamSubject] = useState('');
  const [newExamDuration, setNewExamDuration] = useState('20');

  // Paper / Offline Exam State
  const [paperSubject, setPaperSubject] = useState('');
  const [paperExamTitle, setPaperExamTitle] = useState('');
  const [paperMaxScore, setPaperMaxScore] = useState(30);
  const [paperScores, setPaperScores] = useState({});
  const [paperSavingStudentId, setPaperSavingStudentId] = useState(null);
  const [paperSavedSuccessId, setPaperSavedSuccessId] = useState(null);
  const [recordedPaperExams, setRecordedPaperExams] = useState([]);

  // Fetch recorded paper exams
  useEffect(() => {
    const fetchPaperExams = async () => {
      try {
        const q = query(collection(db, 'exam_submissions'), where('type', '==', 'paper'));
        const snap = await getDocs(q);
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setRecordedPaperExams(list);
      } catch (err) {
        console.warn('Error fetching paper submissions:', err);
      }
    };
    fetchPaperExams();
  }, []);

  const currentGradeQuestions = (questionBank || []).filter(q => q.grade === selectedGrade);
  const currentGradeExams = (createdExams || []).filter(ex => ex.grade === selectedGrade || !ex.grade);

  const handleAddQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!newQuestion.questionText.trim()) return;

    const qItem = {
      subject: newQuestion.subject || (currentGradeSubjects[0]?.name || 'عام'),
      grade: selectedGrade,
      type: newQuestion.type,
      difficulty: newQuestion.difficulty,
      questionText: newQuestion.questionText,
      options: newQuestion.type === 'mcq' ? newQuestion.options.filter(Boolean) : (newQuestion.type === 'true_false' ? ['صح', 'خطأ'] : null),
      correctAnswer: newQuestion.type === 'true_false' ? (newQuestion.correctAnswer || 'صح') : (newQuestion.correctAnswer || newQuestion.options[0]),
      points: Number(newQuestion.points) || 5
    };

    try {
      const docRef = await addDoc(collection(db, 'service_questions'), {
        ...qItem,
        createdAt: serverTimestamp()
      });
      setQuestionBank(prev => [{ id: docRef.id, ...qItem }, ...prev]);
    } catch (err) {
      console.error('Error saving question:', err);
      setQuestionBank(prev => [{ id: `qb-${Date.now()}`, ...qItem }, ...prev]);
    }

    setNewQuestion({
      subject: '',
      type: 'mcq',
      difficulty: 'medium',
      questionText: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 5
    });
    setShowAddQuestionModal(false);
  };

  const handleCreateExamSubmit = async (e) => {
    e.preventDefault();
    if (!newExamTitle.trim()) return;

    const examItem = {
      title: newExamTitle.trim(),
      subject: newExamSubject || (currentGradeSubjects[0]?.name || 'عام'),
      grade: selectedGrade,
      durationMinutes: Number(newExamDuration) || 20,
      totalScore: 30,
      questionsCount: currentGradeQuestions.length || 3,
      status: 'active'
    };

    try {
      const docRef = await addDoc(collection(db, 'service_exams'), {
        ...examItem,
        createdAt: serverTimestamp()
      });
      setCreatedExams(prev => [{ id: docRef.id, ...examItem }, ...prev]);
    } catch (err) {
      console.error('Error saving exam:', err);
      setCreatedExams(prev => [{ id: `ex-${Date.now()}`, ...examItem }, ...prev]);
    }

    setNewExamTitle('');
    setShowCreateExamModal(false);
  };

  const handleBatchAddAiQuestions = async (newQuestions) => {
    setQuestionBank(prev => [...newQuestions, ...(prev || [])]);
    try {
      for (const q of newQuestions) {
        await addDoc(collection(db, 'service_questions'), {
          ...q,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error('Error saving batch AI questions:', err);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 overflow-x-auto">
        <button
          onClick={() => setExamSubSection('bank')}
          className={`text-xs px-4 py-2 rounded-xl font-bold transition-all shrink-0 ${
            examSubSection === 'bank' ? 'bg-maroon-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          بنك الأسئلة ({currentGradeQuestions.length})
        </button>
        <button
          onClick={() => setExamSubSection('assign')}
          className={`text-xs px-4 py-2 rounded-xl font-bold transition-all shrink-0 ${
            examSubSection === 'assign' ? 'bg-maroon-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          تكليف ونشر امتحان أونلاين
        </button>
        <button
          onClick={() => setExamSubSection('paper')}
          className={`text-xs px-4 py-2 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            examSubSection === 'paper' ? 'bg-maroon-800 text-white shadow-sm' : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
          }`}
        >
          <PenTool className="w-3.5 h-3.5 text-amber-600" />
          <span>رصد درجات امتحان ورقي / تحريري 📝</span>
        </button>
      </div>

      {examSubSection === 'bank' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-extrabold text-slate-900 text-base">بنك الأسئلة: {getGradeTitle(selectedGrade)}</h4>
              <p className="text-xs text-slate-500 mt-0.5">يضيف خدام المواد الأسئلة مصنفة حسب الصعوبة والنوع ليتم توليد الامتحانات منها.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAiStudioModal(true)}
                className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold text-xs py-2 px-3.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                title="توليد أسئلة امتحانات تلقائياً من المستندات والصور بالذكاء الاصطناعي وإضافتها لبنك الأسئلة"
              >
                <Sparkles className="w-4 h-4 text-gold-300" />
                <span>توليد أسئلة بالذكاء الاصطناعي (AI) 🪄</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddQuestionModal(true)}
                className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة سؤال يدوياً</span>
              </button>
            </div>
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

          {currentGradeQuestions.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">بنك الأسئلة فارغ لهذه المرحلة حالياً.</p>
              <p className="text-[11px] text-slate-400 mt-1">اضغط على "إضافة سؤال لبنك الأسئلة" للبدء في تجميع بنك أسئلة المرحلة.</p>
            </div>
          ) : (
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
          )}
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

          {currentGradeExams.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">لا توجد امتحانات منشورة لهذه المرحلة حتى الآن.</p>
              <p className="text-[11px] text-slate-400 mt-1">اضغط على زر "تجهيز وتكليف امتحان" لاختيار مادة وتكليف امتحان للطلاب.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentGradeExams.map((ex) => (
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
          )}
        </div>
      )}

      {/* Paper / Offline Exam Grading Tab */}
      {examSubSection === 'paper' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200 rounded-3xl p-5 space-y-4">
            <div>
              <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <PenTool className="w-5 h-5 text-amber-700" />
                <span>رصد درجات امتحان ورقي / تحريري ({getGradeTitle(selectedGrade)})</span>
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                حدد بيانات الامتحان، ثم ادخل درجات الطلاب يدوياً. تُضاف الدرجات مباشرة إلى البند (11: المواد والامتحانات) في لائحة الطالب.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">المادة الدراسية</label>
                <select
                  value={paperSubject}
                  onChange={(e) => setPaperSubject(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-600"
                >
                  <option value="">-- اختر المادة --</option>
                  {(currentGradeSubjects || []).map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان الامتحان</label>
                <input
                  type="text"
                  placeholder="مثال: امتحان أعمال شهر نوفمبر تحريري"
                  value={paperExamTitle}
                  onChange={(e) => setPaperExamTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الدرجة العظمى للامتحان</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={paperMaxScore}
                  onChange={(e) => setPaperMaxScore(Number(e.target.value) || 30)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>
          </div>

          {/* Students list for scoring */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                <span>قائمة مخدومي {getGradeTitle(selectedGrade)} لرصد الدرجة:</span>
              </h5>
              <span className="text-xs text-slate-500">
                {allUsers.filter(u => u.role === 'student' && (u.grade || 'first') === selectedGrade).length} مخدوم
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allUsers
                .filter(u => u.role === 'student' && (u.grade || 'first') === selectedGrade)
                .map(st => {
                  const studentScore = paperScores[st.id] !== undefined ? paperScores[st.id] : '';
                  const isSaving = paperSavingStudentId === st.id;
                  const isSaved = paperSavedSuccessId === st.id;

                  // Check if already has a record for this title
                  const existingRec = recordedPaperExams.find(r => r.userId === st.id && r.examTitle === paperExamTitle && paperExamTitle.trim());

                  const handleSaveStudentScore = async () => {
                    if (studentScore === '' || studentScore === null) {
                      alert('برجاء كتابة درجة الطالب أولاً');
                      return;
                    }
                    const numScore = Number(studentScore);
                    if (isNaN(numScore) || numScore < 0 || numScore > paperMaxScore) {
                      alert(`الدرجة يجب أن تكون بين 0 و ${paperMaxScore}`);
                      return;
                    }

                    setPaperSavingStudentId(st.id);
                    try {
                      const payload = {
                        userId: st.id,
                        userName: st.fullName || 'مخدوم',
                        grade: selectedGrade,
                        subject: paperSubject || (currentGradeSubjects[0]?.name || 'عام'),
                        examTitle: paperExamTitle.trim() || 'امتحان ورقي',
                        score: numScore,
                        totalScore: Number(paperMaxScore) || 30,
                        type: 'paper',
                        date: new Date().toISOString().split('T')[0],
                        createdAt: serverTimestamp()
                      };

                      const docRef = await addDoc(collection(db, 'exam_submissions'), payload);
                      setRecordedPaperExams(prev => [{ id: docRef.id, ...payload }, ...prev]);

                      // Update points in users doc
                      const userRef = doc(db, 'users', st.id);
                      await updateDoc(userRef, {
                        points: (st.points || 0) + numScore
                      });

                      if (fetchAllUsers) fetchAllUsers();

                      setPaperSavedSuccessId(st.id);
                      setTimeout(() => setPaperSavedSuccessId(null), 3000);
                    } catch (err) {
                      console.error('Error saving paper exam score:', err);
                      alert('حدث خطأ أثناء حفظ درجة الطالب.');
                    } finally {
                      setPaperSavingStudentId(null);
                    }
                  };

                  return (
                    <div key={st.id} className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs flex items-center justify-between gap-3">
                      <div>
                        <h6 className="font-extrabold text-xs text-slate-900">{st.fullName}</h6>
                        <span className="text-[11px] text-slate-500 font-mono" dir="ltr">{st.phone || 'بدون هاتف'}</span>
                        {existingRec && (
                          <span className="block text-[10px] text-emerald-700 font-bold mt-0.5">
                            الدرجة المرصودة سابقاً: {existingRec.score}/{existingRec.totalScore}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
                          <input
                            type="number"
                            min="0"
                            max={paperMaxScore}
                            placeholder="0"
                            value={studentScore}
                            onChange={(e) => setPaperScores({ ...paperScores, [st.id]: e.target.value })}
                            className="w-14 text-center font-mono font-bold text-xs bg-white border border-slate-300 rounded-lg py-1 text-slate-900 focus:outline-none focus:border-amber-600"
                          />
                          <span className="text-[11px] text-slate-500 font-bold font-mono">/{paperMaxScore}</span>
                        </div>

                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={handleSaveStudentScore}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            isSaved 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-maroon-800 hover:bg-maroon-700 text-white'
                          } disabled:opacity-50`}
                        >
                          {isSaving ? (
                            <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          ) : isSaved ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>تم ✓</span>
                            </>
                          ) : (
                            <span>رصد ✍️</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* AI Studio Modal for Servants */}
      <ServantAiStudioModal
        isOpen={showAiStudioModal}
        onClose={() => setShowAiStudioModal(false)}
        initialGrade={selectedGrade}
        onAddQuestionsToBank={handleBatchAddAiQuestions}
        onOpenPresentation={(pres) => {
          setActivePresentation(pres);
          setShowAiStudioModal(false);
        }}
      />

      {/* Interactive Presentation Slides Viewer */}
      {activePresentation && (
        <AiPresentationViewer
          presentation={activePresentation}
          onClose={() => setActivePresentation(null)}
        />
      )}
    </div>
  );
}
