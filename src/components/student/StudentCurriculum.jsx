import React, { useState, useEffect } from 'react';
import { 
  BookOpen, ChevronLeft, Download, FileText, Video, X, Eye,
  FileSpreadsheet, Music, Image as ImageIcon, File, Calendar, User, FolderPlus, Sparkles 
} from 'lucide-react';
import { useBackHandler, NAV_PRIORITY } from '../../utils/navigationManager';

const getDriveFileId = (mat) => {
  if (!mat) return null;
  if (mat.fileId) return mat.fileId;
  if (!mat.url) return null;
  const match = mat.url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || mat.url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

const normalizeLectures = (subject) => {
  if (!subject) return [];
  if (Array.isArray(subject.lectures) && subject.lectures.length > 0) {
    return subject.lectures;
  }
  if (Array.isArray(subject.references) && subject.references.length > 0) {
    return [
      {
        id: 'legacy-lecture-1',
        title: 'المحاضرة الأولى',
        date: subject.references[0]?.date || new Date().toISOString().split('T')[0],
        lecturer: subject.references[0]?.uploadedBy || subject.teacher || 'خادم المادة',
        isPublishedForStudents: subject.references.some(r => r.isPublishedForStudents !== false),
        files: subject.references
      }
    ];
  }
  return [];
};

export const formatContentCounts = (lecsCount, refsCount, isServant = false) => {
  const parts = [];

  if (lecsCount > 0) {
    if (lecsCount === 1) parts.push('محاضرة واحدة');
    else if (lecsCount === 2) parts.push('محاضرتان');
    else if (lecsCount >= 3 && lecsCount <= 10) parts.push(`${lecsCount} محاضرات`);
    else parts.push(`${lecsCount} محاضرة`);
  }

  if (refsCount > 0) {
    if (refsCount === 1) parts.push('1 مرجع');
    else if (refsCount === 2) parts.push('مرجعان');
    else if (refsCount >= 3 && refsCount <= 10) parts.push(`${refsCount} مراجع`);
    else parts.push(`${refsCount} مرجع`);
  }

  if (parts.length === 0) {
    return {
      topLabel: 'لا توجد محتويات بعد',
      bottomLabel: isServant ? 'إدارة المادة (فارغة)' : 'تصفح المادة (فارغة)'
    };
  }

  const combined = parts.join(' و ');
  return {
    topLabel: combined,
    bottomLabel: isServant
      ? (parts.length === 1 && lecsCount > 0
          ? `إدارة محاضرات المادة (${lecsCount})`
          : parts.length === 1 && refsCount > 0
            ? `إدارة مراجع المادة (${refsCount})`
            : `إدارة محتوى المادة (${combined})`)
      : (parts.length === 1 && lecsCount > 0
          ? `تصفح محاضرات المادة (${lecsCount})`
          : parts.length === 1 && refsCount > 0
            ? `تصفح مراجع المادة (${refsCount})`
            : `تصفح محتوى المادة (${combined})`)
  };
};

export default function StudentCurriculum({
  user,
  getGradeTitle,
  subjectsData = [],
  selectedSubject,
  setSelectedSubject,
  activePreviewPdf,
  setActivePreviewPdf,
  activePreviewVideo,
  setActivePreviewVideo
}) {
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [subjectSubTab, setSubjectSubTab] = useState('lectures'); // 'lectures' | 'references'

  // Back button returns to lectures list when a single lecture is open
  useBackHandler(Boolean(selectedLecture), () => setSelectedLecture(null), NAV_PRIORITY.SUBVIEW + 5);

  // Reset selectedLecture and tab when selectedSubject changes
  useEffect(() => {
    setSelectedLecture(null);
    setSubjectSubTab('lectures');
  }, [selectedSubject]);
  const getRefTypeMeta = (type) => {
    switch (type) {
      case 'pdf':
        return { label: 'ملف PDF', icon: FileText, color: 'text-red-700 bg-red-50 border-red-200' };
      case 'doc':
        return { label: 'مستند Word', icon: FileText, color: 'text-blue-700 bg-blue-50 border-blue-200' };
      case 'excel':
        return { label: 'شيت Excel', icon: FileSpreadsheet, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'ppt':
        return { label: 'عرض PowerPoint', icon: FileText, color: 'text-amber-700 bg-amber-50 border-amber-200' };
      case 'image':
        return { label: 'صورة', icon: ImageIcon, color: 'text-cyan-700 bg-cyan-50 border-cyan-200' };
      case 'audio':
        return { label: 'تسجيل صوتي', icon: Music, color: 'text-purple-700 bg-purple-50 border-purple-200' };
      case 'video':
        return { label: 'فيديو يوتيوب', icon: Video, color: 'text-red-700 bg-red-50 border-red-200' };
      default:
        return { label: 'ملف مرفق', icon: File, color: 'text-slate-700 bg-slate-100 border-slate-300' };
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 text-right">
      <div>
        <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-maroon-800" />
          المنهج والمواد الدراسية ({getGradeTitle ? getGradeTitle(user?.grade) : (user?.grade || 'المرحلة الدراسية')})
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">اختر المادة لتصفح المذكرات والمحاضرات الصوتية والمرئية المرفوعة من الخدام.</p>
      </div>

      {!selectedSubject ? (
        subjectsData.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">لم يتم رفع مواد أو مراجع دراسية لهذه المرحلة حتى الآن.</p>
            <p className="text-[11px] text-slate-400 mt-1">سيقوم الخدام بإضافة المواد والمراجع والمذكرات تباعاً.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subjectsData.map((sub) => {
              const publishedLecs = normalizeLectures(sub).filter(l => l.isPublishedForStudents !== false);
              const lecsCount = publishedLecs.length;
              const lectureFileKeys = new Set(
                publishedLecs.flatMap(l => (l.files || []).map(f => f.id || f.url || f.fileId || f.title).filter(Boolean))
              );
              const refsCount = (sub.references || []).filter(r => 
                r && 
                r.isPublishedForStudents !== false && 
                r.targetAudience !== 'servants' &&
                !lectureFileKeys.has(r.id) &&
                !lectureFileKeys.has(r.url) &&
                !lectureFileKeys.has(r.fileId) &&
                !lectureFileKeys.has(r.title)
              ).length;
              const counts = formatContentCounts(lecsCount, refsCount, false);

              return (
                <div
                  key={sub.id}
                  onClick={() => setSelectedSubject(sub)}
                  className="bg-slate-50 border border-slate-200 hover:border-maroon-700 p-5 rounded-2xl cursor-pointer transition-all hover:shadow-md group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] bg-maroon-100 text-maroon-900 font-extrabold px-2.5 py-0.5 rounded-full">
                        {sub.teacher || 'خادم المادة'}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">{counts.topLabel}</span>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-base group-hover:text-maroon-800 transition-colors mb-1">
                      {sub.name}
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      المذكرات الدراسية وملفات الشرح والمحاضرات المعتمدة.
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-maroon-800 pt-3 border-t border-slate-200/60">
                    <span>{counts.bottomLabel}</span>
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {!selectedLecture ? (
            /* ========================================================================= */
            /* 1. LECTURES LIST VIEW FOR SELECTED SUBJECT                               */
            /* ========================================================================= */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-maroon-800" />
                    <span>مادة: {selectedSubject.name}</span>
                  </h4>
                  <span className="text-xs text-slate-500">مسئول المادة: <strong className="text-slate-700">{selectedSubject.teacher || 'خادم المادة'}</strong></span>
                </div>
                <button
                  onClick={() => setSelectedSubject(null)}
                  className="text-xs font-bold text-maroon-800 hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 cursor-pointer transition-colors self-start sm:self-auto"
                >
                  ← العودة لكل المواد
                </button>
              </div>

              {(() => {
                const visibleLectures = normalizeLectures(selectedSubject).filter(
                  lec => lec.isPublishedForStudents !== false
                );

                const subjectReferences = (() => {
                  const map = new Map();
                  const lectureFileKeys = new Set(
                    visibleLectures.flatMap(l => (l.files || []).map(f => f.id || f.url || f.fileId || f.title).filter(Boolean))
                  );
                  if (Array.isArray(selectedSubject.references)) {
                    selectedSubject.references.forEach((rf, idx) => {
                      if (
                        rf && 
                        rf.isPublishedForStudents !== false && 
                        rf.targetAudience !== 'servants' &&
                        !lectureFileKeys.has(rf.id) &&
                        !lectureFileKeys.has(rf.url) &&
                        !lectureFileKeys.has(rf.fileId) &&
                        !lectureFileKeys.has(rf.title)
                      ) {
                        const key = rf.id || rf.url || `${rf.title}-${idx}`;
                        if (!map.has(key)) map.set(key, rf);
                      }
                    });
                  }
                  return Array.from(map.values());
                })();

                return (
                  <div className="space-y-4">
                    {/* Dual Sub-Tabs Bar: Lectures vs References */}
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                      <button
                        type="button"
                        onClick={() => setSubjectSubTab('lectures')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                          subjectSubTab === 'lectures'
                            ? 'bg-maroon-800 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>المحاضرات الأسبوعية</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          subjectSubTab === 'lectures' ? 'bg-maroon-700 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {visibleLectures.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSubjectSubTab('references')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                          subjectSubTab === 'references'
                            ? 'bg-maroon-800 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>مراجع وكتب المادة</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          subjectSubTab === 'references' ? 'bg-maroon-700 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {subjectReferences.length}
                        </span>
                      </button>
                    </div>

                    {/* Tab 1: Weekly Lectures */}
                    {subjectSubTab === 'lectures' && (
                      visibleLectures.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200 p-6">
                          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="font-bold text-slate-600">لم يتم إتاحة محاضرات لهذه المادة حتى الآن.</p>
                          <p className="text-[11px] text-slate-400 mt-1">سيقوم الخدام بفتح المحاضرات ومذكراتها وملفاتها تباعاً.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {visibleLectures.map((lec) => {
                            const visibleFilesCount = (lec.files || []).filter(
                              f => f.isPublishedForStudents !== false && f.targetAudience !== 'servants'
                            ).length;
                            const isCombined = lec.type === 'combined' || (Array.isArray(lec.subLectures) && lec.subLectures.length > 1);

                            if (isCombined) {
                              /* COMBINED LECTURES CARD FOR STUDENTS */
                              return (
                                <div
                                  key={lec.id}
                                  onClick={() => setSelectedLecture(lec)}
                                  className="col-span-1 sm:col-span-2 bg-gradient-to-br from-amber-50/40 via-white to-slate-50 border-2 border-amber-300/80 hover:border-maroon-700 p-5 rounded-3xl cursor-pointer transition-all hover:shadow-lg group flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                      <span className="bg-amber-100 text-amber-950 border border-amber-300 font-black text-xs px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                                        <span>كارت مجمّع: محاضرات متصلة بمحتوى دراسي مشترك</span>
                                      </span>
                                      <span className="text-[11px] text-slate-400 font-bold">
                                        ({lec.subLectures.length} محاضرات متصلة)
                                      </span>
                                    </div>

                                    {/* SIDE-BY-SIDE SUB-LECTURES */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 my-3.5">
                                      {lec.subLectures.map((sub, sIdx) => (
                                        <div
                                          key={sub.id || sIdx}
                                          className="bg-white border border-slate-200 hover:border-maroon-400 p-3.5 rounded-2xl transition-all shadow-2xs text-right flex flex-col justify-between"
                                        >
                                          <div>
                                            <span className="font-black text-maroon-900 text-xs bg-maroon-50 border border-maroon-200/80 px-2.5 py-0.5 rounded-lg inline-block mb-1.5">
                                              {sub.number}
                                            </span>
                                            <h6 className="font-extrabold text-slate-900 text-xs line-clamp-1 mb-1">
                                              {sub.topic || 'بدون موضوع فرعي'}
                                            </h6>
                                            <div className="flex items-center gap-1 text-[11px] text-slate-600 mb-1">
                                              <User className="w-3 h-3 text-maroon-700 shrink-0" />
                                              <span className="truncate">المحاضر: <strong>{sub.lecturer || 'خادم المادة'}</strong></span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1 text-[10px] text-slate-400 pt-1 border-t border-slate-100 mt-1">
                                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span>{sub.date}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between text-xs font-bold text-amber-950 pt-3 border-t border-amber-200/60 mt-1">
                                    <span className="text-slate-500 text-[11px]">{visibleFilesCount} ملفات ومذكرات مشتركة للجميع</span>
                                    <div className="flex items-center gap-1 group-hover:-translate-x-1 transition-transform font-extrabold text-maroon-800">
                                      <span>فتح المحتوى الموحد للمحاضرات</span>
                                      <ChevronLeft className="w-4 h-4" />
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            /* SINGLE LECTURE CARD FOR STUDENTS */
                            return (
                              <div
                                key={lec.id}
                                onClick={() => setSelectedLecture(lec)}
                                className="bg-slate-50 border border-slate-200 hover:border-maroon-700 p-5 rounded-2xl cursor-pointer transition-all hover:shadow-md group flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div>
                                      <span className="font-black text-maroon-900 text-xs bg-maroon-50 border border-maroon-200/80 px-2.5 py-0.5 rounded-lg inline-block mb-1">
                                        {lec.number || lec.title}
                                      </span>
                                      {lec.topic && (
                                        <h5 className="font-extrabold text-slate-900 text-base group-hover:text-maroon-800 transition-colors leading-snug">
                                          {lec.topic}
                                        </h5>
                                      )}
                                    </div>
                                    <span className="text-[10px] bg-maroon-100 text-maroon-900 font-extrabold px-2.5 py-0.5 rounded-full shrink-0">
                                      {visibleFilesCount} ملفات
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600 mb-4">
                                    <span className="flex items-center gap-1 bg-white border border-slate-200/80 px-2 py-0.5 rounded-lg text-[11px]">
                                      <User className="w-3 h-3 text-maroon-800" />
                                      <span>المحاضر: <strong>{lec.lecturer || selectedSubject.teacher || 'خادم المادة'}</strong></span>
                                    </span>
                                    <span className="flex items-center gap-1 bg-white border border-slate-200/80 px-2 py-0.5 rounded-lg text-[11px] text-slate-500">
                                      <Calendar className="w-3 h-3 text-slate-400" />
                                      <span>{lec.date || 'اليوم'}</span>
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-xs font-bold text-maroon-800 pt-3 border-t border-slate-200/60">
                                  <span>فتح المحاضرة وتصفح المذكرات</span>
                                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )
                    )}

                    {/* Tab 2: Subject References & Textbooks */}
                    {subjectSubTab === 'references' && (
                      subjectReferences.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200 p-6">
                          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="font-bold text-slate-600">لا توجد مراجع أو كتب مرفوعة لهذه المادة حتى الآن.</p>
                          <p className="text-[11px] text-slate-400 mt-1">سيقوم الخدام بمشاركة مراجع ومذكرات المادة تباعاً.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {subjectReferences.map((mat) => {
                            const meta = getRefTypeMeta(mat.type);
                            const IconComp = meta.icon;
                            return (
                              <div
                                key={mat.id || mat.url || mat.title}
                                className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`p-2.5 rounded-xl shrink-0 border ${meta.color}`}>
                                    <IconComp className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h5 className="font-bold text-slate-900 text-sm">{mat.title}</h5>
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}>
                                        {meta.label}
                                      </span>
                                      {mat.lectureTitle && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                                          {mat.lectureTitle}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[11px] text-slate-400 mt-1 block">
                                      رفع بواسطة: <strong className="text-slate-600">{mat.uploadedBy || 'الخادم المسؤول'}</strong> • {mat.date || 'اليوم'}
                                      {mat.fileName ? ` • ${mat.fileName}` : ''}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                                  {mat.type === 'video' && mat.videoId && (
                                    <button
                                      type="button"
                                      onClick={() => setActivePreviewVideo(mat)}
                                      className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                    >
                                      <Video className="w-3.5 h-3.5" />
                                      <span>تشغيل الفيديو</span>
                                    </button>
                                  )}

                                  {mat.type !== 'video' && (mat.fileId || getDriveFileId(mat)) && (
                                    <button
                                      type="button"
                                      onClick={() => setActivePreviewPdf({ ...mat, fileId: mat.fileId || getDriveFileId(mat) })}
                                      className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>معاينة داخل المنصة</span>
                                    </button>
                                  )}

                                  {(mat.fileId || getDriveFileId(mat) || mat.url) && (
                                    <a
                                      href={
                                        (mat.fileId || getDriveFileId(mat))
                                          ? `https://drive.google.com/uc?export=download&id=${mat.fileId || getDriveFileId(mat)}`
                                          : mat.url
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span>تحميل</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            /* ========================================================================= */
            /* 2. LECTURE DETAIL & FILES VIEW FOR STUDENTS                               */
            /* ========================================================================= */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-bold mb-0.5">
                    <button
                      type="button"
                      onClick={() => setSelectedLecture(null)}
                      className="hover:text-maroon-800 underline cursor-pointer"
                    >
                      مادة {selectedSubject.name}
                    </button>
                    <span>/</span>
                    <span className="text-maroon-900 font-extrabold">{selectedLecture.title}</span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                    <FolderPlus className="w-5 h-5 text-maroon-800" />
                    <span>{selectedLecture.title}</span>
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                    <span>المحاضر: <strong className="text-slate-700">{selectedLecture.lecturer}</strong></span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{selectedLecture.date}</span>
                    </span>
                  </div>

                  {/* Sub-lectures chips if combined */}
                  {Array.isArray(selectedLecture.subLectures) && selectedLecture.subLectures.length > 1 && (
                    <div className="flex items-center gap-2 flex-wrap mt-2 pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-amber-900">المحاضرات المتصلة بالمحتوى:</span>
                      {selectedLecture.subLectures.map((sub, sIdx) => (
                        <span key={sub.id || sIdx} className="bg-amber-100/70 border border-amber-300 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                          {sub.number} ({sub.topic || sub.lecturer || sub.date})
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedLecture(null)}
                  className="text-xs font-bold text-maroon-800 hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 cursor-pointer transition-colors self-start sm:self-auto"
                >
                  ← العودة لمحاضرات المادة
                </button>
              </div>

              {(() => {
                const visibleReferences = (selectedLecture.files || []).filter(
                  mat => mat.isPublishedForStudents !== false && mat.targetAudience !== 'servants'
                );

                if (visibleReferences.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200 p-6">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-600">لم يتم إتاحة مذكرات أو ملفات لهذه المحاضرة بعد.</p>
                      <p className="text-[11px] text-slate-400 mt-1">سيقوم الخادم برفع الملفات قريباً.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {visibleReferences.map((mat) => {
                      const meta = getRefTypeMeta(mat.type);
                      const IconComp = meta.icon;
                      return (
                        <div
                          key={mat.id}
                          className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl shrink-0 border ${meta.color}`}>
                              <IconComp className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-slate-900 text-sm">{mat.title}</h5>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}>
                                  {meta.label}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 mt-1 block">
                                رفع بواسطة: <strong className="text-slate-600">{mat.uploadedBy || 'الخادم المسؤول'}</strong> • {mat.date || 'اليوم'}
                                {mat.fileName ? ` • ${mat.fileName}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                            {/* YouTube Video Player Trigger */}
                            {mat.type === 'video' && mat.videoId && (
                              <button
                                onClick={() => setActivePreviewVideo(mat)}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>تشغيل الفيديو</span>
                              </button>
                            )}

                            {/* In-App Preview Trigger for all documents / files */}
                            {mat.type !== 'video' && (mat.fileId || getDriveFileId(mat)) && (
                              <button
                                onClick={() => setActivePreviewPdf({ ...mat, fileId: mat.fileId || getDriveFileId(mat) })}
                                className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>معاينة داخل المنصة</span>
                              </button>
                            )}

                            {/* Direct Download Button */}
                            {(mat.fileId || getDriveFileId(mat) || mat.url) && (
                              <a
                                href={
                                  (mat.fileId || getDriveFileId(mat))
                                    ? `https://drive.google.com/uc?export=download&id=${mat.fileId || getDriveFileId(mat)}`
                                    : mat.url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>تحميل</span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Document In-App Preview Modal */}
      {activePreviewPdf && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <FileText className="w-5 h-5 text-maroon-800 shrink-0" />
                <span className="font-extrabold text-sm text-slate-900 truncate">{activePreviewPdf.title}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {(activePreviewPdf.fileId || getDriveFileId(activePreviewPdf)) && (
                  <a
                    href={`https://drive.google.com/uc?export=download&id=${activePreviewPdf.fileId || getDriveFileId(activePreviewPdf)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-maroon-800 hover:bg-maroon-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل الملف</span>
                  </a>
                )}
                <button
                  onClick={() => setActivePreviewPdf(null)}
                  className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 w-full bg-slate-100">
              <iframe
                src={`https://drive.google.com/file/d/${activePreviewPdf.fileId || getDriveFileId(activePreviewPdf)}/preview`}
                className="w-full h-full border-none"
                title={activePreviewPdf.title}
                allow="autoplay"
              />
            </div>
          </div>
        </div>
      )}

      {/* YouTube Video In-App Modal */}
      {activePreviewVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-800">
            <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-red-500" />
                <span className="font-extrabold text-sm">{activePreviewVideo.title}</span>
              </div>
              <button
                onClick={() => setActivePreviewVideo(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video w-full">
              <iframe
                src={`https://www.youtube.com/embed/${activePreviewVideo.videoId}?autoplay=1`}
                className="w-full h-full"
                title={activePreviewVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
