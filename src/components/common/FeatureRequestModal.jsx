import React, { useState, useRef, useEffect } from 'react';
import { X, Lightbulb, Send, CheckCircle2, AlertCircle, Mic, Square, Trash2, Volume2 } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function FeatureRequestModal({ isOpen, onClose, currentUser }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('مناهج ومذكرات');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Voice Note Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioDataUrl, setAudioDataUrl] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!isOpen) return null;

  const categories = [
    { id: 'مناهج ومذكرات', label: 'المناهج والمحاضرات' },
    { id: 'بنك الأسئلة والامتحانات', label: 'الامتحانات وبنك الأسئلة' },
    { id: 'النوتة الروحية', label: 'النوتة الروحية والافتقاد' },
    { id: 'حضور وغياب', label: 'الحضور والـ QR كود' },
    { id: 'ذكاء اصطناعي كنسي', label: 'استوديو الذكاء الاصطناعي' },
    { id: 'تصميم وسهولة استخدام', label: 'تحسين الواجهة والسهولة' },
    { id: 'عام', label: 'فكرة أو اقتراح عام' }
  ];

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const previewUrl = URL.createObjectURL(blob);
        setAudioUrl(previewUrl);

        // Convert blob to base64 DataURL for persistent storage in Firestore
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          setAudioDataUrl(reader.result);
        };

        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      setAudioUrl(null);
      setAudioDataUrl(null);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      alert('تعذر فتح الميكروفون: يرجى السماح بصلاحية الميكروفون من إعدادات المتصفح.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const deleteRecording = () => {
    setAudioUrl(null);
    setAudioDataUrl(null);
    setRecordingSeconds(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() && !audioDataUrl) {
      setErrorMsg('يرجى كتابة عنوان الاقتراح أو تسجيل فويس نوت صوتي للفكرة.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      await addDoc(collection(db, 'feature_suggestions'), {
        title: title.trim() || 'اقتراح صوتي (فويس نوت)',
        category,
        description: description.trim(),
        audioDataUrl: audioDataUrl || null,
        userId: currentUser?.id || 'guest',
        userName: currentUser?.fullName || 'مستخدم مجهول',
        userPhone: currentUser?.phone || '',
        userRole: currentUser?.role || 'student',
        userGrade: currentUser?.grade || '',
        status: 'open', // open | in_review | completed
        createdAt: serverTimestamp()
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setTitle('');
        setDescription('');
        deleteRecording();
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error submitting feature request:', err);
      setErrorMsg('حدث خطأ أثناء إرسال الاقتراح، يرجى المحاولة لاحقاً.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 font-cairo text-right">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
              <Lightbulb className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">اقترح ميزة أو وظيفة جديدة</h3>
              <p className="text-[11px] text-slate-500">شاركنا أفكارك لتطوير المنصة والخدمة</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
            <h4 className="text-sm font-extrabold text-slate-900">شكراً لمشاركتك! تم تسجيل اقتراحك بنجاح</h4>
            <p className="text-xs text-slate-500">سيتم دراسة الفكرة بواسطة مشرف المنصة بعناية.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">قسم الاقتراح</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-maroon-700"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الفكرة باختصار</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: إضافة زر لتنزيل كل ملفات المادة دفعة واحدة"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-maroon-700"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تفاصيل الفكرة (نصياً أو بالتسجيل الصوتي)</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اشرح الفكرة والهدف منها وكيف ستسهل على الخادم أو المخدوم..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-maroon-700 resize-none"
              />
            </div>

            {/* Voice Note Recording Section */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2">
              <span className="text-[11px] font-bold text-amber-950 block">تسجيل فويس نوت صوتي للفكرة (اختياري 🎙️)</span>
              
              {!audioUrl && !isRecording && (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-full py-2 px-3 rounded-xl bg-white hover:bg-amber-100/70 border border-amber-300 text-amber-900 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  <Mic className="w-4 h-4 text-amber-600" />
                  <span>اضغط لتسجيل فويس نوت صوتي</span>
                </button>
              )}

              {isRecording && (
                <div className="flex items-center justify-between p-2 bg-rose-50 border border-rose-200 rounded-xl animate-pulse">
                  <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                    <span>جاري التسجيل... ({recordingSeconds} ثانية)</span>
                  </div>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="py-1 px-3 bg-rose-600 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Square className="w-3 h-3" />
                    <span>إيقاف</span>
                  </button>
                </div>
              )}

              {audioUrl && (
                <div className="flex items-center gap-2 p-2 bg-white border border-amber-200 rounded-xl">
                  <audio controls src={audioUrl} className="h-8 flex-1" />
                  <button
                    type="button"
                    onClick={deleteRecording}
                    className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="حذف التسجيل"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="submit"
                disabled={submitting || isRecording}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'جاري الإرسال...' : 'إرسال الاقتراح'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
