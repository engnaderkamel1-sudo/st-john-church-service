import React, { useState, useRef } from 'react';
import { 
  X, Sparkles, Camera, Plus, Trash2, CheckCircle, HelpCircle, 
  Clock, Calendar, BookOpen, AlertCircle, Loader2, ArrowRight, Save
} from 'lucide-react';
import { transcribeHandwrittenQuizFromImage } from '../../services/geminiService';
import { compressImage } from '../../utils/imageCompressor';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function ServantQuickQuizBuilderModal({
  isOpen,
  onClose,
  selectedGrade = 'first',
  getGradeTitle,
  currentGradeSubjects = [],
  user,
  onQuizPublished
}) {
  const validGrades = ['first', 'second', 'third', 'elisha', 'all'];
  const initialGrade = validGrades.includes(selectedGrade) ? selectedGrade : 'first';
  const [quizTitle, setQuizTitle] = useState('');
  const [subject, setSubject] = useState(currentGradeSubjects[0]?.name || 'كتاب مقدس');
  const [grade, setGrade] = useState(initialGrade);
  const [deadline, setDeadline] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(0); // 0 = unlimited
  const [questions, setQuestions] = useState([
    {
      id: 'q_1',
      questionText: '',
      type: 'true_false',
      options: ['صح', 'خطأ'],
      correctAnswer: 'صح',
      points: 2,
      explanation: ''
    }
  ]);

  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiError, setAiError] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Handle OCR AI from handwritten image
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAiProcessing(true);
    setAiError('');

    try {
      // Compress with high fidelity (1600px, 0.85 quality) for OCR
      const base64DataUrl = await compressImage(file, 1600, 0.85);
      const pureBase64 = base64DataUrl.split(',')[1];
      const mimeType = 'image/jpeg';

      const result = await transcribeHandwrittenQuizFromImage({
        fileBase64: pureBase64,
        mimeType
      });

      if (result && Array.isArray(result.questions) && result.questions.length > 0) {
        if (result.quizTitle && !quizTitle.trim()) {
          setQuizTitle(result.quizTitle);
        }
        if (result.subject) {
          setSubject(result.subject);
        }
        setQuestions(result.questions.map((q, idx) => ({
          id: `q_${Date.now()}_${idx}`,
          questionText: q.questionText || '',
          type: q.type || 'true_false',
          options: q.options || (q.type === 'true_false' ? ['صح', 'خطأ'] : ['أ', 'ب', 'ج', 'د']),
          correctAnswer: q.correctAnswer || (q.type === 'true_false' ? 'صح' : (q.options?.[0] || '')),
          points: Number(q.points) || 2,
          explanation: q.explanation || ''
        })));
      } else {
        setAiError('تعذر استخراج أسئلة واضحة من الصورة، يرجى التأكد من وضوح الإضاءة والخط.');
      }
    } catch (err) {
      console.error('AI Quiz OCR error:', err);
      setAiError(err.message || 'حدث خطأ أثناء فك خط اليد بالذكاء الاصطناعي.');
    } finally {
      setIsAiProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddQuestion = (type = 'true_false') => {
    setQuestions(prev => [
      ...prev,
      {
        id: `q_${Date.now()}_${prev.length}`,
        questionText: '',
        type,
        options: type === 'true_false' ? ['صح', 'خطأ'] : ['اختيار 1', 'اختيار 2', 'اختيار 3', 'اختيار 4'],
        correctAnswer: type === 'true_false' ? 'صح' : 'اختيار 1',
        points: 2,
        explanation: ''
      }
    ]);
  };

  const handleRemoveQuestion = (id) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleUpdateQuestion = (id, fields) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...fields } : q));
  };

  const handlePublishQuiz = async (targetStatus = 'active') => {
    if (!quizTitle.trim()) {
      alert('يرجى كتابة عنوان المسابقة أولاً.');
      return;
    }
    const emptyQuestions = questions.filter(q => !q.questionText.trim());
    if (emptyQuestions.length > 0) {
      alert('يرجى تعبئة نصوص جميع الأسئلة قبل الحفظ.');
      return;
    }

    setIsPublishing(targetStatus);
    const totalScore = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

    const quizData = {
      title: quizTitle.trim(),
      subject: subject || 'عام',
      grade: grade || 'first',
      durationMinutes: Number(durationMinutes) || 0,
      deadline: deadline || null,
      totalScore: totalScore || (questions.length * 2),
      questionsCount: questions.length,
      questions: questions,
      type: 'online_quiz',
      status: targetStatus, // 'active' (متاحة للطلبة) | 'draft' (مسودة مغلقة)
      createdBy: user?.fullName || 'الخادم المسؤول',
      createdAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, 'service_exams'), quizData);
      if (onQuizPublished) {
        onQuizPublished({ id: docRef.id, ...quizData });
      }
      onClose();
    } catch (err) {
      console.error('Error saving quiz:', err);
      alert('حدث خطأ أثناء حفظ المسابقة، يرجى المحاولة ثانية.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 font-cairo text-right">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-l from-maroon-900 via-maroon-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-black text-sm sm:text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold-300" />
              <span>إنشاء مسابقة وتاسك سريع (Google Forms)</span>
            </h3>
            <p className="text-[11px] text-amber-200/90 mt-0.5">
              صمم مسابقة تفاعلية لمرحلتك أو استخرج الأسئلة فوراً من صورة كشكول بالذكاء الاصطناعي
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* AI Magic Scan Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-l from-amber-500/15 via-gold-500/10 to-transparent border border-amber-300/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-xs text-slate-900 block">
                  مسح ورقة كشكول / كتاب بالذكاء الاصطناعي 🪄
                </span>
                <span className="text-[11px] text-slate-500">
                  صوّر الأسئلة المكتوبة بخط اليد ليفكها الذكاء الاصطناعي ويفرغها فوراً في الخانات.
                </span>
              </div>
            </div>

            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden" 
            />

            <button
              type="button"
              disabled={isAiProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              {isAiProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>جاري فك خط اليد...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-gold-300" />
                  <span>التقاط / رفع صورة كشكول 📷</span>
                </>
              )}
            </button>
          </div>

          {aiError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          {/* Form Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                عنوان المسابقة أو التاسك *
              </label>
              <input 
                type="text"
                required
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="مثال: مسابقة سفر التكوين - نوح وأب الآباء إبراهيم"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-maroon-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">المادة</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
              >
                {currentGradeSubjects.length > 0 ? (
                  currentGradeSubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                ) : (
                  <>
                    <option value="كتاب مقدس">كتاب مقدس</option>
                    <option value="عقيدة">عقيدة</option>
                    <option value="طقس">طقس</option>
                    <option value="تاريخ كنيسة">تاريخ كنيسة</option>
                    <option value="عام">مسابقة عامة</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">المرحلة الدراسية</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
              >
                <option value="first">سنة أولى</option>
                <option value="second">سنة ثانية</option>
                <option value="third">سنة ثالثة</option>
                <option value="elisha">فصل أليشع (إعداد خدام)</option>
                <option value="all">كافة المراحل (مسابقة عامة) 🌟</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                تاريخ انتهاء التسليم (اختياري)
              </label>
              <input 
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                المدة بالدقائق (0 = مفتوحة بدون توقيت)
              </label>
              <input 
                type="number"
                min="0"
                max="180"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
              />
            </div>
          </div>

          {/* Questions Header */}
          <div className="flex items-center justify-between pt-2 border-b border-slate-100 pb-2">
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                أسئلة المسابقة ({questions.length})
              </h4>
              <span className="text-[10px] text-slate-500">
                إجمالي الدرجات: {questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0)} نقطة
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAddQuestion('true_false')}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold hover:bg-emerald-100 transition-colors"
              >
                + صح أو خطأ
              </button>
              <button
                type="button"
                onClick={() => handleAddQuestion('mcq')}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold hover:bg-indigo-100 transition-colors"
              >
                + اختيار متعدد
              </button>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div 
                key={q.id}
                className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3 shadow-2xs"
              >
                {/* Question Top Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-maroon-800 text-white text-[11px] font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <select
                      value={q.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        handleUpdateQuestion(q.id, {
                          type: newType,
                          options: newType === 'true_false' ? ['صح', 'خطأ'] : ['اختيار 1', 'اختيار 2', 'اختيار 3', 'اختيار 4'],
                          correctAnswer: newType === 'true_false' ? 'صح' : 'اختيار 1'
                        });
                      }}
                      className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700"
                    >
                      <option value="true_false">صح أو خطأ ✓/✗</option>
                      <option value="mcq">اختيار من متعدد (MCQ)</option>
                      <option value="essay">سؤال مقالي (تصحيح خادم)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-bold">الدرجة:</span>
                      <input 
                        type="number"
                        min="1"
                        max="20"
                        value={q.points}
                        onChange={(e) => handleUpdateQuestion(q.id, { points: Number(e.target.value) || 1 })}
                        className="w-12 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 text-center text-xs font-bold"
                      />
                    </div>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 transition-colors"
                        title="حذف هذا السؤال"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <textarea
                  rows={2}
                  required
                  value={q.questionText}
                  onChange={(e) => handleUpdateQuestion(q.id, { questionText: e.target.value })}
                  placeholder={`اكتب نص السؤال رقم ${idx + 1}...`}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-maroon-800"
                />

                {/* Answer Selection */}
                {q.type === 'true_false' ? (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-slate-500 block">
                      الإجابة النموذجية الصحيحة:
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuestion(q.id, { correctAnswer: 'صح' })}
                        className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          q.correctAnswer === 'صح' 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                            : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        ✓ صح (صواب)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuestion(q.id, { correctAnswer: 'خطأ' })}
                        className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          q.correctAnswer === 'خطأ' 
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs' 
                            : 'bg-white text-rose-800 border-rose-200 hover:bg-rose-50'
                        }`}
                      >
                        ✗ خطأ
                      </button>
                    </div>
                  </div>
                ) : q.type === 'mcq' ? (
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold text-slate-500 block">
                      خيارات الإجابة (حدد الدائرة أمام الإجابة الصحيحة):
                    </span>
                    <div className="space-y-1.5">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input 
                            type="radio"
                            name={`correct_${q.id}`}
                            checked={q.correctAnswer === opt}
                            onChange={() => handleUpdateQuestion(q.id, { correctAnswer: opt })}
                            className="accent-maroon-800 w-4 h-4 cursor-pointer"
                          />
                          <input 
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...q.options];
                              newOpts[optIdx] = e.target.value;
                              const updates = { options: newOpts };
                              if (q.correctAnswer === opt) updates.correctAnswer = e.target.value;
                              handleUpdateQuestion(q.id, updates);
                            }}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                    سؤال مقالي يكتب فيه الطالب إجابته بحرية، ويظهر في لوحة الخادم لتصحيحه واعتماد درجاته.
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Question Button */}
          <button
            type="button"
            onClick={() => handleAddQuestion('true_false')}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 hover:border-maroon-800 hover:bg-maroon-50/30 text-slate-700 hover:text-maroon-900 text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة سؤال جديد للفورم</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
          >
            إلغاء
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={Boolean(isPublishing)}
              onClick={() => handlePublishQuiz('draft')}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-black text-xs shadow-2xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              title="حفظ المسابقة كمسودة في لوحة الخادم دون إتاحتها للطلبة الآن"
            >
              {isPublishing === 'draft' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-800" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-amber-700" />
                  <span>💾 حفظ كمسودة (مغلقة)</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={Boolean(isPublishing)}
              onClick={() => handlePublishQuiz('active')}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-maroon-800 hover:bg-maroon-700 text-white font-black text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              title="حفظ المسابقة وإتاحتها للطلبة فوراً"
            >
              {isPublishing === 'active' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>جاري النشر...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-gold-300" />
                  <span>🚀 حفظ ونشر فوري للطلبة</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
