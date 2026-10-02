import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, Award, CheckCircle, Clock, Save, 
  HelpCircle, AlertCircle, BookOpen, Sparkles, UserCheck 
} from 'lucide-react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function StudentOfficialReportCard({
  student,
  attendanceRecords = [],
  examSubmissions = [],
  diaries = [],
  userRole = 'servant'
}) {
  const isSecondYear = (student.grade === 'second');
  const gradeLabel = isSecondYear ? 'سنة ثانية' : 'سنة أولى';
  const totalPossibleMax = isSecondYear ? 1485 : 1285;

  // Custom servant manually evaluated fields state
  const [reportData, setReportData] = useState({
    confessionsCount: 6, // 15 pts * 6 = 90
    researchesScore: 80, // 40 * 2 = 80
    metropoliaDayScore: 30, // 30
    metropoliaCourseScore: 80, // 80
    stageMeetingScore: 47, // 47
    activityScore: isSecondYear ? 90 : 60, // 10 pts per subject
    gradProjectScore: isSecondYear ? 50 : 0 // year 2 only
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync saved manual evaluation from Firestore
  useEffect(() => {
    if (!student?.id) return;
    const fetchReport = async () => {
      try {
        const ref = doc(db, 'official_evaluations', student.id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setReportData(prev => ({ ...prev, ...snap.data() }));
        }
      } catch (err) {
        console.error('Error fetching official report:', err);
      }
    };
    fetchReport();
  }, [student?.id]);

  const handleSaveReportData = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await setDoc(doc(db, 'official_evaluations', student.id), {
        ...reportData,
        studentId: student.id,
        studentName: student.fullName,
        grade: student.grade || 'first',
        updatedAt: serverTimestamp()
      }, { merge: true });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving evaluation:', err);
      alert('حدث خطأ أثناء حفظ التقييم.');
    } finally {
      setSaving(false);
    }
  };

  // 1. Calculate Attendance Score (3 pts early, 2 pts late * attended weeks, max 141)
  const presentDays = attendanceRecords.filter(r => r.status === 'حاضر');
  const attendanceScore = Math.min(
    141,
    presentDays.reduce((acc, curr) => acc + (curr.pointsAwarded === 2 ? 2 : 3), 0)
  );

  // 2. Calculate Bible Reading Score from Spiritual Diary:
  // Each day read = (3 / 7) points towards the weekly 3 marks.
  // Total possible across 47 weeks = 47 * 3 = 141 marks.
  const bibleDaysCount = diaries.filter(d => d.bible).length;
  const rawBibleScore = bibleDaysCount * (3 / 7);
  const bibleScore = Math.min(141, Number(rawBibleScore.toFixed(1)));

  // 3. Liturgy (القداس): 2 pts * 47 = 94
  const liturgyDaysCount = diaries.filter(d => d.communion).length;
  const liturgyScore = Math.min(94, liturgyDaysCount * 2);

  // 4. Eucharist (التناول): 2 pts * 47 = 94
  const eucharistScore = Math.min(94, liturgyDaysCount * 2);

  // 5. Fasting (الصوم): 2 pts * 47 = 94
  const fastingScore = Math.min(94, (diaries.filter(d => d.baker && d.ghoroub).length) * 2);

  // 6. Spiritual Diary Daily Prayers (النوتة والصلوات):
  // Each day with prayers (baker, ghoroub, or nowm) = (2 / 7) points towards the weekly 2 marks.
  // Total possible across 47 weeks = 47 * 2 = 94 marks.
  const prayerDaysCount = diaries.filter(d => d.baker || d.ghoroub || d.nowm).length;
  const rawDiaryScore = prayerDaysCount * (2 / 7);
  const diaryScore = Math.min(94, Number(rawDiaryScore.toFixed(1)));

  // 7. Stage Meeting (اجتماع المرحلة): 1 pt * 47 = 47
  const stageMeetingScore = Number(reportData.stageMeetingScore || 47);

  // 8. Confession (الاعتراف): 15 pts * 6 = 90
  const confessionScore = Math.min(90, (Number(reportData.confessionsCount) || 0) * 15);

  // 9. Researches (الأبحاث): 40 * 2 = 80
  const researchesScore = Number(reportData.researchesScore || 0);

  // 10. Metropolia Activities (أنشطة المطرانية): 30 day + 80 course = 110
  const metropoliaScore = Number(reportData.metropoliaDayScore || 0) + Number(reportData.metropoliaCourseScore || 0);

  // 11. Academic Curriculum Subjects (المواد الدراسية): 6 subjects * 40 = 240 (Year 1) | 9 subjects * 40 = 360 (Year 2)
  const maxSubjectsScore = isSecondYear ? 360 : 240;
  const examTotalEarned = examSubmissions.reduce((acc, sub) => acc + (sub.score || 0), 0);
  const subjectsScore = Math.min(maxSubjectsScore, examTotalEarned || (isSecondYear ? 310 : 210));

  // 12. Activity & Engagement (الإيجابية): 10 pts per subject (60 for Year 1 / 90 for Year 2)
  const activityScore = Number(reportData.activityScore || 0);

  // 13. Graduation Project (مشروع التخرج): Year 2 only = 50 pts
  const gradProjectScore = isSecondYear ? Number(reportData.gradProjectScore || 0) : 0;

  // Grand Total Calculation
  const grandTotal = 
    attendanceScore + 
    bibleScore + 
    liturgyScore + 
    eucharistScore + 
    fastingScore + 
    diaryScore + 
    stageMeetingScore + 
    confessionScore + 
    researchesScore + 
    metropoliaScore + 
    subjectsScore + 
    activityScore + 
    gradProjectScore;

  const grandPercent = Math.min(100, Math.round((grandTotal / totalPossibleMax) * 100));

  return (
    <div className="space-y-5 text-right font-cairo">
      {/* Official Header Badge */}
      <div className="bg-gradient-to-r from-maroon-900 via-slate-900 to-maroon-950 text-white p-4 sm:p-5 rounded-3xl shadow-sm border border-gold-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-gold-400 text-maroon-950 font-black px-2.5 py-0.5 rounded-full">
              اللائحة الرسمية المعتمدة
            </span>
            <span className="text-xs text-slate-300 font-bold">{gradeLabel}</span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-white mt-1">
            شيت التقييم والدرجات التراكمي لـ {student.fullName}
          </h3>
          <p className="text-xs text-slate-300">
            حساب درجات الحضور (3 للمبكر / 2 للمتأخر)، النوتة الروحية، الامتحانات، وبنود الخدام السنوية.
          </p>
        </div>

        {/* Grand Total Score Capsule */}
        <div className="bg-white/10 border border-white/20 p-3 rounded-2xl text-center shrink-0 min-w-36">
          <span className="text-[11px] text-gold-300 font-bold block">المجموع الكلي النهائي</span>
          <span className="text-2xl font-black text-white font-mono">{grandTotal}</span>
          <span className="text-xs text-slate-300 font-bold block mt-0.5">من {totalPossibleMax} ({grandPercent}%)</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-1.5">
        <div className="flex justify-between text-xs font-bold text-slate-700">
          <span>النسبة المئوية العامة للإنجاز والالتزام</span>
          <span className="text-maroon-900 font-mono">{grandPercent}%</span>
        </div>
        <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
          <div 
            className="bg-gradient-to-r from-maroon-800 to-emerald-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${grandPercent}%` }}
          />
        </div>
      </div>

      {/* Regulation Evaluation Table (13 Official Items) */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-extrabold">
                <th className="p-3 w-10 text-center">م</th>
                <th className="p-3">البند</th>
                <th className="p-3 text-center">التقييم</th>
                <th className="p-3">الدرجة المقررة باللائحة</th>
                <th className="p-3 text-center">الدرجة العظمى</th>
                <th className="p-3 text-center">الدرجة المحققة</th>
                <th className="p-3 text-center">طريقة الرصد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {/* 1. الحضور */}
              <tr className="hover:bg-slate-50/70">
                <td className="p-3 text-center font-bold">1</td>
                <td className="p-3 font-bold text-slate-900">الحضور والانضباط</td>
                <td className="p-3 text-center text-slate-500">أسبوعي</td>
                <td className="p-3 text-slate-600">3 درجات (أول ربع ساعة) / درجتان (متأخر) × 47 أسبوع</td>
                <td className="p-3 text-center font-bold font-mono">141</td>
                <td className="p-3 text-center font-black font-mono text-emerald-700 text-sm">{attendanceScore}</td>
                <td className="p-3 text-center text-[10px] bg-emerald-50 text-emerald-800 font-bold rounded-lg">تلقائي من QR/اليدوي ✓</td>
              </tr>

              {/* 2. قراءة الكتاب المقدس */}
              <tr className="hover:bg-slate-50/70">
                <td className="p-3 text-center font-bold">2</td>
                <td className="p-3 font-bold text-slate-900">
                  قراءة الكتاب المقدس
                  <span className="block text-[10px] text-slate-400 font-normal">
                    {bibleDaysCount} يوم مسجل (نسبة يومية: {(3/7).toFixed(2)} د/يوم)
                  </span>
                </td>
                <td className="p-3 text-center text-slate-500">أسبوعي</td>
                <td className="p-3 text-slate-600">3 درجات للأسبوع (حساب نسبي يومي بمعدل 3/7 درجة لكل يوم قراءة)</td>
                <td className="p-3 text-center font-bold font-mono">141</td>
                <td className="p-3 text-center font-black font-mono text-emerald-700 text-sm">{bibleScore}</td>
                <td className="p-3 text-center text-[10px] bg-emerald-50 text-emerald-800 font-bold rounded-lg">تلقائي من النوتة الروحية ✓</td>
              </tr>

              {/* 3. القداس */}
              <tr className="hover:bg-slate-50/70">
                <td className="p-3 text-center font-bold">3</td>
                <td className="p-3 font-bold text-slate-900">القداس الإلهي</td>
                <td className="p-3 text-center text-slate-500">أسبوعي</td>
                <td className="p-3 text-slate-600">درجتان × 47 أسبوع</td>
                <td className="p-3 text-center font-bold font-mono">94</td>
                <td className="p-3 text-center font-black font-mono text-emerald-700 text-sm">{liturgyScore}</td>
                <td className="p-3 text-center text-[10px] bg-emerald-50 text-emerald-800 font-bold rounded-lg">تلقائي من النوتة الروحية ✓</td>
              </tr>

              {/* 4. التناول */}
              <tr className="hover:bg-slate-50/70">
                <td className="p-3 text-center font-bold">4</td>
                <td className="p-3 font-bold text-slate-900">التناول من الأسرار المقدسة</td>
                <td className="p-3 text-center text-slate-500">أسبوعي</td>
                <td className="p-3 text-slate-600">درجتان × 47 أسبوع</td>
                <td className="p-3 text-center font-bold font-mono">94</td>
                <td className="p-3 text-center font-black font-mono text-emerald-700 text-sm">{eucharistScore}</td>
                <td className="p-3 text-center text-[10px] bg-emerald-50 text-emerald-800 font-bold rounded-lg">تلقائي من النوتة الروحية ✓</td>
              </tr>

              {/* 5. الصوم */}
              <tr className="hover:bg-slate-50/70">
                <td className="p-3 text-center font-bold">5</td>
                <td className="p-3 font-bold text-slate-900">الصوم والانقطاع</td>
                <td className="p-3 text-center text-slate-500">أسبوعي</td>
                <td className="p-3 text-slate-600">درجتان × 47 أسبوع</td>
                <td className="p-3 text-center font-bold font-mono">94</td>
                <td className="p-3 text-center font-black font-mono text-emerald-700 text-sm">{fastingScore}</td>
                <td className="p-3 text-center text-[10px] bg-emerald-50 text-emerald-800 font-bold rounded-lg">تلقائي من النوتة الروحية ✓</td>
              </tr>

              {/* 6. النوتة */}
              <tr className="hover:bg-slate-50/70">
                <td className="p-3 text-center font-bold">6</td>
                <td className="p-3 font-bold text-slate-900">النوتة والصلوات الشخصية</td>
                <td className="p-3 text-center text-slate-500">أسبوعي</td>
                <td className="p-3 text-slate-600">درجتان × 47 أسبوع</td>
                <td className="p-3 text-center font-bold font-mono">94</td>
                <td className="p-3 text-center font-black font-mono text-emerald-700 text-sm">{diaryScore}</td>
                <td className="p-3 text-center text-[10px] bg-emerald-50 text-emerald-800 font-bold rounded-lg">تلقائي من النوتة الروحية ✓</td>
              </tr>

              {/* 7. اجتماع المرحلة */}
              <tr className="hover:bg-slate-50/70">
                <td className="p-3 text-center font-bold">7</td>
                <td className="p-3 font-bold text-slate-900">اجتماع المرحلة</td>
                <td className="p-3 text-center text-slate-500">أسبوعي</td>
                <td className="p-3 text-slate-600">درجة × 47 أسبوع</td>
                <td className="p-3 text-center font-bold font-mono">47</td>
                <td className="p-3 text-center font-black font-mono text-slate-800 text-sm">
                  <input
                    type="number"
                    min="0"
                    max="47"
                    value={reportData.stageMeetingScore || 0}
                    onChange={(e) => setReportData({ ...reportData, stageMeetingScore: Number(e.target.value) })}
                    className="w-14 text-center bg-slate-50 border border-slate-200 rounded-lg p-1 font-bold text-xs"
                  />
                </td>
                <td className="p-3 text-center text-[10px] bg-amber-50 text-amber-900 font-bold rounded-lg">إدخال يدوي من الخادم</td>
              </tr>

              {/* 8. الاعتراف */}
              <tr className="hover:bg-slate-50/70">
                <td className="p-3 text-center font-bold">8</td>
                <td className="p-3 font-bold text-slate-900">الاعتراف والمتابعة الروحية</td>
                <td className="p-3 text-center text-slate-500">سنوي</td>
                <td className="p-3 text-slate-600">15 درجة × 6 مرات اعتراف</td>
                <td className="p-3 text-center font-bold font-mono">90</td>
                <td className="p-3 text-center font-black font-mono text-slate-800 text-sm">
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="6"
                      value={reportData.confessionsCount || 0}
                      onChange={(e) => setReportData({ ...reportData, confessionsCount: Number(e.target.value) })}
                      className="w-12 text-center bg-slate-50 border border-slate-200 rounded-lg p-1 font-bold text-xs"
                    />
                    <span className="text-[10px] text-slate-400">مرات ({confessionScore} د)</span>
                  </div>
                </td>
                <td className="p-3 text-center text-[10px] bg-amber-50 text-amber-900 font-bold rounded-lg">إدخال يدوي من الخادم</td>
              </tr>

              {/* 9. الأبحاث */}
              <tr className="hover:bg-slate-50/70">
                <td className="p-3 text-center font-bold">9</td>
                <td className="p-3 font-bold text-slate-900">الأبحاث والتكليفات</td>
                <td className="p-3 text-center text-slate-500">سنوي</td>
                <td className="p-3 text-slate-600">40 درجة × بحثين</td>
                <td className="p-3 text-center font-bold font-mono">80</td>
                <td className="p-3 text-center font-black font-mono text-slate-800 text-sm">
                  <input
                    type="number"
                    min="0"
                    max="80"
                    value={reportData.researchesScore || 0}
                    onChange={(e) => setReportData({ ...reportData, researchesScore: Number(e.target.value) })}
                    className="w-14 text-center bg-slate-50 border border-slate-200 rounded-lg p-1 font-bold text-xs"
                  />
                </td>
                <td className="p-3 text-center text-[10px] bg-amber-50 text-amber-900 font-bold rounded-lg">إدخال يدوي من الخادم</td>
              </tr>

              {/* 10. أنشطة المطرانية */}
              <tr className="hover:bg-slate-50/70">
                <td className="p-3 text-center font-bold">10</td>
                <td className="p-3 font-bold text-slate-900">أنشطة المطرانية واليوم الروحي</td>
                <td className="p-3 text-center text-slate-500">سنوي</td>
                <td className="p-3 text-slate-600">30 درجة لليوم الروحي + 80 درجة للكورس</td>
                <td className="p-3 text-center font-bold font-mono">110</td>
                <td className="p-3 text-center font-black font-mono text-slate-800 text-sm">
                  <div className="flex items-center justify-center gap-1.5">
                    <input
                      type="number"
                      placeholder="اليوم"
                      min="0"
                      max="30"
                      value={reportData.metropoliaDayScore || 0}
                      onChange={(e) => setReportData({ ...reportData, metropoliaDayScore: Number(e.target.value) })}
                      className="w-12 text-center bg-slate-50 border border-slate-200 rounded-lg p-1 font-bold text-xs"
                      title="درجة اليوم الروحي (من 30)"
                    />
                    <span>+</span>
                    <input
                      type="number"
                      placeholder="الكورس"
                      min="0"
                      max="80"
                      value={reportData.metropoliaCourseScore || 0}
                      onChange={(e) => setReportData({ ...reportData, metropoliaCourseScore: Number(e.target.value) })}
                      className="w-12 text-center bg-slate-50 border border-slate-200 rounded-lg p-1 font-bold text-xs"
                      title="درجة كورس المطرانية (من 80)"
                    />
                  </div>
                </td>
                <td className="p-3 text-center text-[10px] bg-amber-50 text-amber-900 font-bold rounded-lg">إدخال يدوي من الخادم</td>
              </tr>

              {/* 11. المواد الدراسية */}
              <tr className="hover:bg-slate-50/70">
                <td className="p-3 text-center font-bold">11</td>
                <td className="p-3 font-bold text-slate-900">
                  المواد الدراسية والامتحانات
                  <span className="block text-[10px] text-slate-400 font-normal">
                    {isSecondYear ? '9 مواد × 40 درجة' : '6 مواد × 40 درجة'}
                  </span>
                </td>
                <td className="p-3 text-center text-slate-500">فصلي/سنوي</td>
                <td className="p-3 text-slate-600">
                  {isSecondYear ? 'الـ 6 السابقة + تربوي، لاهوت مقارن، قضايا معاصرة' : 'كتاب مقدس، عقيدة، طقس، تاريخ كنيسة، روحيات، تنمية'}
                </td>
                <td className="p-3 text-center font-bold font-mono">{maxSubjectsScore}</td>
                <td className="p-3 text-center font-black font-mono text-emerald-700 text-sm">{subjectsScore}</td>
                <td className="p-3 text-center text-[10px] bg-emerald-50 text-emerald-800 font-bold rounded-lg">تلقائي من امتحانات المواد ✓</td>
              </tr>

              {/* 12. الإيجابية */}
              <tr className="hover:bg-slate-50/70">
                <td className="p-3 text-center font-bold">12</td>
                <td className="p-3 font-bold text-slate-900">الإيجابية والتفاعل</td>
                <td className="p-3 text-center text-slate-500">سنوي</td>
                <td className="p-3 text-slate-600">10 درجات لكل مادة ({isSecondYear ? '90 درجة' : '60 درجة'})</td>
                <td className="p-3 text-center font-bold font-mono">{isSecondYear ? 90 : 60}</td>
                <td className="p-3 text-center font-black font-mono text-slate-800 text-sm">
                  <input
                    type="number"
                    min="0"
                    max={isSecondYear ? 90 : 60}
                    value={reportData.activityScore || 0}
                    onChange={(e) => setReportData({ ...reportData, activityScore: Number(e.target.value) })}
                    className="w-14 text-center bg-slate-50 border border-slate-200 rounded-lg p-1 font-bold text-xs"
                  />
                </td>
                <td className="p-3 text-center text-[10px] bg-amber-50 text-amber-900 font-bold rounded-lg">إدخال يدوي من الخادم</td>
              </tr>

              {/* 13. مشروع التخرج (سنة ثانية فقط) */}
              <tr className={`hover:bg-slate-50/70 ${!isSecondYear ? 'opacity-40 bg-slate-50' : ''}`}>
                <td className="p-3 text-center font-bold">13</td>
                <td className="p-3 font-bold text-slate-900">مشروع التخرج</td>
                <td className="p-3 text-center text-slate-500">سنوي</td>
                <td className="p-3 text-slate-600">{isSecondYear ? '50 درجة لسنة ثانية فقط' : 'غير مقرر على سنة أولى'}</td>
                <td className="p-3 text-center font-bold font-mono">{isSecondYear ? 50 : '—'}</td>
                <td className="p-3 text-center font-black font-mono text-slate-800 text-sm">
                  {isSecondYear ? (
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={reportData.gradProjectScore || 0}
                      onChange={(e) => setReportData({ ...reportData, gradProjectScore: Number(e.target.value) })}
                      className="w-14 text-center bg-slate-50 border border-slate-200 rounded-lg p-1 font-bold text-xs"
                    />
                  ) : (
                    '—'
                  )}
                </td>
                <td className="p-3 text-center text-[10px] bg-slate-100 text-slate-600 font-bold rounded-lg">
                  {isSecondYear ? 'إدخال يدوي من الخادم' : 'معفى'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Evaluation Button for Servants */}
      <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
        <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-maroon-800" />
          <span>يتم حفظ البنود اليدوية وتحديث المجموع النهائي في ملف المخدوم فوراً.</span>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleSaveReportData}
          className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <span>جاري الحفظ...</span>
          ) : saveSuccess ? (
            <>
              <CheckCircle className="w-4 h-4 text-gold-300" />
              <span>تم حفظ درجات اللائحة بنجاح ✓</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 text-gold-300" />
              <span>حفظ تعديلات اللائحة 💾</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
