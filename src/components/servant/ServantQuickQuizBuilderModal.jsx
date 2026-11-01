import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Sparkles, Camera, Plus, Trash2, CheckCircle, HelpCircle, 
  Clock, Calendar, BookOpen, AlertCircle, Loader2, ArrowRight, Save, Edit3,
  UploadCloud, Link2, FileText
} from 'lucide-react';
import { transcribeHandwrittenQuizFromImage, extractQuizQuestionsFromText } from '../../services/geminiService';
import { compressImage } from '../../utils/imageCompressor';
import { db } from '../../firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { triggerServerPush } from '../../services/webPushService';

export default function ServantQuickQuizBuilderModal({
  isOpen,
  onClose,
  selectedGrade = 'first',
  getGradeTitle,
  currentGradeSubjects = [],
  user,
  onQuizPublished,
  editingQuiz = null
}) {
  const initialGrade = (selectedGrade === 'elisha') ? 'elisha' : 'common_hall';
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
  const [importMode, setImportMode] = useState('file'); // 'file' | 'link'
  const [linkOrTextInput, setLinkOrTextInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Synchronize state when opening for edit or new quiz
  useEffect(() => {
    if (!isOpen) return;
    if (editingQuiz) {
      setQuizTitle(editingQuiz.title || '');
      setSubject(editingQuiz.subject || currentGradeSubjects[0]?.name || 'كتاب مقدس');
      const qg = editingQuiz.grade;
      if (!qg || qg === 'first' || qg === 'cycle_1' || qg === 'common_hall') {
        setGrade('common_hall');
      } else {
        setGrade(qg);
      }
      setDeadline(editingQuiz.deadline || '');
      setDurationMinutes(editingQuiz.durationMinutes || 0);
      if (editingQuiz.questions && editingQuiz.questions.length > 0) {
        setQuestions(editingQuiz.questions);
      }
    } else {
      setQuizTitle('');
      setSubject(currentGradeSubjects[0]?.name || 'كتاب مقدس');
      setGrade(initialGrade);
      setDeadline('');
      setDurationMinutes(0);
      setQuestions([
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
    }
  }, [isOpen, editingQuiz]);

  if (!isOpen) return null;

  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = typeof result === 'string' ? result.split(',')[1] : '';
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  };

  const applyQuizResult = (result) => {
    if (result && Array.isArray(result.questions) && result.questions.length > 0) {
      if (result.quizTitle && !quizTitle.trim()) {
        setQuizTitle(result.quizTitle);
      }
      if (result.subject) {
        setSubject(result.subject);
      }
      setQuestions(result.questions.map((q, idx) => {
        const rawType = (q.type || '').toLowerCase();
        const normalizedType = (rawType === 'multiple_choice' || rawType === 'mcq') ? 'mcq' : (rawType === 'essay' ? 'essay' : 'true_false');
        return {
          id: `q_${Date.now()}_${idx}`,
          questionText: q.questionText || '',
          type: normalizedType,
          options: q.options || (normalizedType === 'true_false' ? ['صح', 'خطأ'] : ['اختيار 1', 'اختيار 2', 'اختيار 3', 'اختيار 4']),
          correctAnswer: q.correctAnswer || (normalizedType === 'true_false' ? 'صح' : (q.options?.[0] || '')),
          points: Number(q.points) || 2,
          explanation: q.explanation || ''
        };
      }));
      return true;
    }
    return false;
  };

  const processFile = async (file) => {
    if (!file) return;

    setIsAiProcessing(true);
    setAiError('');

    try {
      let result = null;
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isText = file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt');

      if (isImage) {
        const base64DataUrl = await compressImage(file, 1600, 0.85);
        const pureBase64 = base64DataUrl.split(',')[1];
        result = await transcribeHandwrittenQuizFromImage({
          fileBase64: pureBase64,
          mimeType: 'image/jpeg'
        });
      } else if (isPdf) {
        const pureBase64 = await readFileAsBase64(file);
        result = await transcribeHandwrittenQuizFromImage({
          fileBase64: pureBase64,
          mimeType: 'application/pdf'
        });
      } else if (isText) {
        const textContent = await readFileAsText(file);
        result = await extractQuizQuestionsFromText({ text: textContent });
      } else {
        const base64DataUrl = await compressImage(file, 1600, 0.85);
        const pureBase64 = base64DataUrl.split(',')[1];
        result = await transcribeHandwrittenQuizFromImage({
          fileBase64: pureBase64,
          mimeType: 'image/jpeg'
        });
      }

      const ok = applyQuizResult(result);
      if (!ok) {
        setAiError('تعذر استخراج أسئلة واضحة من الملف، يرجى التأكد من وضوح المحتوى واحتوائه على أسئلة.');
      }
    } catch (err) {
      console.error('File quiz AI extraction error:', err);
      setAiError(err.message || 'حدث خطأ أثناء معالجة الملف بالذكاء الاصطناعي.');
    } finally {
      setIsAiProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLinkOrTextSubmit = async () => {
    const input = linkOrTextInput.trim();
    if (!input) return;

    setIsAiProcessing(true);
    setAiError('');

    try {
      let textToAnalyze = input;

      if (input.startsWith('http://') || input.startsWith('https://')) {
        try {
          const response = await fetch('/api/fetch-quiz-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: input })
          });
          const resData = await response.json();
          if (response.ok && resData.success && resData.text) {
            textToAnalyze = resData.text;
          } else {
            throw new Error(resData.error || 'تعذر جلب محتوى الرابط');
          }
        } catch (fetchErr) {
          console.warn('Backend proxy fetch failed:', fetchErr);
          throw new Error(fetchErr.message || 'تعذر جلب النموذج من الرابط مباشرة، يمكنك نسخ نص الأسئلة ولصقه هنا مباشرة.');
        }
      }

      const result = await extractQuizQuestionsFromText({ text: textToAnalyze });
      const ok = applyQuizResult(result);
      if (!ok) {
        setAiError('لم يتم العثور على أسئلة واضحة في المحتوى المدخل.');
      } else {
        setLinkOrTextInput('');
      }
    } catch (err) {
      console.error('Link/Text quiz AI extraction error:', err);
      setAiError(err.message || 'حدث خطأ أثناء تحليل الرابط أو النص.');
    } finally {
      setIsAiProcessing(false);
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
      questions: questions.map(q => ({
        ...q,
        type: (q.type === 'multiple_choice' || q.type === 'mcq') ? 'mcq' : q.type
      })),
      type: 'online_quiz',
      status: targetStatus, // 'active' (متاحة للطلبة) | 'draft' (مسودة مغلقة)
      createdBy: user?.fullName || 'الخادم المسؤول',
      createdById: user?.id || null,
      createdAt: serverTimestamp()
    };

    try {
      if (editingQuiz?.id) {
        await updateDoc(doc(db, 'service_exams', editingQuiz.id), {
          ...quizData,
          status: editingQuiz.status || targetStatus,
          updatedBy: user?.fullName || 'الخادم المسؤول',
          updatedAt: serverTimestamp()
        });
        if (onQuizPublished) {
          onQuizPublished({ id: editingQuiz.id, ...quizData, status: editingQuiz.status || targetStatus });
        }
      } else {
        const docRef = await addDoc(collection(db, 'service_exams'), quizData);
        if (onQuizPublished) {
          onQuizPublished({ id: docRef.id, ...quizData });
        }

        // Send in-app notification & Web Push to students and servants if activated
        if (targetStatus === 'active') {
          try {
            const notifTitle = `📝 تم فتح تاسك جديدة: ${quizTitle.trim()}`;
            const notifBody = `تم نشر مسابقة جديدة لمرحلتكم: (${quizTitle.trim()}). آخر موعد لتسليم التاسك الخميس الساعة 12 بالليل.`;

            await addDoc(collection(db, 'notifications'), {
              targetUserId: grade || 'ALL',
              title: notifTitle,
              desc: notifBody,
              time: 'الآن',
              type: 'new_task',
              examId: docRef.id,
              createdAt: serverTimestamp()
            });

            // Trigger background Web Push to students & servants (even when app is closed)
            triggerServerPush({
              targetRole: 'students',
              targetGrade: grade || 'ALL',
              title: notifTitle,
              body: notifBody,
              url: '/'
            }).catch(() => {});

            triggerServerPush({
              targetRole: 'servants',
              title: `📢 تم نشر مسابقة جديدة: ${quizTitle.trim()}`,
              body: `قام الخادم (${user?.fullName || 'المسؤول'}) بنشر مسابقة وتفعيلها للطلبة. آخر موعد الخميس 12 بالليل.`,
              url: '/'
            }).catch(() => {});
          } catch (notifErr) {
            console.warn('Failed to send quiz notification:', notifErr);
          }
        }
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
              {editingQuiz ? (
                <>
                  <Edit3 className="w-5 h-5 text-gold-300" />
                  <span>تعديل المسابقة والتاسك ✏️</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-gold-300" />
                  <span>إنشاء مسابقة وتاسك سريع (Google Forms)</span>
                </>
              )}
            </h3>
            <p className="text-[11px] text-amber-200/90 mt-0.5">
              {editingQuiz 
                ? 'قم بتعديل الأسئلة أو العنوان أو الدرجات وحفظ التغييرات فوراً' 
                : 'صمم مسابقة تفاعلية لمرحلتك أو استورد الأسئلة تلقائياً بالذكاء الاصطناعي'}
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
          
          {/* AI Smart Import Section */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-slate-50 border border-amber-300/80 space-y-3.5">
            {/* Header with Title and Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-5 h-5 text-amber-200" />
                </div>
                <div>
                  <h4 className="font-black text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                    <span>استيراد وتفريغ الأسئلة تلقائياً</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 font-bold border border-amber-300/60">
                      ذكاء اصطناعي
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ارفع صورة، ملفاً، أو ضع رابط نموذج لتجهيز الأسئلة والخيارات فوراً
                  </p>
                </div>
              </div>

              {/* Mode Toggle Tabs */}
              <div className="flex items-center p-1 bg-amber-100/60 rounded-xl border border-amber-200/80 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setImportMode('file')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    importMode === 'file'
                      ? 'bg-white text-amber-900 shadow-xs'
                      : 'text-amber-800 hover:text-amber-950'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>رفع صورة أو ملف</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('link')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    importMode === 'link'
                      ? 'bg-white text-amber-900 shadow-xs'
                      : 'text-amber-800 hover:text-amber-950'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>رابط نموذج أو نص</span>
                </button>
              </div>
            </div>

            {/* Mode 1: File Upload with Drag & Drop */}
            {importMode === 'file' && (
              <div>
                <input 
                  type="file" 
                  accept="image/*,application/pdf,.txt" 
                  ref={fileInputRef}
                  onChange={(e) => processFile(e.target.files?.[0])}
                  className="hidden" 
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.[0]) {
                      processFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => {
                    if (!isAiProcessing) fileInputRef.current?.click();
                  }}
                  className={`p-4 sm:p-5 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${
                    isDragging
                      ? 'border-amber-600 bg-amber-100/50 scale-[1.01]'
                      : 'border-amber-300 hover:border-amber-500 bg-white/70 hover:bg-white'
                  } ${isAiProcessing ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  {isAiProcessing ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                      <span className="text-xs font-bold text-slate-700">
                        جاري فحص المستند واستخراج وتفريغ الأسئلة...
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          اسحب وأفلت الصورة أو الملف هنا، أو انقر للاختيار
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">
                          يدعم الصور بوضوح، ملفات PDF، والمستندات النصية
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Mode 2: Link / Text Input */}
            {importMode === 'link' && (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={linkOrTextInput}
                      onChange={(e) => setLinkOrTextInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isAiProcessing) {
                          e.preventDefault();
                          handleLinkOrTextSubmit();
                        }
                      }}
                      placeholder="ضع رابط Google Forms أو الصق نص المسابقة..."
                      className="w-full bg-white border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-bold placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isAiProcessing || !linkOrTextInput.trim()}
                    onClick={handleLinkOrTextSubmit}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    {isAiProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>جاري الاستخراج...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-gold-300" />
                        <span>استخراج الأسئلة</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  يمكنك وضع رابط استمارة Google Forms أو لصق أسئلة مكتوبة كنص مباشرة ليقوم الذكاء الاصطناعي بتنظيمها.
                </p>
              </div>
            )}
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
              <label className="block text-[11px] font-bold text-slate-700 mb-1">المرحلة الدراسية الموجه لها</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
              >
                <option value="common_hall">القاعة المشتركة (منهج المرحلة الأولى: سنة أولى + ثانية معاً) 🏛️</option>
                <option value="first_only">تخصيص لطلبة السنة الأولى فقط 🎓</option>
                <option value="second_only">تخصيص لطلبة السنة الثانية فقط 🎓</option>
                <option value="elisha">فصل أليشع (التمهيدي لإعداد الخدام) 🕊️</option>
                <option value="all">كافة المراحل والخدام (مسابقة عامة) 🌟</option>
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
            {editingQuiz ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={Boolean(isPublishing)}
                  onClick={() => handlePublishQuiz('draft')}
                  className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl border font-black text-xs shadow-2xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer ${
                    editingQuiz.status === 'draft' 
                      ? 'bg-amber-100 text-amber-950 border-amber-400 ring-2 ring-amber-300' 
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300'
                  }`}
                  title="حفظ التعديلات كمسودة مغلقة (غير متاحة للمخدومين)"
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
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-black text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  title="حفظ التعديلات وتفعيل التاسك للمخدومين فوراً"
                >
                  {isPublishing === 'active' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>جاري الحفظ والنشر...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-gold-300" />
                      <span>🚀 حفظ ونشر للمخدومين</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
