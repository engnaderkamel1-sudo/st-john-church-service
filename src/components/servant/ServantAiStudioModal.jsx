import React, { useState } from 'react';
import { 
  Sparkles, Upload, FileText, Image as ImageIcon, CheckCircle, 
  AlertCircle, X, ChevronRight, BookOpen, Layers, Presentation, 
  Trash2, Plus, Edit3, Send, Play, Copy, Check 
} from 'lucide-react';
import { generateChurchQuestions, generateChurchPresentation, generateChurchStudyGuide } from '../../services/geminiService';

export default function ServantAiStudioModal({ isOpen, onClose, onAddQuestionsToBank, onOpenPresentation, initialGrade = 'first', initialMode = 'questions' }) {
  const [activeMode, setActiveMode] = useState(initialMode); // 'questions' | 'presentation' | 'study_guide'
  const [selectedGrade, setSelectedGrade] = useState(initialGrade);
  const [questionCount, setQuestionCount] = useState(5);
  const [slideCount, setSlideCount] = useState(6);
  
  // Input File & Text State
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBase64, setFileBase64] = useState('');
  const [fileMimeType, setFileMimeType] = useState('');
  const [manualText, setManualText] = useState('');
  
  // Status & Generated Data State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [generatedPresentation, setGeneratedPresentation] = useState(null);
  const [generatedStudyGuide, setGeneratedStudyGuide] = useState(null);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Inline Editing States
  const [editingQuestionIdx, setEditingQuestionIdx] = useState(null);
  const [editQuestionData, setEditQuestionData] = useState(null);

  const [editingSlideIdx, setEditingSlideIdx] = useState(null);
  const [editSlideData, setEditSlideData] = useState(null);

  const [isEditingStudyGuide, setIsEditingStudyGuide] = useState(false);
  const [editStudyGuideData, setEditStudyGuideData] = useState(null);

  if (!isOpen) return null;

  // Question Edit Handlers
  const handleStartEditQuestion = (q, idx) => {
    setEditingQuestionIdx(idx);
    setEditQuestionData({ ...q, options: [...(q.options || [])] });
  };

  const handleSaveEditQuestion = (idx) => {
    if (!editQuestionData) return;
    setGeneratedQuestions(prev => prev.map((q, i) => i === idx ? editQuestionData : q));
    setEditingQuestionIdx(null);
    setEditQuestionData(null);
  };

  const handleCancelEditQuestion = () => {
    setEditingQuestionIdx(null);
    setEditQuestionData(null);
  };

  // Slide Edit Handlers
  const handleStartEditSlide = (slide, idx) => {
    setEditingSlideIdx(idx);
    setEditSlideData({ ...slide, bullets: [...(slide.bullets || [])] });
  };

  const handleSaveEditSlide = (idx) => {
    if (!editSlideData || !generatedPresentation) return;
    const updatedSlides = generatedPresentation.slides.map((s, i) => i === idx ? editSlideData : s);
    setGeneratedPresentation({ ...generatedPresentation, slides: updatedSlides });
    setEditingSlideIdx(null);
    setEditSlideData(null);
  };

  const handleCancelEditSlide = () => {
    setEditingSlideIdx(null);
    setEditSlideData(null);
  };

  // Study Guide Edit Handlers
  const handleStartEditStudyGuide = () => {
    if (!generatedStudyGuide) return;
    setIsEditingStudyGuide(true);
    setEditStudyGuideData({
      ...generatedStudyGuide,
      mainPoints: [...(generatedStudyGuide.mainPoints || [])],
      spiritualApplications: [...(generatedStudyGuide.spiritualApplications || [])]
    });
  };

  const handleSaveEditStudyGuide = () => {
    if (!editStudyGuideData) return;
    setGeneratedStudyGuide(editStudyGuideData);
    setIsEditingStudyGuide(false);
    setEditStudyGuideData(null);
  };

  const handleCancelEditStudyGuide = () => {
    setIsEditingStudyGuide(false);
    setEditStudyGuideData(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError('حجم الملف كبير (الحد الأقصى 20 ميجابايت). يرجى رفع درس أو جزء محدد.');
      return;
    }

    setSelectedFile(file);
    setError('');

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const base64Content = result.split(',')[1];
        setFileBase64(base64Content);
        setFileMimeType(file.type || 'application/pdf');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setFileBase64('');
    setFileMimeType('');
  };

  const handleGenerate = async () => {
    if (!fileBase64 && (!manualText || manualText.trim().length < 15)) {
      setError('يرجى رفع ملف (PDF أو صورة) أو كتابة نص الدرس المطلوب (15 حرفاً على الأقل).');
      return;
    }

    setLoading(true);
    setError('');
    setAddedSuccess(false);

    try {
      if (activeMode === 'questions') {
        const questions = await generateChurchQuestions({
          fileBase64,
          mimeType: fileMimeType,
          textContent: manualText,
          grade: selectedGrade,
          count: questionCount
        });
        setGeneratedQuestions(questions || []);
      } else if (activeMode === 'presentation') {
        const pres = await generateChurchPresentation({
          fileBase64,
          mimeType: fileMimeType,
          textContent: manualText,
          grade: selectedGrade,
          slideCount
        });
        setGeneratedPresentation(pres);
      } else if (activeMode === 'study_guide') {
        const guide = await generateChurchStudyGuide({
          fileBase64,
          mimeType: fileMimeType,
          textContent: manualText,
          grade: selectedGrade
        });
        setGeneratedStudyGuide(guide);
      }
    } catch (err) {
      console.error('AI Generation Error:', err);
      setError(err.message || 'حدث خطأ أثناء معالجة المستند بالذكاء الاصطناعي.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGeneratedQuestion = (idx) => {
    setGeneratedQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddAllToBank = () => {
    if (generatedQuestions.length === 0) return;
    const formatted = generatedQuestions.map((q, idx) => ({
      id: `ai_${Date.now()}_${idx}`,
      grade: selectedGrade,
      questionText: q.questionText,
      type: q.type || 'mcq',
      options: q.options || [],
      correctAnswer: q.correctAnswer || '',
      points: q.points || 5,
      explanation: q.explanation || '',
      createdAt: new Date().toLocaleDateString('ar-EG')
    }));

    if (onAddQuestionsToBank) {
      onAddQuestionsToBank(formatted);
      setAddedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 text-right animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-maroon-900 to-maroon-800 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-gold-400 border border-white/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                الاستوديو الذكي للخادم (AI Assistant)
              </h3>
              <p className="text-xs text-maroon-200 mt-0.5">
                توليد امتحانات، شرائح Data Show، وكبسولات الدروس مباشرة من كتب ومذكرات الخدمة.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-maroon-200 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Mode Tabs */}
          <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <button
              onClick={() => { setActiveMode('questions'); setError(''); }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeMode === 'questions' ? 'bg-maroon-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>امتحانات وأسئلة 📝</span>
            </button>

            <button
              onClick={() => { setActiveMode('presentation'); setError(''); }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeMode === 'presentation' ? 'bg-maroon-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Presentation className="w-4 h-4" />
              <span>شرائح Data Show 📊</span>
            </button>

            <button
              onClick={() => { setActiveMode('study_guide'); setError(''); }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeMode === 'study_guide' ? 'bg-maroon-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>كبسولة الدرس 📖</span>
            </button>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">المرحلة الدراسية المستهدفة:</label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800"
              >
                <option value="first">سنة أولى ثانوي</option>
                <option value="second">سنة ثانية ثانوي</option>
                <option value="third">سنة ثالثة ثانوي</option>
                <option value="elisha">فصل أليشع (إعداد خدام)</option>
              </select>
            </div>

            {activeMode === 'questions' ? (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">عدد الأسئلة المطلوب استخراجها:</label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800"
                >
                  <option value={3}>3 أسئلة سريعة</option>
                  <option value={5}>5 أسئلة نموذجية</option>
                  <option value={10}>10 أسئلة متكاملة</option>
                  <option value={15}>15 سؤال شامل</option>
                </select>
              </div>
            ) : activeMode === 'presentation' ? (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">عدد شرائح العرض:</label>
                <select
                  value={slideCount}
                  onChange={(e) => setSlideCount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800"
                >
                  <option value={4}>4 شرائح (موجز سريع)</option>
                  <option value={6}>6 شرائح (الأنسب لقاعة الخدمة)</option>
                  <option value={8}>8 شرائح (درس مفصل)</option>
                </select>
              </div>
            ) : (
              <div className="flex items-end">
                <span className="text-xs text-slate-500 pb-2">توليد ملخص شامل مع أسئلة نقاش وشواهد آبائية.</span>
              </div>
            )}
          </div>

          {/* File Upload & Input Area */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 block">مصدر الدرس (ارفع ملف أو الصق النص):</label>
            
            {!selectedFile ? (
              <label className="border-2 border-dashed border-slate-300 hover:border-maroon-800 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50 hover:bg-slate-100/60">
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-maroon-800 flex items-center justify-center shadow-xs mb-2">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-800">اضغط لرفع ملف PDF أو صورة صفحة الكتاب</span>
                <span className="text-[11px] text-slate-400 mt-1">يدعم مذكرات PDF، وصور كاميرا الموبايل لكتب المسابقات (حتى 20 ميجابايت)</span>
              </label>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block text-sm">{selectedFile.name}</span>
                    <span className="text-emerald-700 font-medium">({Math.round(selectedFile.size / 1024)} KB) • جاهز للمعالجة</span>
                  </div>
                </div>
                <button onClick={handleClearFile} className="text-red-600 hover:bg-red-50 p-2 rounded-xl text-xs font-bold">
                  إزالة الملف ✕
                </button>
              </div>
            )}

            <div>
              <span className="text-xs text-slate-500 font-bold block mb-1">أو كتابة/لصق نص الدرس مباشرة:</span>
              <textarea
                rows={3}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="الصق نص المحاضرة أو أصحاح الكتاب المقدس أو ملخص الدرس هنا..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-maroon-800"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Trigger Button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-gradient-to-r from-maroon-900 to-maroon-800 hover:from-maroon-800 hover:to-maroon-700 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>جاري قراءة وتحليل المستند بالذكاء الاصطناعي الأرثوذكسي...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-gold-400" />
                <span>
                  {activeMode === 'questions' ? 'توليد بنك الأسئلة الآن 🪄' : activeMode === 'presentation' ? 'توليد عرض الشرائح للـ Data Show 📊' : 'توليد كبسولة الدرس 📖'}
                </span>
              </>
            )}
          </button>

          {/* Results: Questions Review */}
          {activeMode === 'questions' && generatedQuestions.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900">
                  تم استخراج ({generatedQuestions.length}) سؤال جاهز للمراجعة:
                </span>
                <button
                  onClick={handleAddAllToBank}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                >
                  {addedSuccess ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{addedSuccess ? 'تمت الإضافة بنجاح ✓' : 'إضافة الكل لبنك الأسئلة 💾'}</span>
                </button>
              </div>

              <div className="space-y-3">
                {generatedQuestions.map((q, idx) => {
                  const isEditing = editingQuestionIdx === idx;

                  if (isEditing && editQuestionData) {
                    return (
                      <div key={idx} className="bg-white border-2 border-maroon-800 p-4 rounded-2xl space-y-3 shadow-md">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-extrabold text-xs text-maroon-900">تعديل السؤال {idx + 1}</span>
                          <span className="text-[10px] text-slate-500">حدد الإجابة الصحيحة بالضغط على الدائرة</span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">نص السؤال:</label>
                          <textarea
                            rows={2}
                            value={editQuestionData.questionText}
                            onChange={(e) => setEditQuestionData({ ...editQuestionData, questionText: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-maroon-800"
                          />
                        </div>

                        {editQuestionData.options && editQuestionData.options.length > 0 && (
                          <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-slate-700">خيارات الإجابة:</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {editQuestionData.options.map((opt, oIdx) => (
                                <div key={oIdx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                                  <input
                                    type="radio"
                                    name={`correct_${idx}`}
                                    checked={editQuestionData.correctAnswer === opt}
                                    onChange={() => setEditQuestionData({ ...editQuestionData, correctAnswer: opt })}
                                    className="accent-maroon-800"
                                    title="تحديد كإجابة صحيحة"
                                  />
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => {
                                      const newOpts = [...editQuestionData.options];
                                      const oldVal = newOpts[oIdx];
                                      newOpts[oIdx] = e.target.value;
                                      const newCorrect = editQuestionData.correctAnswer === oldVal ? e.target.value : editQuestionData.correctAnswer;
                                      setEditQuestionData({ ...editQuestionData, options: newOpts, correctAnswer: newCorrect });
                                    }}
                                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-maroon-800"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">الشاهد والشرح:</label>
                          <input
                            type="text"
                            value={editQuestionData.explanation || ''}
                            onChange={(e) => setEditQuestionData({ ...editQuestionData, explanation: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-maroon-800"
                            placeholder="مثال: يوحنا 15: 16"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={handleCancelEditQuestion}
                            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors"
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditQuestion(idx)}
                            className="bg-maroon-800 hover:bg-maroon-700 text-white px-4 py-1.5 text-xs rounded-xl font-bold flex items-center gap-1 shadow-xs transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>حفظ التعديل</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={idx} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-500 font-bold">
                        <span className="text-maroon-800 font-extrabold">سؤال {idx + 1} ({q.type === 'mcq' ? 'اختيار من متعدد' : q.type === 'true_false' ? 'صح وخطأ' : 'مقالي'})</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEditQuestion(q, idx)}
                            className="text-slate-600 hover:text-maroon-800 hover:bg-white p-1 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold border border-slate-200"
                            title="تعديل السؤال"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </button>
                          <button
                            onClick={() => handleDeleteGeneratedQuestion(idx)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="font-extrabold text-slate-900 text-sm leading-relaxed">{q.questionText}</p>

                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`p-2 rounded-xl border text-[11px] font-medium ${
                                opt === q.correctAnswer ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              {opt} {opt === q.correctAnswer ? '✓ (صحيحة)' : ''}
                            </div>
                          ))}
                        </div>
                      )}

                      {q.explanation && (
                        <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200 mt-1">
                          💡 <strong>الشاهد والشرح:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Results: Presentation Preview */}
          {activeMode === 'presentation' && generatedPresentation && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="p-6 bg-gradient-to-br from-slate-900 to-maroon-950 text-white rounded-3xl space-y-3 text-center">
                <Presentation className="w-10 h-10 text-gold-400 mx-auto" />
                <h4 className="text-lg font-extrabold">{generatedPresentation.title}</h4>
                <p className="text-xs text-slate-300">
                  تم تجهيز ({generatedPresentation.slides?.length || 0}) شريحة تفاعلية لشرح الدرس.
                </p>
                <button
                  onClick={() => onOpenPresentation && onOpenPresentation(generatedPresentation)}
                  className="bg-gold-400 hover:bg-gold-500 text-slate-950 font-extrabold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md inline-flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>بدء العرض التقديمي الآن ملء الشاشة 🖥️</span>
                </button>
              </div>

              {/* Editable Slides List */}
              <div className="space-y-3 pt-2 text-right">
                <h5 className="font-extrabold text-xs text-slate-800">مراجعة وتعديل الشرائح قبل العرض:</h5>
                {(generatedPresentation.slides || []).map((slide, sIdx) => {
                  const isEditingSlide = editingSlideIdx === sIdx;

                  if (isEditingSlide && editSlideData) {
                    return (
                      <div key={sIdx} className="bg-white border-2 border-maroon-800 p-4 rounded-2xl space-y-3 shadow-md text-right text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-extrabold text-maroon-900">تعديل الشريحة {sIdx + 1}</span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان الشريحة:</label>
                          <input
                            type="text"
                            value={editSlideData.title || ''}
                            onChange={(e) => setEditSlideData({ ...editSlideData, title: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-maroon-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">الآية المحورية / الشاهد:</label>
                          <input
                            type="text"
                            value={editSlideData.keyScripture || ''}
                            onChange={(e) => setEditSlideData({ ...editSlideData, keyScripture: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-maroon-800"
                            placeholder="مثال: يوحنا 1: 1"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-slate-700">نقاط الشرح (Bullets):</label>
                            <button
                              type="button"
                              onClick={() => setEditSlideData({ ...editSlideData, bullets: [...(editSlideData.bullets || []), 'نقطة جديدة'] })}
                              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-lg font-bold"
                            >
                              + إضافة نقطة
                            </button>
                          </div>
                          {(editSlideData.bullets || []).map((bullet, bIdx) => (
                            <div key={bIdx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={bullet}
                                onChange={(e) => {
                                  const updatedBullets = [...editSlideData.bullets];
                                  updatedBullets[bIdx] = e.target.value;
                                  setEditSlideData({ ...editSlideData, bullets: updatedBullets });
                                }}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-maroon-800"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedBullets = editSlideData.bullets.filter((_, i) => i !== bIdx);
                                  setEditSlideData({ ...editSlideData, bullets: updatedBullets });
                                }}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">تأمل وملاحظات الخادم (Speaker Notes):</label>
                          <textarea
                            rows={2}
                            value={editSlideData.speakerNotes || ''}
                            onChange={(e) => setEditSlideData({ ...editSlideData, speakerNotes: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:border-maroon-800"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={handleCancelEditSlide}
                            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditSlide(sIdx)}
                            className="bg-maroon-800 hover:bg-maroon-700 text-white px-4 py-1.5 text-xs rounded-xl font-bold flex items-center gap-1 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>حفظ الشريحة</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={sIdx} className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-maroon-900">شريحة {sIdx + 1}: {slide.title}</span>
                          {slide.keyScripture && <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">«{slide.keyScripture}»</span>}
                        </div>
                        <p className="text-slate-500 text-[11px]">
                          {(slide.bullets || []).length} نقاط شرح • {slide.speakerNotes ? 'يوجد ملاحظات إلقاء' : 'بدون ملاحظات'}
                        </p>
                      </div>

                      <button
                        onClick={() => handleStartEditSlide(slide, sIdx)}
                        className="text-slate-600 hover:text-maroon-800 hover:bg-white p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold border border-slate-200 shrink-0"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Results: Study Guide Preview & Edit */}
          {activeMode === 'study_guide' && generatedStudyGuide && (
            <div className="space-y-4 pt-4 border-t border-slate-200 text-right text-xs">
              {isEditingStudyGuide && editStudyGuideData ? (
                <div className="bg-white border-2 border-maroon-800 p-5 rounded-2xl space-y-4 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-extrabold text-maroon-900 text-sm">تعديل كبسولة وملخص الدرس</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان الموضوع:</label>
                    <input
                      type="text"
                      value={editStudyGuideData.title || ''}
                      onChange={(e) => setEditStudyGuideData({ ...editStudyGuideData, title: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-maroon-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">فقرة الملخص العام:</label>
                    <textarea
                      rows={3}
                      value={editStudyGuideData.summary || ''}
                      onChange={(e) => setEditStudyGuideData({ ...editStudyGuideData, summary: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-maroon-800"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700">الأفكار الرئيسية:</label>
                      <button
                        type="button"
                        onClick={() => setEditStudyGuideData({ ...editStudyGuideData, mainPoints: [...(editStudyGuideData.mainPoints || []), 'فكرة جديدة'] })}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold"
                      >
                        + إضافة فكرة
                      </button>
                    </div>
                    {(editStudyGuideData.mainPoints || []).map((pt, pIdx) => (
                      <div key={pIdx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={pt}
                          onChange={(e) => {
                            const updated = [...editStudyGuideData.mainPoints];
                            updated[pIdx] = e.target.value;
                            setEditStudyGuideData({ ...editStudyGuideData, mainPoints: updated });
                          }}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-maroon-800"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editStudyGuideData.mainPoints.filter((_, i) => i !== pIdx);
                            setEditStudyGuideData({ ...editStudyGuideData, mainPoints: updated });
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700">التطبيقات الروحية:</label>
                      <button
                        type="button"
                        onClick={() => setEditStudyGuideData({ ...editStudyGuideData, spiritualApplications: [...(editStudyGuideData.spiritualApplications || []), 'تطبيق روحي جديد'] })}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold"
                      >
                        + إضافة تطبيق
                      </button>
                    </div>
                    {(editStudyGuideData.spiritualApplications || []).map((app, aIdx) => (
                      <div key={aIdx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={app}
                          onChange={(e) => {
                            const updated = [...editStudyGuideData.spiritualApplications];
                            updated[aIdx] = e.target.value;
                            setEditStudyGuideData({ ...editStudyGuideData, spiritualApplications: updated });
                          }}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-maroon-800"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editStudyGuideData.spiritualApplications.filter((_, i) => i !== aIdx);
                            setEditStudyGuideData({ ...editStudyGuideData, spiritualApplications: updated });
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleCancelEditStudyGuide}
                      className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEditStudyGuide}
                      className="bg-maroon-800 hover:bg-maroon-700 text-white px-4 py-1.5 text-xs rounded-xl font-bold flex items-center gap-1 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>حفظ التعديلات</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <h4 className="font-extrabold text-slate-900 text-base">{generatedStudyGuide.title}</h4>
                    <button
                      onClick={handleStartEditStudyGuide}
                      className="bg-white border border-slate-200 hover:border-maroon-800 text-slate-700 hover:text-maroon-900 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل الملخص</span>
                    </button>
                  </div>

                  <p className="text-slate-700 leading-relaxed">{generatedStudyGuide.summary}</p>
                  
                  {generatedStudyGuide.mainPoints && (
                    <div className="space-y-1.5 pt-2">
                      <strong className="text-maroon-800 block font-extrabold">📌 الأفكار الرئيسية:</strong>
                      {generatedStudyGuide.mainPoints.map((p, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-slate-800">
                          <span className="text-gold-500 font-bold">•</span>
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {generatedStudyGuide.spiritualApplications && (
                    <div className="space-y-1.5 pt-2">
                      <strong className="text-emerald-700 block font-extrabold">🕊️ التطبيق الروحي لحياة الخادم:</strong>
                      {generatedStudyGuide.spiritualApplications.map((app, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-slate-800">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>{app}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
