import React, { useState, useEffect } from 'react';
import { 
  Bell, Send, Plus, Trash2, Edit3, CheckCircle, Clock, 
  Users, User, Sparkles, X, AlertCircle, MessageSquare 
} from 'lucide-react';
import { 
  collection, query, orderBy, onSnapshot, 
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase';

export default function ServantNotificationsHub({ currentUser, allStudents = [] }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isComposing, setIsComposing] = useState(false);
  const [editingNotif, setEditingNotif] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [targetType, setTargetType] = useState('ALL'); // 'ALL' | 'common_hall' | 'elisha' | 'specific_student'
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Standard Ready Templates (قوالب قياسية جاهزة بضغطة زر)
  const STANDARD_TEMPLATES = [
    {
      id: 'weekly_meeting',
      badge: '⛪ موعد اللقاء',
      title: 'تذكير بموعد لقاء الخدمة الأسبوعي القادم ⛪',
      desc: 'نلتقي بمشيئة ربنا يوم الجمعة القادم الساعة 10:30 صباحاً في قاعة الكنيسة بالمعراج. ننتظر حضوركم جميعاً ببركة ربنا!',
      target: 'ALL'
    },
    {
      id: 'attendance_start',
      badge: '📷 بدء الحضور',
      title: 'بدء تسجيل الحضور الآن في الخدمة! 📷',
      desc: 'تم فتح تسجيل الحضور الآن، يرجى مسح كود الـ QR أو إدخال الـ PIN لتأكيد حضورك اليوم ببركة ربنا.',
      target: 'ALL'
    },
    {
      id: 'weekly_task',
      badge: '✍️ تكليف وتاسك',
      title: 'تذكير بالتاسك والمسابقة الأسبوعية ✍️',
      desc: 'تم رصد تكليف الأسبوع الجديد على المنصة، يرجى الدخول لصفحة التاسكات وحل الأسئلة للمتابعة والتطبيق الروحي.',
      target: 'ALL'
    },
    {
      id: 'important_alert',
      badge: '⚠️ تنبيه هام',
      title: 'تنبيه هام لجميع المخدومين ⚠️',
      desc: 'نرجو من جميع المخدومين الانتباه والالتزام بتعليمات وملاحظات الخدمة استعداداً للقاء القادم.',
      target: 'ALL'
    },
    {
      id: 'spiritual_feast',
      badge: '🎉 تهنئة بالعيد',
      title: 'كل عام وأنتم بخير بمناسبة العيد المبارك 🎉',
      desc: 'خدام وأمناء أسرة إعداد خدام يهنئونكم ببركة العيد والأيام المقدسة، طالبين صلواتكم من أجل الخدمة المباركة.',
      target: 'ALL'
    }
  ];

  // 1. Listen to all notifications real-time
  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotifications(list);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching notifications:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // 2. Pre-fill from template
  const handleApplyTemplate = (tpl) => {
    setTitle(tpl.title);
    setDesc(tpl.desc);
    setTargetType(tpl.target);
    setIsComposing(true);
    setEditingNotif(null);
  };

  // 3. Open Edit Mode
  const handleEdit = (notif) => {
    setEditingNotif(notif);
    setTitle(notif.title || '');
    setDesc(notif.desc || '');
    if (notif.targetUserId === 'ALL') {
      setTargetType('ALL');
    } else if (notif.targetUserId === 'common_hall' || notif.targetUserId === 'cycle_1') {
      setTargetType('common_hall');
    } else if (notif.targetUserId === 'elisha') {
      setTargetType('elisha');
    } else {
      setTargetType('specific_student');
      setSelectedStudentId(notif.targetUserId || '');
    }
    setIsComposing(true);
  };

  // 4. Cancel Compose / Edit
  const handleCancel = () => {
    setIsComposing(false);
    setEditingNotif(null);
    setTitle('');
    setDesc('');
    setTargetType('ALL');
    setSelectedStudentId('');
  };

  // 5. Submit (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !desc.trim()) {
      alert('يرجى كتابة عنوان التنبيه ونص الرسالة أولاً.');
      return;
    }

    let finalTargetUserId = 'ALL';
    let targetLabel = 'جميع المخدومين';

    if (targetType === 'common_hall') {
      finalTargetUserId = 'common_hall';
      targetLabel = 'المرحلة الأولى (سنة أولى + ثانية معاً)';
    } else if (targetType === 'elisha') {
      finalTargetUserId = 'elisha';
      targetLabel = 'فصل أليشع (إعداد خدام)';
    } else if (targetType === 'specific_student') {
      if (!selectedStudentId) {
        alert('يرجى اختيار المخدوم من القائمة أولاً.');
        return;
      }
      finalTargetUserId = selectedStudentId;
      const st = allStudents.find(s => s.id === selectedStudentId);
      targetLabel = st ? `المخدوم: ${st.fullName}` : 'مخدوم محدد';
    }

    setSending(true);
    try {
      const nowFormatted = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) + 
        ' - ' + new Date().toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });

      if (editingNotif) {
        // Update existing notification
        const notifRef = doc(db, 'notifications', editingNotif.id);
        await updateDoc(notifRef, {
          title: title.trim(),
          desc: desc.trim(),
          targetUserId: finalTargetUserId,
          targetLabel: targetLabel,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser?.fullName || 'الخادم'
        });
        setSuccessMsg('تم تعديل التنبيه بنجاح وتحديثه لدى المخدومين ✓');
      } else {
        // Create new notification
        await addDoc(collection(db, 'notifications'), {
          title: title.trim(),
          desc: desc.trim(),
          targetUserId: finalTargetUserId,
          targetLabel: targetLabel,
          time: nowFormatted,
          senderName: currentUser?.fullName || 'أمين الخدمة',
          senderId: currentUser?.id || 'admin',
          createdAt: serverTimestamp()
        });
        setSuccessMsg('تم إرسال التنبيه فوراً بنجاح لجميع المعنيين 🚀');
      }

      handleCancel();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving notification:', err);
      alert('حدث خطأ أثناء حفظ التنبيه.');
    } finally {
      setSending(false);
    }
  };

  // 6. Delete / Revoke Notification
  const handleDelete = async (notifId, notifTitle) => {
    if (!window.confirm(`هل أنت متأكد من حذف وسحب التنبيه "${notifTitle || 'هذا التنبيه'}"؟ سيختفي التنبيه فوراً من شاشات المخدومين.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'notifications', notifId));
      setSuccessMsg('تم حذف وسحب التنبيه بنجاح من شاشات المخدومين 🗑️');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error deleting notification:', err);
      alert('حدث خطأ أثناء حذف التنبيه.');
    }
  };

  const getTargetBadge = (targetUserId, targetLabel) => {
    if (targetLabel) return targetLabel;
    if (targetUserId === 'ALL') return 'عام لجميع المخدومين';
    if (targetUserId === 'common_hall' || targetUserId === 'cycle_1' || targetUserId === 'first') return 'المرحلة الأولى (سنة أولى + ثانية)';
    if (targetUserId === 'elisha') return 'فصل أليشع';
    const found = allStudents.find(s => s.id === targetUserId);
    return found ? `خاص: ${found.fullName}` : 'مخدوم محدد';
  };

  return (
    <div className="space-y-5 text-right font-cairo">
      
      {/* 1. Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-maroon-800" />
            <span>مركز رسائل وتنبيهات الخدمة</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            إرسال تنبيهات مباشرة للمخدومين، قوالب جاهزة بضغطة زر، وإمكانية تعديل وسحب أي رسالة فورياً.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isComposing) handleCancel();
            else {
              setIsComposing(true);
              setEditingNotif(null);
            }
          }}
          className="px-4 py-2.5 rounded-2xl bg-maroon-800 hover:bg-maroon-900 text-white text-xs font-black flex items-center gap-2 transition-all shadow-sm cursor-pointer active:scale-95 shrink-0"
        >
          {isComposing ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isComposing ? 'إلغاء التدوين' : 'رسالة جديدة ✍️'}</span>
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-black flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Ready-to-Send Standard Templates (قوالب قياسية جاهزة بضغطة زر) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>نماذج تنبيهات الخدمة الجاهزة</span>
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {STANDARD_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleApplyTemplate(tpl)}
              className="shrink-0 px-3 py-2 rounded-2xl bg-slate-50 hover:bg-amber-50/80 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-950 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="تعبئة نموذج التنبيه"
            >
              <span>{tpl.badge}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Compose / Edit Notification Card */}
      {isComposing && (
        <form onSubmit={handleSubmit} className="bg-white border-2 border-maroon-800/40 rounded-3xl p-4 sm:p-6 shadow-md space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-maroon-800" />
              <span>{editingNotif ? 'تعديل التنبيه المرسل ✏️' : 'تدوين تنبيه جديد للمخدومين ✍️'}</span>
            </h4>
            <button
              type="button"
              onClick={handleCancel}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">عنوان التنبيه:</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: تذكير بموعد لقاء الخدمة القادم ⛪"
                className="w-full text-xs p-3 rounded-2xl border border-slate-300 focus:outline-none focus:border-maroon-800 focus:ring-1 focus:ring-maroon-800"
                required
              />
            </div>

            {/* Target Audience */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">الجهة المستهدفة بالرسالة:</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-300 focus:outline-none focus:border-maroon-800 bg-white"
              >
                <option value="ALL">👥 جميع المخدومين (عام للكل)</option>
                <option value="common_hall">🏛️ المرحلة الأولى (سنة أولى + ثانية معاً)</option>
                <option value="elisha">🎓 فصل أليشع (إعداد خدام)</option>
                <option value="specific_student">👤 مخدوم محدد بالاسم</option>
              </select>
            </div>
          </div>

          {/* Specific Student Dropdown */}
          {targetType === 'specific_student' && (
            <div className="space-y-1.5 animate-in fade-in">
              <label className="text-xs font-bold text-slate-700 block">اختر المخدوم من القائمة:</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-amber-300 bg-amber-50/50 focus:outline-none focus:border-maroon-800"
                required
              >
                <option value="">-- اضغط لاختيار المخدوم --</option>
                {(allStudents || []).map((st) => (
                  <option key={st?.id} value={st?.id}>
                    {st?.fullName} ({st?.grade === 'elisha' ? 'فصل أليشع' : 'المرحلة الأولى'}) - {st?.phone}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Message Content */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">نص التنبيه والتفاصيل:</label>
            <textarea
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="اكتب تفاصيل التنبيه أو موعد الحضور أو التكليف بوضوح..."
              className="w-full text-xs p-3 rounded-2xl border border-slate-300 focus:outline-none focus:border-maroon-800 leading-relaxed"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={sending}
              className="px-5 py-2.5 rounded-xl bg-maroon-800 hover:bg-maroon-900 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sending ? 'جارٍ الإرسال...' : editingNotif ? 'حفظ التعديل 💾' : 'إرسال التنبيه الآن 🚀'}</span>
            </button>
          </div>
        </form>
      )}

      {/* 4. Sent Notifications History List */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-maroon-800" />
            <span>سجل التنبيهات المرسلة ({notifications.length})</span>
          </h4>
          <span className="text-[11px] text-slate-400">تحديث لحظي من السيرفر</span>
        </div>

        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400">جارٍ تحميل التنبيهات...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">لا توجد تنبيهات مرسلة حالياً.</p>
            <p className="text-[11px] text-slate-400 mt-1">يمكنك اختيار أحد النماذج المعتمدة أعلاه لإرسال تنبيه للخدمة.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(notifications || []).map((notif) => (
              <div 
                key={notif?.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-slate-900 text-sm">{notif.title}</span>
                    <span className="text-[10px] bg-maroon-100 text-maroon-900 font-bold px-2 py-0.5 rounded-full border border-maroon-200">
                      {getTargetBadge(notif.targetUserId, notif.targetLabel)}
                    </span>
                  </div>

                  {/* Actions: Edit & Delete/Revoke */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEdit(notif)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-maroon-800 hover:border-maroon-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                      title="تعديل هذا التنبيه"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                      <span>تعديل</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(notif.id, notif.title)}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                      title="حذف وسحب التنبيه من شاشات المخدومين"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>سحب / حذف</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {notif.desc}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                  <span>المرسل: <strong className="text-slate-600">{notif.senderName || 'أمين الخدمة'}</strong></span>
                  <span>{notif.time || 'الآن'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
