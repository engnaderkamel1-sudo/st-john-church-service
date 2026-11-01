import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Database, Download, RefreshCw, Trash2, 
  RotateCcw, CheckCircle2, Clock, AlertTriangle, Calendar,
  FileSpreadsheet, Sparkles, HardDrive
} from 'lucide-react';
import { db } from '../../firebase';
import { 
  collection, query, orderBy, onSnapshot, addDoc, 
  deleteDoc, doc, getDocs, setDoc, serverTimestamp, writeBatch 
} from 'firebase/firestore';

export default function ServantBackupsHub({ user, allUsers = [] }) {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const MAX_BACKUPS = 6;

  // Calculate most recent Friday
  const getMostRecentFriday = () => {
    const d = new Date();
    const day = d.getDay(); // 0: Sun, 5: Fri
    const diff = (day >= 5) ? (day - 5) : (day + 2);
    d.setDate(d.getDate() - diff);
    return d.toISOString().split('T')[0];
  };

  // Realtime subscription to backups
  useEffect(() => {
    const q = query(collection(db, 'system_backups'), orderBy('createdAtIso', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setBackups(list);
      setLoading(false);

      // Check for automatic Friday 8:00 PM backup
      checkAndRunAutoFridayBackup(list);
    }, (err) => {
      console.error('Error fetching backups:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Automatic check for Friday 8:00 PM backup
  const checkAndRunAutoFridayBackup = async (currentBackups) => {
    const now = new Date();
    const isFriday = now.getDay() === 5;
    const isAfterEightPM = now.getHours() >= 20;

    // Trigger on Friday after 8 PM or if Friday passed and no backup for latest Friday
    const mostRecentFriday = getMostRecentFriday();
    const fridayPassed = (isFriday && isAfterEightPM) || (now.getDay() !== 5);

    if (!fridayPassed) return;

    const alreadyBackedUp = currentBackups.some(
      b => b.fridayDate === mostRecentFriday && b.type === 'scheduled_friday'
    );

    if (!alreadyBackedUp && !creatingBackup) {
      console.log('Initiating auto Friday 8:00 PM backup for:', mostRecentFriday);
      handleCreateBackup(true, mostRecentFriday);
    }
  };

  // Enforce maximum 6 backups in Firestore
  const enforceBackupLimit = async () => {
    try {
      const q = query(collection(db, 'system_backups'), orderBy('createdAtIso', 'desc'));
      const snap = await getDocs(q);
      if (snap.docs.length > MAX_BACKUPS) {
        const excessDocs = snap.docs.slice(MAX_BACKUPS);
        for (const d of excessDocs) {
          await deleteDoc(doc(db, 'system_backups', d.id));
        }
      }
    } catch (err) {
      console.warn('Could not enforce backup limit:', err);
    }
  };

  // Create a backup snapshot of attendance records
  const handleCreateBackup = async (isAuto = false, targetFriday = null) => {
    setCreatingBackup(true);
    setStatusMessage(null);
    try {
      const attSnap = await getDocs(collection(db, 'attendance'));
      const attDocs = attSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      const now = new Date();
      const fridayDate = targetFriday || getMostRecentFriday();

      const newBackup = {
        fridayDate: fridayDate,
        type: isAuto ? 'scheduled_friday' : 'manual_supervisor',
        title: isAuto 
          ? `النسخة التلقائية للخدمة (الجمعة ${fridayDate})`
          : `نسخة يدوية بواسطة (${user?.fullName || 'مشرف التطبيق'})`,
        createdAtIso: now.toISOString(),
        dateFormatted: now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        timeFormatted: now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        createdByName: isAuto ? 'النسخ التلقائي الأسبوعي (الجمعة 8:00 م)' : (user?.fullName || 'مشرف التطبيق'),
        attendanceCount: attDocs.length,
        usersCount: allUsers.length || 0,
        attendanceData: attDocs
      };

      await addDoc(collection(db, 'system_backups'), newBackup);
      await enforceBackupLimit();

      setStatusMessage({ type: 'success', text: isAuto ? 'تم إنشاء النسخة التلقائية بنجاح ✓' : 'تم أخذ النسخة الاحتياطية بنجاح ✓' });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error('Error creating backup:', err);
      setStatusMessage({ type: 'error', text: 'حدث خطأ أثناء أخذ النسخة الاحتياطية.' });
    } finally {
      setCreatingBackup(false);
    }
  };

  // Download snapshot as a JSON file
  const handleDownloadBackup = (backup) => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `نسخة_حضور_الخدمة_${backup.fridayDate || backup.id}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Download error:', err);
      alert('حدث خطأ أثناء تحميل ملف النسخة الاحتياطية.');
    }
  };

  // Export current attendance directly to CSV / Excel
  const handleExportCSV = async () => {
    try {
      const attSnap = await getDocs(collection(db, 'attendance'));
      const rows = [
        ['اسم المخدوم', 'رقم الهاتف', 'المرحلة الدراسية', 'التاريخ', 'الوقت', 'الحالة', 'النقاط', 'الخادم المسؤول']
      ];

      attSnap.docs.forEach(d => {
        const data = d.data();
        rows.push([
          `"${data.userName || ''}"`,
          `"${data.phone || ''}"`,
          `"${data.grade || ''}"`,
          `"${data.date || ''}"`,
          `"${data.time || ''}"`,
          `"${data.status || ''}"`,
          `"${data.pointsAwarded || 0}"`,
          `"${data.servantName || ''}"`
        ]);
      });

      const csvContent = "\uFEFF" + rows.map(e => e.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `سجلات_حضور_الخدمة_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('CSV Export Error:', err);
      alert('حدث خطأ أثناء تصدير ملف الإكسيل.');
    }
  };

  // Restore attendance records from backup
  const handleRestoreBackup = async (backup) => {
    const confirmFirst = window.confirm(
      `تنبيه هام ومصيري:\n\nأنت على وشك استعادة نسخة الحضور الخاصة بتاريخ (${backup.dateFormatted || backup.fridayDate}).\n\nتحتوي النسخة على (${backup.attendanceCount} سجل حضور وغياب).\n\nهل أنت متأكد تماماً من المتابعة واستعادة هذه النسخة؟`
    );
    if (!confirmFirst) return;

    setRestoringId(backup.id);
    try {
      const records = backup.attendanceData || [];
      for (const rec of records) {
        if (!rec.id) continue;
        const { id, ...cleanRec } = rec;
        await setDoc(doc(db, 'attendance', id), cleanRec, { merge: true });
      }

      alert(`تمت استعادة (${records.length}) سجل حضور وغياب بنجاح ✓`);
    } catch (err) {
      console.error('Error restoring backup:', err);
      alert('حدث خطأ أثناء استعادة النسخة الاحتياطية.');
    } finally {
      setRestoringId(null);
    }
  };

  // Delete a backup document
  const handleDeleteBackupDoc = async (backupId, title) => {
    if (!window.confirm(`هل أنت متأكد من حذف هذه النسخة الاحتياطية (${title || ''}) نهائياً؟`)) return;
    try {
      await deleteDoc(doc(db, 'system_backups', backupId));
    } catch (err) {
      console.error('Error deleting backup:', err);
      alert('حدث خطأ أثناء حذف النسخة.');
    }
  };

  return (
    <div className="space-y-4 font-cairo max-w-5xl mx-auto pb-10">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-maroon-900 via-maroon-800 to-maroon-950 text-white p-4 sm:p-6 rounded-3xl shadow-xl border border-maroon-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-gold-400/20 text-gold-300 border border-gold-400/30 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>خاص بمشرف التطبيق 👑</span>
            </span>
            <span className="text-xs text-maroon-200">
              الاحتفاظ بـ {MAX_BACKUPS} نسخ أسبوعية متتالية
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Database className="w-6 h-6 text-gold-400" />
            <span>النسخ الاحتياطي لمنظومة الحضور والغياب</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            يتم أخذ نسخة احتياطية لسجلات الحضور والغياب تلقائياً كل جمعة الساعة 8:00 مساءً فور انتهاء الخدمة، لحماية البيانات وسهولة استرجاعها.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleCreateBackup(false)}
            disabled={creatingBackup}
            className="px-4 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-500 text-maroon-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${creatingBackup ? 'animate-spin' : ''}`} />
            <span>{creatingBackup ? 'جارٍ أخذ النسخة...' : 'أخذ نسخة احتياطية فورية الآن ⚡'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 flex items-center gap-2 transition-all cursor-pointer"
            title="تصدير سجلات الحضور الحالية إلى ملف إكسيل"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير إكسيل 📊</span>
          </button>
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all animate-in fade-in duration-200 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' 
            : 'bg-rose-50 text-rose-900 border border-rose-300'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Backups List Section */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-maroon-800" />
            <h3 className="font-extrabold text-slate-900 text-base">
              سجل النسخ المحفوظة ({backups.length} من {MAX_BACKUPS})
            </h3>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">
            التحديث الأسبوعي التلقائي: الجمعة 08:00 م
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-bold flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-maroon-700" />
            <span>جارٍ تحميل سجلات النسخ الاحتياطية...</span>
          </div>
        ) : backups.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Database className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold text-sm text-slate-700">لا توجد نسخ احتياطية مسجلة حتى الآن</p>
            <p className="text-xs text-slate-500">
              اضغط على زر (أخذ نسخة احتياطية فورية الآن) لإنشاء أول نسخة وحفظها.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map((b) => (
              <div 
                key={b.id}
                className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200/90 rounded-2xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-slate-900 text-sm sm:text-base">
                      {b.title || 'نسخة احتياطية'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      b.type === 'scheduled_friday' 
                        ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                        : 'bg-blue-100 text-blue-900 border border-blue-200'
                    }`}>
                      {b.type === 'scheduled_friday' ? 'تلقائي أسبوعي ⚙️' : 'يدوي بواسطة المشرف 👑'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-semibold">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{b.dateFormatted || b.fridayDate}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>الساعة {b.timeFormatted || '8:00 م'}</span>
                    </span>
                    <span className="text-maroon-800 font-bold bg-maroon-50 border border-maroon-200 px-2 py-0.5 rounded-md text-[11px]">
                      {b.attendanceCount || 0} سجل حضور وغياب
                    </span>
                  </div>
                </div>

                {/* Card Action Controls */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => handleDownloadBackup(b)}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                    title="تحميل النسخة كملف محفوظ على جهازك"
                  >
                    <Download className="w-3.5 h-3.5 text-maroon-800" />
                    <span>تحميل 💾</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRestoreBackup(b)}
                    disabled={restoringId === b.id}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-60"
                    title="استعادة سجلات الحضور والغياب من هذه النسخة"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 text-amber-700 ${restoringId === b.id ? 'animate-spin' : ''}`} />
                    <span>{restoringId === b.id ? 'جارٍ الاستعادة...' : 'استعادة 🔄'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteBackupDoc(b.id, b.title)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                    title="حذف هذه النسخة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
