import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where,
  doc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Search, 
  TrendingUp, 
  Award, 
  Filter, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  FileSpreadsheet,
  Percent,
  Check,
  UserCheck,
  Clock,
  CalendarOff,
  QrCode
} from 'lucide-react';

// Force English/Western numerals (0123456789) strictly throughout the interface
export const toEnglishDigits = (val) => {
  if (val === null || val === undefined) return '';
  return String(val).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
};

export default function ServantAttendanceTotals({ 
  allUsers = [], 
  todayStr,
  onOpenHolidays 
}) {
  const SERVICE_START_FRIDAY = '2026-10-02';

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStageFilter, setActiveStageFilter] = useState('all'); // 'all' (combined) | 'first' | 'second'
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedRetroFriday, setSelectedRetroFriday] = useState(SERVICE_START_FRIDAY);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');

  // 2 Modes: 'quick' (حضور وغياب سريع بنقرة واحدة) | 'detailed' (بالوقت والدقائق مع نافذة تعديل)
  const [attendanceEntryMode, setAttendanceEntryMode] = useState('quick');
  const [editingCell, setEditingCell] = useState(null);
  const [modalStatus, setModalStatus] = useState('حاضر');
  const [modalTime, setModalTime] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Generate dynamic list of service Fridays from 2026-10-02 up to today / upcoming Friday
  const fridaysList = useMemo(() => {
    const list = [];
    const startDate = new Date(SERVICE_START_FRIDAY + 'T12:00:00');
    const now = new Date();
    // Allow up to today (or upcoming Friday if today is later in the week)
    const maxDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    let cur = new Date(startDate);
    let weekNum = 1;
    while (cur <= maxDate) {
      list.push({
        dateStr: cur.toISOString().split('T')[0],
        weekNum: weekNum
      });
      cur.setDate(cur.getDate() + 7);
      weekNum++;
    }

    if (list.length === 0) {
      list.push({ dateStr: SERVICE_START_FRIDAY, weekNum: 1 });
    }

    // Keep chronological order for the columns (Week 1 -> Week 2 -> Week 3...)
    return list;
  }, []);

  // Format date in Arabic short form with strict English digits (e.g. 2 أكتوبر)
  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      if (typeof dateStr === 'object' && dateStr.seconds) {
        return toEnglishDigits(new Date(dateStr.seconds * 1000).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short' }));
      }
      if (typeof dateStr === 'string' && dateStr.includes('-')) {
        const [year, month, day] = dateStr.split('-');
        const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
        return toEnglishDigits(d.toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short' }));
      }
      return toEnglishDigits(String(dateStr));
    } catch {
      return '';
    }
  };

  // Only consider active students of Servants Prep (exclude elisha stage)
  const servantsPrepStudents = useMemo(() => {
    return (allUsers || []).filter(u => u.role === 'student' && u.grade !== 'elisha');
  }, [allUsers]);

  // Real-time subscription to attendance records from service start
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'attendance'),
      where('date', '>=', SERVICE_START_FRIDAY)
    );
    const unsub = onSnapshot(q, (snap) => {
      const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAttendanceRecords(records);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching attendance totals:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Quick lookup map: `${userId}_${date}` => record
  const recordsMap = useMemo(() => {
    const map = {};
    attendanceRecords.forEach(rec => {
      if (rec.userId && rec.date) {
        map[`${rec.userId}_${rec.date}`] = rec;
      }
    });
    return map;
  }, [attendanceRecords]);

  // Real-time listener for attendance window settings to get variable start times per Friday
  const [attendanceWindowSettings, setAttendanceWindowSettings] = useState({});
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'service_settings', 'attendance_window'), (snap) => {
      if (snap.exists()) {
        setAttendanceWindowSettings(snap.data() || {});
      }
    });
    return () => unsubSettings();
  }, []);

  // Check if student arrived late on a specific Friday based on that Friday's start time + 15 mins
  const checkIsLate = (record, dateStr) => {
    if (!record || record.status !== 'حاضر') return false;
    if (record.punctualityStatus && typeof record.punctualityStatus === 'string') {
      if (record.punctualityStatus.includes('متأخر')) return true;
      if (record.punctualityStatus.includes('مبكر') || record.punctualityStatus.includes('في الموعد')) return false;
    }
    if (!record.time) return false;
    try {
      const fridayStartTime = attendanceWindowSettings[`startTime_${dateStr}`] || attendanceWindowSettings.serviceStartTime || '10:30';
      const [startH, startM] = fridayStartTime.split(':').map(Number);
      const thresholdMins = (startH * 60) + startM + 15;

      const cleanParts = record.time.match(/(\d+):(\d+)/);
      if (!cleanParts) return false;
      let recH = parseInt(cleanParts[1], 10);
      const recM = parseInt(cleanParts[2], 10);
      const isPM = record.time.includes('م') || record.time.toLowerCase().includes('pm');
      const isAM = record.time.includes('ص') || record.time.toLowerCase().includes('am');

      if (isPM && recH < 12) recH += 12;
      if (isAM && recH === 12) recH = 0;

      const recordTotalMins = (recH * 60) + recM;
      return recordTotalMins > thresholdMins;
    } catch {
      return false;
    }
  };

  // Overall Statistics for Leadership (أمين الخدمة)
  const stats = useMemo(() => {
    const totalStudents = servantsPrepStudents.length;
    const year1Students = servantsPrepStudents.filter(s => (s.grade || 'first') === 'first');
    const year2Students = servantsPrepStudents.filter(s => s.grade === 'second');

    const totalWeeks = fridaysList.length;
    if (totalStudents === 0 || totalWeeks === 0) {
      return {
        overallRate: 0,
        year1Rate: 0,
        year2Rate: 0,
        totalStudents,
        year1Count: year1Students.length,
        year2Count: year2Students.length,
        fridayStats: []
      };
    }

    // Per-Friday stats calculation
    let overallPresentOpportunities = totalStudents * totalWeeks;
    let overallActualPresent = 0;

    let year1Opportunities = year1Students.length * totalWeeks;
    let year1ActualPresent = 0;

    let year2Opportunities = year2Students.length * totalWeeks;
    let year2ActualPresent = 0;

    const fridayStats = fridaysList.map(({ dateStr, weekNum }) => {
      const presentAll = servantsPrepStudents.filter(s => recordsMap[`${s.id}_${dateStr}`]?.status === 'حاضر').length;
      const absentAll = servantsPrepStudents.filter(s => recordsMap[`${s.id}_${dateStr}`]?.status === 'غائب').length;
      const rateAll = totalStudents > 0 ? Math.round((presentAll / totalStudents) * 100) : 0;

      const presentY1 = year1Students.filter(s => recordsMap[`${s.id}_${dateStr}`]?.status === 'حاضر').length;
      const rateY1 = year1Students.length > 0 ? Math.round((presentY1 / year1Students.length) * 100) : 0;

      const presentY2 = year2Students.filter(s => recordsMap[`${s.id}_${dateStr}`]?.status === 'حاضر').length;
      const rateY2 = year2Students.length > 0 ? Math.round((presentY2 / year2Students.length) * 100) : 0;

      overallActualPresent += presentAll;
      year1ActualPresent += presentY1;
      year2ActualPresent += presentY2;

      return {
        dateStr,
        weekNum,
        presentAll,
        absentAll,
        rateAll,
        presentY1,
        rateY1,
        presentY2,
        rateY2
      };
    });

    const overallRate = overallPresentOpportunities > 0 ? Math.round((overallActualPresent / overallPresentOpportunities) * 100) : 0;
    const year1Rate = year1Opportunities > 0 ? Math.round((year1ActualPresent / year1Opportunities) * 100) : 0;
    const year2Rate = year2Opportunities > 0 ? Math.round((year2ActualPresent / year2Opportunities) * 100) : 0;

    return {
      overallRate,
      year1Rate,
      year2Rate,
      totalStudents,
      year1Count: year1Students.length,
      year2Count: year2Students.length,
      fridayStats
    };
  }, [servantsPrepStudents, fridaysList, recordsMap]);

  // Filter students for the table
  const displayedStudents = useMemo(() => {
    return servantsPrepStudents.filter(st => {
      const matchesSearch = !searchQuery.trim() ||
        (st.fullName || '').toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        (st.phone || '').includes(searchQuery.trim());

      const grade = st.grade || 'first';
      const matchesStage = activeStageFilter === 'all' || grade === activeStageFilter;

      return matchesSearch && matchesStage;
    });
  }, [servantsPrepStudents, searchQuery, activeStageFilter]);

  // Cell click dispatcher based on active mode
  const handleCellClick = (student, dateStr) => {
    const key = `${student.id}_${dateStr}`;
    const curRecord = recordsMap[key];

    if (attendanceEntryMode === 'detailed') {
      // Detailed Mode: Open Edit Modal to specify arrival time or edit status
      const existing = attendanceRecords.find(r => r.userId === student.id && r.date === dateStr);
      setEditingCell({
        student,
        dateStr,
        recordId: existing?.id,
        currentRecord: curRecord || existing
      });
      setModalStatus(curRecord?.status || 'حاضر');
      setModalTime(curRecord?.time ? toEnglishDigits(curRecord.time) : '');
    } else {
      // Quick Mode: 1-touch toggle (حاضر / غائب) without fake times
      handleQuickToggleCell(student, dateStr);
    }
  };

  // Quick Mode Handler: Toggle status cleanly without generating fake night times
  const handleQuickToggleCell = async (student, dateStr) => {
    const key = `${student.id}_${dateStr}`;
    const curRecord = recordsMap[key];
    setUpdatingId(key);

    try {
      const existing = attendanceRecords.find(r => r.userId === student.id && r.date === dateStr);
      const nextStatus = curRecord?.status === 'حاضر' ? 'غائب' : 'حاضر';
      const points = nextStatus === 'حاضر' ? 10 : 0;

      if (existing) {
        await updateDoc(doc(db, 'attendance', existing.id), {
          status: nextStatus,
          pointsAwarded: points,
          // In quick toggle mode, do not invent a fake time. Preserve existing only if code-registered, otherwise clear
          time: nextStatus === 'حاضر' ? (existing.time || '') : '',
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'attendance'), {
          userId: student.id,
          userName: student.fullName || 'مخدوم',
          userPhone: student.phone || '',
          userGrade: student.grade || 'first',
          date: dateStr,
          time: '', // Clean checkmark without fake time!
          type: 'manual_quick',
          status: nextStatus,
          pointsAwarded: points,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error('Error toggling attendance cell:', err);
      alert('حدث خطأ أثناء تعديل الحضور.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Detailed Modal Save Handler: Save custom arrival time and status
  const handleSaveModal = async () => {
    if (!editingCell) return;
    const { student, dateStr, recordId } = editingCell;
    setModalSubmitting(true);

    try {
      if (modalStatus === 'unrecorded') {
        // If unrecorded, clear status
        if (recordId) {
          await updateDoc(doc(db, 'attendance', recordId), {
            status: 'unrecorded',
            pointsAwarded: 0,
            time: '',
            punctualityStatus: '',
            updatedAt: serverTimestamp()
          });
        }
      } else {
        const points = modalStatus === 'حاضر' ? 10 : 0;
        const cleanTime = modalStatus === 'حاضر' ? toEnglishDigits(modalTime.trim()) : '';

        if (recordId) {
          await updateDoc(doc(db, 'attendance', recordId), {
            status: modalStatus,
            pointsAwarded: points,
            time: cleanTime,
            updatedAt: serverTimestamp()
          });
        } else {
          await addDoc(collection(db, 'attendance'), {
            userId: student.id,
            userName: student.fullName || 'مخدوم',
            userPhone: student.phone || '',
            userGrade: student.grade || 'first',
            date: dateStr,
            time: cleanTime,
            type: 'manual_detailed',
            status: modalStatus,
            pointsAwarded: points,
            createdAt: serverTimestamp()
          });
        }
      }
      setEditingCell(null);
    } catch (err) {
      console.error('Error saving attendance modal:', err);
      alert('حدث خطأ أثناء حفظ التعديل.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Bulk mark all students in current filtered view as present for a selected Friday
  const handleBulkMarkAllPresent = async (targetDate) => {
    const targetStudents = displayedStudents;
    if (!targetStudents || targetStudents.length === 0) {
      alert('لا يوجد مخدومين في القائمة الحالية لتسجيلهم.');
      return;
    }

    const targetDateLabel = fridaysList.find(f => f.dateStr === targetDate);
    const weekLabel = targetDateLabel ? `الجمعة (${toEnglishDigits(targetDateLabel.weekNum)}) الموافق ${formatShortDate(targetDate)}` : targetDate;

    if (!window.confirm(`هل تريد تسجيل جميع مخدومي القائمة الحالية (${toEnglishDigits(targetStudents.length)} مخدوم) كـ "حاضر" لـ ${weekLabel}؟\n(يمكنك بعد ذلك تعديل من غاب فقط بلمسة واحدة)`)) {
      return;
    }

    setBulkLoading(true);
    try {
      const promises = targetStudents.map(async (st) => {
        const existing = attendanceRecords.find(r => r.userId === st.id && r.date === targetDate);
        if (existing) {
          if (existing.status !== 'حاضر') {
            return updateDoc(doc(db, 'attendance', existing.id), {
              status: 'حاضر',
              pointsAwarded: 10,
              time: existing.time || '', // Do NOT invent fake time
              updatedAt: serverTimestamp()
            });
          }
        } else {
          return addDoc(collection(db, 'attendance'), {
            userId: st.id,
            userName: st.fullName || 'مخدوم',
            userPhone: student.phone || '',
            userGrade: student.grade || 'first',
            date: targetDate,
            time: '', // Clean checkmark without fake time
            type: 'manual_bulk',
            status: 'حاضر',
            pointsAwarded: 10,
            createdAt: serverTimestamp()
          });
        }
      });

      await Promise.all(promises);
      setBulkSuccessMsg(`تم رصد حضور (${toEnglishDigits(targetStudents.length)}) مخدوم بنجاح لـ ${weekLabel} ✓`);
      setTimeout(() => setBulkSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error in bulk attendance:', err);
      alert('حدث خطأ أثناء الرصد الجماعي.');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2.5 bg-maroon-50 text-maroon-800 rounded-2xl border border-maroon-100">
              <UserCheck className="w-5 h-5 text-maroon-800" />
            </span>
            <div>
              <h2 className="text-base md:text-lg font-black text-slate-900">
                الحضور (تسجيل ومتابعة)
              </h2>
              <p className="text-xs text-slate-500 font-bold">
                كشف الحضور الشامل والرصد المباشر لجميع جمعات الخدمة منذ 2 أكتوبر 2026.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenHolidays && (
            <button
              type="button"
              onClick={onOpenHolidays}
              className="min-h-[40px] px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
              title="إدارة إجازات الخدمة والجمعات الملغاة"
            >
              <CalendarOff className="w-4 h-4 text-amber-800" />
              <span>إجازات الخدمة 🏖️</span>
            </button>
          )}
        </div>
      </div>


      {/* ⚡ Retroactive & Quick Bulk Attendance Bar (أداة الرصد بأثر رجعي) */}
      <div className="bg-gradient-to-r from-amber-50/80 via-white to-amber-50/80 border-2 border-amber-300 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-100 text-amber-900 rounded-xl">
              <Sparkles className="w-4 h-4 text-amber-800" />
            </span>
            <div>
              <h3 className="text-xs font-black text-slate-900">
                أداة الرصد السريع وتوثيق الجمعات السابقة (بأثر رجعي):
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                اختر أي جمعة لتسجيل القائمة المعروضة كاملة "حاضر" بنقرة واحدة، ثم عدّل من غاب فقط في الجدول.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedRetroFriday}
              onChange={(e) => setSelectedRetroFriday(e.target.value)}
              className="bg-white border-2 border-amber-400 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none min-h-[38px] shadow-2xs cursor-pointer"
            >
              {fridaysList.slice().reverse().map(f => (
                <option key={f.dateStr} value={f.dateStr}>
                  الجمعة ({f.weekNum}) - {formatShortDate(f.dateStr)}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={bulkLoading}
              onClick={() => handleBulkMarkAllPresent(selectedRetroFriday)}
              className="min-h-[38px] px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {bulkLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Check className="w-4 h-4 text-gold-300" />
              )}
              <span>تسجيل الكل حاضر لهذه الجمعة ✓</span>
            </button>
          </div>
        </div>

        {bulkSuccessMsg && (
          <div className="bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{bulkSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* 🏆 Section 1: Executive Leader Overview Cards (متوسط ونسب الحضور لأمين الخدمة) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: Overall Average Attendance */}
        <div className="bg-gradient-to-br from-slate-900 via-maroon-950 to-slate-900 text-white rounded-3xl p-4 shadow-sm border border-maroon-800/40 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black text-gold-300 uppercase tracking-wider block">
                متوسط الحضور العام للقاعة المشتركة
              </span>
              <h3 className="text-xl font-black mt-1 text-white">
                إعداد المخدومين (الكل)
              </h3>
            </div>
            <span className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs text-gold-300">
              <Percent className="w-5 h-5" />
            </span>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-gold-300 font-mono">
                {toEnglishDigits(stats.overallRate)}%
              </span>
              <span className="text-[11px] text-slate-300 mr-2 font-bold">
                متوسط الالتزام
              </span>
            </div>
            <span className="text-xs bg-white/15 px-2.5 py-1 rounded-xl font-black text-slate-200 font-mono">
              {toEnglishDigits(stats.totalStudents)} مخدوم مسجل
            </span>
          </div>
        </div>

        {/* Card 2: Year 1 Cohort Average */}
        <div className="bg-white border-2 border-emerald-200 rounded-3xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider block">
                دفعة السنة الأولى
              </span>
              <h3 className="text-lg font-black mt-0.5 text-slate-900">
                السنة الأولى لإعداد خدام
              </h3>
            </div>
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
              <Award className="w-5 h-5" />
            </span>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-emerald-600 font-mono">
                {toEnglishDigits(stats.year1Rate)}%
              </span>
              <span className="text-[11px] text-slate-500 mr-2 font-bold">
                نسبة الحضور
              </span>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl font-black font-mono">
              {toEnglishDigits(stats.year1Count)} مخدوم
            </span>
          </div>
        </div>

        {/* Card 3: Year 2 Cohort Average */}
        <div className="bg-white border-2 border-blue-200 rounded-3xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black text-blue-800 uppercase tracking-wider block">
                دفعة السنة الثانية
              </span>
              <h3 className="text-lg font-black mt-0.5 text-slate-900">
                السنة الثانية لإعداد خدام
              </h3>
            </div>
            <span className="p-2 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100">
              <TrendingUp className="w-5 h-5" />
            </span>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-blue-600 font-mono">
                {toEnglishDigits(stats.year2Rate)}%
              </span>
              <span className="text-[11px] text-slate-500 mr-2 font-bold">
                نسبة الحضور
              </span>
            </div>
            <span className="text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-xl font-black font-mono">
              {toEnglishDigits(stats.year2Count)} مخدوم
            </span>
          </div>
        </div>
      </div>

      {/* 🗓️ Section 2: Per-Friday Summary Cards Carousel */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-maroon-800" />
            <h3 className="text-xs font-black text-slate-900">
              تفاصيل ونسب كل جمعة خدمة على حدة:
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-bold font-mono">
            ({toEnglishDigits(stats.fridayStats.length)}) جمعات مرت
          </span>
        </div>

        <div className="flex items-stretch gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
          {stats.fridayStats.slice().reverse().map((fri) => {
            const isToday = fri.dateStr === new Date().toISOString().split('T')[0];
            return (
              <div 
                key={fri.dateStr}
                className={`min-w-[190px] rounded-2xl p-3 border flex flex-col justify-between shrink-0 transition-all ${
                  isToday 
                    ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-300 shadow-2xs' 
                    : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-extrabold text-slate-900 font-mono">
                      الجمعة ({toEnglishDigits(fri.weekNum)})
                    </span>
                    <span className="font-bold text-slate-500 font-mono">
                      {formatShortDate(fri.dateStr)}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-baseline justify-between">
                    <span className="text-xl font-black text-maroon-900 font-mono">
                      {toEnglishDigits(fri.rateAll)}%
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] font-black font-mono">
                      <span className="text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-md">
                        🟢 {toEnglishDigits(fri.presentAll)}
                      </span>
                      <span className="text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded-md">
                        🔴 {toEnglishDigits(fri.absentAll)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/70 text-[10px] flex items-center justify-between text-slate-600 font-bold font-mono">
                  <span>سنة أولى: <strong className="text-emerald-800">{toEnglishDigits(fri.rateY1)}%</strong></span>
                  <span>سنة ثانية: <strong className="text-blue-800">{toEnglishDigits(fri.rateY2)}%</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 📊 Section 3: Master Attendance Sheet Table (Excel Style) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-4">
        {/* Table Filters, Mode Switcher & Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Stage Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveStageFilter('all')}
              className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeStageFilter === 'all'
                  ? 'bg-maroon-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              القاعة المشتركة ({toEnglishDigits(servantsPrepStudents.length)})
            </button>

            <button
              type="button"
              onClick={() => setActiveStageFilter('first')}
              className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeStageFilter === 'first'
                  ? 'bg-maroon-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              السنة الأولى ({toEnglishDigits(stats.year1Count)})
            </button>

            <button
              type="button"
              onClick={() => setActiveStageFilter('second')}
              className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeStageFilter === 'second'
                  ? 'bg-maroon-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              السنة الثانية ({toEnglishDigits(stats.year2Count)})
            </button>
          </div>

          {/* 🎛️ Dual Attendance Entry Modes (تسجيل بدون وقت [الافتراضي] / تسجيل بوقت) */}
          <div className="flex items-center justify-between sm:justify-start gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setAttendanceEntryMode('quick')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 min-h-[34px] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                attendanceEntryMode === 'quick'
                  ? 'bg-maroon-900 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="لمسة واحدة للتبديل بين حاضر وغائب بدون تسجيل وقت"
            >
              <Check className="w-3.5 h-3.5 text-gold-300" />
              <span>تسجيل بدون وقت</span>
            </button>

            <button
              type="button"
              onClick={() => setAttendanceEntryMode('detailed')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 min-h-[34px] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                attendanceEntryMode === 'detailed'
                  ? 'bg-maroon-900 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="تحديد ساعة الوصول بالدقيقة عند النقر على أي خانة"
            >
              <Clock className="w-3.5 h-3.5 text-gold-300" />
              <span>تسجيل بوقت</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-56 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث بالاسم في الكشف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 min-h-[38px] text-xs text-slate-800 focus:outline-none focus:border-maroon-800 focus:bg-white transition-all font-bold"
            />
          </div>
        </div>

        {/* The Matrix Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto max-h-[550px] scrollbar-thin">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 font-black sticky top-0 z-20">
                  {/* Sticky Student Name Column */}
                  <th className="py-3 px-3 min-w-[150px] sticky right-0 bg-slate-100 z-30 shadow-xs border-l border-slate-200">
                    المخدوم / المرحلة
                  </th>

                  {/* Friday Columns */}
                  {fridaysList.map(({ dateStr, weekNum }) => {
                    const friStart = attendanceWindowSettings[`startTime_${dateStr}`] || attendanceWindowSettings.serviceStartTime || '10:30';
                    return (
                      <th 
                        key={dateStr}
                        className="py-2 px-1 text-center min-w-[72px] border-l border-slate-200 whitespace-nowrap"
                        title={`موعد بدء الخدمة لهذه الجمعة: ${friStart} ص (سماح حتى 15 دقيقة)`}
                      >
                        <div className="font-extrabold text-[11px]">جمعة {weekNum}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{formatShortDate(dateStr)}</div>
                        <div className="text-[9px] text-amber-800 font-mono font-bold bg-amber-50/80 rounded px-1 mt-0.5 inline-block">
                          {friStart} ص
                        </div>
                      </th>
                    );
                  })}

                  {/* Totals Columns */}
                  <th className="py-3 px-3 text-center min-w-[80px] bg-amber-50/80 text-amber-950 border-l border-amber-200 font-black">
                    الحضور
                  </th>
                  <th className="py-3 px-3 text-center min-w-[80px] bg-emerald-50/80 text-emerald-950 font-black">
                    النسبة %
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {displayedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={fridaysList.length + 3} className="py-8 text-center text-slate-400 font-bold">
                      لا يوجد مخدومين يطابقون هذا الفلتر
                    </td>
                  </tr>
                ) : (
                  displayedStudents.map((st) => {
                    const gradeLabel = st.grade === 'second' ? 'سنة ثانية' : 'سنة أولى';
                    
                    // Count student's attendance
                    let studentPresentCount = 0;
                    fridaysList.forEach(({ dateStr }) => {
                      if (recordsMap[`${st.id}_${dateStr}`]?.status === 'حاضر') {
                        studentPresentCount++;
                      }
                    });
                    const studentRate = fridaysList.length > 0 ? Math.round((studentPresentCount / fridaysList.length) * 100) : 0;

                    return (
                      <tr key={st.id} className="hover:bg-amber-50/30 transition-colors">
                        {/* Student Name & Grade (Sticky on RTL right) */}
                        <td className="py-2.5 px-3 sticky right-0 bg-white hover:bg-amber-50/30 z-10 border-l border-slate-200 shadow-xs">
                          <div className="font-extrabold text-slate-900 leading-tight">
                            {st.fullName || 'بدون اسم'}
                          </div>
                          <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-md mt-0.5 ${
                            st.grade === 'second' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {gradeLabel}
                          </span>
                        </td>

                        {/* Attendance for each Friday */}
                        {fridaysList.map(({ dateStr }) => {
                          const cellKey = `${st.id}_${dateStr}`;
                          const record = recordsMap[cellKey];
                          const isUpdating = updatingId === cellKey;
                          const isLate = checkIsLate(record, dateStr);

                          return (
                            <td 
                              key={dateStr}
                              onClick={() => handleCellClick(st, dateStr)}
                              title={
                                record?.status === 'حاضر'
                                  ? `حاضر • ${isLate ? 'متأخر ⏱️' : 'في الموعد 🟢'} ${record.time ? `(ساعة الحضور: ${toEnglishDigits(record.time)})` : ''} ${record.type === 'numeric_pin' ? '• تم بكود الخدمة' : record.type === 'qr_scan' ? '• تم بمسح QR' : ''} (انقر للتعديل)`
                                  : record?.status === 'غائب'
                                  ? 'غائب (انقر للتعديل)'
                                  : 'لم يُرصد (انقر للرصد)'
                              }
                              className={`py-1.5 px-1 text-center border-l border-slate-100 cursor-pointer hover:bg-slate-100/70 transition-all active:scale-95 select-none ${
                                isLate ? 'bg-amber-50/60' : ''
                              }`}
                            >
                              {isUpdating ? (
                                <span className="inline-block w-3.5 h-3.5 border-2 border-maroon-800 border-t-transparent rounded-full animate-spin"></span>
                              ) : record?.status === 'حاضر' ? (
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <div className="relative inline-flex items-center justify-center">
                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg font-black text-xs shadow-2xs ${
                                      isLate
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                      {isLate ? '⏱️' : '✓'}
                                    </span>
                                    {(record.type === 'numeric_pin' || record.type === 'qr_scan') && (
                                      <span 
                                        className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 border border-white shadow-2xs"
                                        title="تم التسجيل ذاتياً بكود الحضور"
                                      />
                                    )}
                                  </div>
                                  {record.time && (
                                    <span className={`text-[9px] font-mono font-bold leading-tight whitespace-nowrap px-1 rounded ${
                                      isLate
                                        ? 'text-amber-900 bg-amber-100/90'
                                        : 'text-emerald-800'
                                    }`}>
                                      {toEnglishDigits(record.time)}
                                    </span>
                                  )}
                                </div>
                              ) : record?.status === 'غائب' ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-rose-100 text-rose-700 font-black text-xs shadow-2xs">
                                  ✕
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-slate-300 font-bold text-xs hover:text-slate-500">
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}

                        {/* Student Totals */}
                        <td className="py-2.5 px-2 text-center border-l border-amber-200 bg-amber-50/30 font-black text-slate-800 font-mono">
                          {toEnglishDigits(studentPresentCount)} / {toEnglishDigits(fridaysList.length)}
                        </td>
                        <td className="py-2.5 px-2 text-center bg-emerald-50/30 font-black font-mono">
                          <span className={`px-2 py-0.5 rounded-lg text-[11px] ${
                            studentRate >= 80 ? 'bg-emerald-100 text-emerald-800' :
                            studentRate >= 50 ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {toEnglishDigits(studentRate)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Summary Footer */}
              <tfoot>
                <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 sticky bottom-0 z-20">
                  <td className="py-3 px-3 sticky right-0 bg-slate-100 z-30 border-l border-slate-300">
                    إجمالي الحضور في الجمعة:
                  </td>

                  {fridaysList.map(({ dateStr }) => {
                    const friStat = stats.fridayStats.find(f => f.dateStr === dateStr);
                    return (
                      <td key={dateStr} className="py-2.5 px-1 text-center border-l border-slate-300 font-mono text-[11px]">
                        <div className="text-emerald-700 font-black">{toEnglishDigits(friStat?.presentAll || 0)}</div>
                        <div className="text-[10px] text-slate-500 font-normal">({toEnglishDigits(friStat?.rateAll || 0)}%)</div>
                      </td>
                    );
                  })}

                  <td colSpan={2} className="py-3 px-3 text-center bg-slate-200 text-slate-900 font-black">
                    المتوسط العام: <span className="text-maroon-900 font-mono mr-1">{toEnglishDigits(stats.overallRate)}%</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Legend / Key */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-xs">✓</span>
            <span>حاضر في الموعد (أول 15 دقيقة)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-black flex items-center justify-center text-xs">⏱️</span>
            <span>حاضر متأخر (بعد فترة السماح)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative inline-flex items-center justify-center w-5 h-5 rounded-md bg-slate-100 text-slate-800 font-black text-xs">
              ✓
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 border border-white" />
            </span>
            <span>سجّل ذاتياً بكود الحضور 📱</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-700 font-black flex items-center justify-center text-xs">✕</span>
            <span>غائب</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-400 font-black flex items-center justify-center text-xs">—</span>
            <span>لم يُرصد</span>
          </div>
          <span className="text-slate-400 mr-auto font-bold">
            💡 يمكنك النقر على أي خانة لتعديل حالة الحضور فوراً.
          </span>
        </div>
      </div>

      {/* 📝 Detailed Cell Edit Modal (تعديل الحالة وساعة الوصول بالدقيقة وتفريغ الورق) */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs font-cairo">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {editingCell.student.fullName || 'مخدوم'}
                </h3>
                <span className="text-[11px] text-slate-500 font-bold">
                  {fridaysList.find(f => f.dateStr === editingCell.dateStr)?.weekNum 
                    ? `جمعة (${toEnglishDigits(fridaysList.find(f => f.dateStr === editingCell.dateStr).weekNum)}) - ${formatShortDate(editingCell.dateStr)}` 
                    : editingCell.dateStr}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Status Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">حالة الحضور:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setModalStatus('حاضر')}
                  className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    modalStatus === 'حاضر'
                      ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-300'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  ✓ حاضر
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalStatus('غائب');
                    setModalTime('');
                  }}
                  className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    modalStatus === 'غائب'
                      ? 'bg-rose-700 text-white shadow-xs ring-2 ring-rose-300'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                  }`}
                >
                  ✕ غائب
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalStatus('unrecorded');
                    setModalTime('');
                  }}
                  className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    modalStatus === 'unrecorded'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  — مسح
                </button>
              </div>
            </div>

            {/* Time Controls (Only if حاضر) */}
            {modalStatus === 'حاضر' && (
              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-maroon-800" />
                    <span>ساعة الحضور (بالدقيقة):</span>
                  </label>
                  {modalTime && (
                    <button
                      type="button"
                      onClick={() => setModalTime('')}
                      className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                      title="مسح الوقت ليبقى حاضر بدون وقت محدد"
                    >
                      مسح الوقت ✕
                    </button>
                  )}
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {['10:30', '10:45', '11:00', '11:15'].map(pTime => {
                    const displayLabel = `${pTime} ص`;
                    return (
                      <button
                        key={pTime}
                        type="button"
                        onClick={() => setModalTime(displayLabel)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          modalTime === displayLabel
                            ? 'bg-maroon-900 text-white ring-1 ring-gold-400'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {toEnglishDigits(displayLabel)}
                      </button>
                    );
                  })}
                </div>

                {/* Direct Input */}
                <div className="mt-1">
                  <input
                    type="text"
                    placeholder="مثال: 10:42 ص"
                    value={modalTime}
                    onChange={(e) => setModalTime(toEnglishDigits(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-maroon-800"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  💡 اترك الوقت فارغاً إن أردت إظهار علامة (✓) فقط بدون وقت محدد.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={modalSubmitting}
                onClick={handleSaveModal}
                className="flex-1 py-2.5 bg-maroon-900 hover:bg-maroon-800 active:scale-95 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {modalSubmitting ? 'جارٍ الحفظ...' : 'حفظ التعديل ✓'}
              </button>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
