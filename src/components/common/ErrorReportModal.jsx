import React, { useState, useRef, useEffect } from 'react';
import { X, AlertTriangle, Send, CheckCircle2, AlertCircle, Mic, Square, Trash2 } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function ErrorReportModal({ isOpen, onClose, currentUser }) {
  const [description, setDescription] = useState('');
  const [screenName, setScreenName] = useState('عام');
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

  const screens = [
    'عام',
    'شاشة تسجيل الحضور (QR / PIN)',
    'النوتة الروحية',
    'المناهج والمحاضرات',
    'بنك الأسئلة والامتحانات',
    'الملف الشخصي والحساب',
    'لوحة الخادم والإحصائيات'
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
    if (!description.trim() && !audioDataUrl) {
      setErrorMsg('يرجى كتابة وصف المشكلة أو تسجيل فويس نوت صوتي بها.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const now = new Date();
      const pad = (n) => (n < 10 ? '0' : '') + n;
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const period = hours >= 12 ? 'م' : 'ص';
      const h12 = hours % 12 || 12;
      const formattedTime = `${pad(h12)}:${pad(minutes)} ${period} • ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      await addDoc(collection(db, 'app_errors'), {
        errorMessage: description.trim() ? `[بلاغ يدوي]: ${description.trim().substring(0, 100)}` : `[بلاغ صوتي من الشاشة: ${screenName}]`,
        errorName: `بلاغ عطل (${screenName})`,
        errorStack: `وصف المستخدم:\n${description.trim() || 'تم إرفاق تسجيل صوتي'}\n\nالشاشة: ${screenName}`,
        componentStack: `تم الإبلاغ يدوياً من الشاشة: ${screenName}`,
        audioDataUrl: audioDataUrl || null,
        timestampFormatted: formattedTime,
        url: window.location.href,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        userAgent: navigator.userAgent,
        status: 'unresolved',
        user: {
          fullName: currentUser?.fullName || 'زائر',
          phone: currentUser?.phone || 'بدون هاتف',
          role: currentUser?.role || 'غير معروف',
          grade: currentUser?.grade || ''
        },
        createdAt: serverTimestamp()
      });

      // Send in-app notification to Super Admin exclusively
      addDoc(collection(db, 'notifications'), {
        targetUserId: 'SUPER_ADMIN',
        title: `⚠️ بلاغ عطل فني: ${screenName || 'شاشة غير محددة'}`,
        desc: `أرسل (${currentUser?.fullName || 'مستخدم'} - ${currentUser?.phone || ''}) بلاغاً عن عطل: ${description.trim().substring(0, 80) || 'تسجيل صوتي مرفق'}.`,
        time: 'الآن',
        type: 'app_error_report',
        createdAt: serverTimestamp()
      }).catch(() => {});

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setDescription('');
        deleteRecording();
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error submitting error report:', err);
      setErrorMsg('تعذر إرسال البلاغ حالياً، يرجى المحاولة لاحقاً.');
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
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">إبلاغ عن عطل فني</h3>
              <p className="text-[11px] text-slate-500">سيتم إرسال البلاغ فوراً للمشرف لمراجعته</p>
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
            <h4 className="text-sm font-extrabold text-slate-900">تم استلام بلاغك بنجاح!</h4>
            <p className="text-xs text-slate-500">شكراً لمساعدتنا في تحسين استقرار المنظومة، جاري مراجعة المشكلة.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Screen */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الشاشة أو القسم المعني</label>
              <select
                value={screenName}
                onChange={(e) => setScreenName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-rose-700"
              >
                {screens.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">وصف العطل أو الخطأ (نصياً أو بالتسجيل الصوتي)</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اشرح ماذا حدث معك بالضبط وما هي الرسالة أو السلوك غير المتوقع..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-rose-700 resize-none"
              />
            </div>

            {/* Voice Note Recording Section */}
            <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-2xl space-y-2">
              <span className="text-[11px] font-bold text-rose-950 block">تسجيل صوتي للملاحظة (اختياري)</span>
              
              {!audioUrl && !isRecording && (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-full py-2 px-3 rounded-xl bg-white hover:bg-rose-100/70 border border-rose-300 text-rose-900 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  <Mic className="w-4 h-4 text-rose-600" />
                  <span>تسجيل رسالة صوتية توضيحية</span>
                </button>
              )}

              {isRecording && (
                <div className="flex items-center justify-between p-2 bg-rose-100/80 border border-rose-300 rounded-xl animate-pulse">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
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
                <div className="flex items-center gap-2 p-2 bg-white border border-rose-200 rounded-xl">
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
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'جاري الإرسال...' : 'إرسال البلاغ الآن'}</span>
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
