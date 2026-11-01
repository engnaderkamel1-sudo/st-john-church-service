import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Database, Download, RefreshCw, Trash2, 
  RotateCcw, CheckCircle2, Clock, AlertTriangle, Calendar,
  FileSpreadsheet, Sparkles, HardDrive, Eye, ExternalLink
} from 'lucide-react';
import { db } from '../../firebase';
import { 
  collection, query, orderBy, onSnapshot, addDoc, 
  deleteDoc, doc, getDocs, setDoc, serverTimestamp 
} from 'firebase/firestore';
import ServantBackupPreviewModal from './ServantBackupPreviewModal';

export default function ServantBackupsHub({ user, allUsers = [] }) {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [previewBackup, setPreviewBackup] = useState(null);

  const MAX_BACKUPS = 6;
  const DRIVE_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxhdl_hk5vB7NLLL7zdPmVXlwvAOiZYVLsrk5T73UdJpJJM9JpU74p0DexpSch7gI4I/exec';

  const getMostRecentFriday = () => {
    const d = new Date();
    const day = d.getDay(); // 0: Sun, 5: Fri
    const diff = (day >= 5) ? (day - 5) : (day + 2);
    d.setDate(d.getDate() - diff);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    const q = query(collection(db, 'system_backups'), orderBy('createdAtIso', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setBackups(list);
      setLoading(false);
      checkAndRunAutoFridayBackup(list);
    }, (err) => {
      console.error('Error fetching backups:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const checkAndRunAutoFridayBackup = async (currentBackups) => {
    const now = new Date();
    const isFriday = now.getDay() === 5;
    const isAfterEightPM = now.getHours() >= 20;
    const mostRecentFriday = getMostRecentFriday();
    const fridayPassed = (isFriday && isAfterEightPM) || (now.getDay() !== 5);

    if (!fridayPassed) return;

    const alreadyBackedUp = currentBackups.some(
      b => b.fridayDate === mostRecentFriday && b.type === 'scheduled_friday'
    );

    if (!alreadyBackedUp && !creatingBackup) {
      handleCreateBackup(true, mostRecentFriday);
    }
  };

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

  // Upload backup payload to Google Drive via Google Apps Script
  const uploadBackupToGoogleDrive = async (backupPayload, fileName) => {
    try {
      const jsonStr = JSON.stringify(backupPayload, null, 2);
      // UTF-8 to Base64
      const utf8Bytes = new TextEncoder().encode(jsonStr);
      let binary = '';
      for (let i = 0; i < utf8Bytes.length; i++) {
        binary += String.fromCharCode(utf8Bytes[i]);
      }
      const base64Data = btoa(binary);

      const response = await fetch(DRIVE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          fileName: fileName,
          mimeType: 'application/json',
          base64Data: base64Data,
          base64: base64Data
        })
      });

      const resData = await response.json();
      if (resData.status === 'success') {
        return {
          driveUrl: resData.fileUrl || resData.url || null,
          driveFileId: resData.fileId || null
        };
      }
    } catch (err) {
      console.warn('Google Drive backup upload skipped or error:', err);
    }
    return { driveUrl: null, driveFileId: null };
  };

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
      const fileName = `نسخة_حضور_${fridayDate}_${now.getTime()}.json`;

      const backupPayload = {
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

      // Upload to Google Drive
      const driveInfo = await uploadBackupToGoogleDrive(backupPayload, fileName);

      // Save to Firestore
      await addDoc(collection(db, 'system_backups'), {
        ...backupPayload,
        ...driveInfo
      });

      await enforceBackupLimit();

      setStatusMessage({ 
        type: 'success', 
        text: driveInfo.driveUrl 
          ? 'تم أخذ النسخة بنجاح ورفعها تلقائياً إلى Google Drive وقاعدة البيانات ✓' 
          : 'تم أخذ النسخة وحفظها بنجاح في قاعدة البيانات ✓' 
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err) {
      console.error('Error creating backup:', err);
      setStatusMessage({ type: 'error', text: 'حدث خطأ أثناء أخذ النسخة الاحتياطية.' });
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDownloadBackup = (backup) => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `نسخة_حضور_${backup.fridayDate || backup.id}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Download error:', err);
      alert('حدث خطأ أثناء تحميل ملف النسخة.');
    }
  };

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

  const handleRestoreBackup = async (backup) => {
    const confirmFirst = window.confirm(
      `تنبيه هام ومصيري:\n\nأنت على وشك استعادة سجلات الحضور الخاصة بتاريخ (${backup.dateFormatted || backup.fridayDate}).\n\nتحتوي النسخة على (${backup.attendanceCount} سجل حضور وغياب).\n\nهل أنت متأكد تماماً من المتابعة؟`
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
      setPreviewBackup(null);
    } catch (err) {
      console.error('Error restoring backup:', err);
      alert('حدث خطأ أثناء استعادة النسخة الاحتياطية.');
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteBackupDoc = async (backupId, title) => {
    if (!window.confirm(`هل أنت متأكد من حذف هذه النسخة (${title || ''}) نهائياً؟`)) return;
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
            <span>النسخ الاحتياطي السحابي للحضور والغياب</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            يتم النسخ التلقائي كل جمعة 8:00 مساءً ورفع النسخة سحابياً إلى Google Drive وقاعدة البيانات مع إمكانية المعاينة والفحص كشيت إكسيل قبل الاستعادة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleCreateBackup(false)}
            disabled={creatingBackup}
            className="px-4 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-500 text-maroon-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${creatingBackup ? 'animate-spin' : ''}`} />
            <span>{creatingBackup ? 'جارٍ أخذ النسخة والرفع...' : 'أخذ نسخة سحابية فورية الآن ⚡'}</span>
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

      {/* Backups List */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-maroon-800" />
            <h3 className="font-extrabold text-slate-900 text-base">
              سجل النسخ المحفوظة ({backups.length} من {MAX_BACKUPS})
            </h3>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">
            النسخ التلقائي: الجمعة 08:00 م
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
            <p className="text-xs text-slate-500">اضغط على زر (أخذ نسخة سحابية فورية الآن) لإنشاء أول نسخة.</p>
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
                    {b.driveUrl && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                        محفوظة على درايف ☁️
                      </span>
                    )}
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
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60">
                  {/* Preview Button */}
                  <button
                    type="button"
                    onClick={() => setPreviewBackup(b)}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                    title="معاينة وفحص بيانات النسخة كشيت إكسيل"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-700" />
                    <span>معاينة وفحص 👁️</span>
                  </button>

                  {/* Google Drive Link if exists */}
                  {b.driveUrl && (
                    <a
                      href={b.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                      title="فتح ملف النسخة على Google Drive"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                      <span>درايف 📁</span>
                    </a>
                  )}

                  {/* Download Local */}
                  <button
                    type="button"
                    onClick={() => handleDownloadBackup(b)}
                    className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer active:scale-95"
                    title="تحميل النسخة على جهازك"
                  >
                    <Download className="w-3.5 h-3.5 text-maroon-800" />
                    <span>تحميل 💾</span>
                  </button>

                  {/* Restore Button */}
                  <button
                    type="button"
                    onClick={() => handleRestoreBackup(b)}
                    disabled={restoringId === b.id}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-60"
                    title="استعادة هذه النسخة"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 text-amber-700 ${restoringId === b.id ? 'animate-spin' : ''}`} />
                    <span>استعادة 🔄</span>
                  </button>

                  {/* Delete Doc */}
                  <button
                    type="button"
                    onClick={() => handleDeleteBackupDoc(b.id, b.title)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                    title="حذف النسخة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewBackup && (
        <ServantBackupPreviewModal
          backup={previewBackup}
          onClose={() => setPreviewBackup(null)}
          onRestore={handleRestoreBackup}
          restoring={restoringId === previewBackup.id}
        />
      )}
    </div>
  );
}
