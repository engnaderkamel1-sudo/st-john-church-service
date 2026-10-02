import React from 'react';
import { BookOpen, ChevronLeft, ExternalLink, Download, FileText, Video, X, FileSpreadsheet, Music, Image as ImageIcon, File } from 'lucide-react';

export default function StudentCurriculum({
  user,
  getGradeTitle,
  subjectsData,
  selectedSubject,
  setSelectedSubject,
  activePreviewPdf,
  setActivePreviewPdf,
  activePreviewVideo,
  setActivePreviewVideo
}) {
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
          المنهج والمواد الدراسية ({getGradeTitle(user.grade)})
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
            {subjectsData.map((sub) => (
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
                    <span className="text-xs text-slate-400 font-bold">{(sub.references || []).length} مراجع</span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-base group-hover:text-maroon-800 transition-colors mb-1">
                    {sub.name}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    اضغط لفتح المذكرات وملفات الشرح والمحاضرات المسجلة.
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-maroon-800 pt-3 border-t border-slate-200/60">
                  <span>فتح محتوى المادة</span>
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h4 className="font-extrabold text-slate-900 text-base">{selectedSubject.name}</h4>
              <span className="text-xs text-slate-500">مسئول المادة: {selectedSubject.teacher || 'خادم المادة'}</span>
            </div>
            <button
              onClick={() => setSelectedSubject(null)}
              className="text-xs font-bold text-maroon-800 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200"
            >
              ← العودة لكل المواد
            </button>
          </div>

          {(() => {
            const visibleReferences = (selectedSubject.references || []).filter(
              mat => mat.isPublishedForStudents !== false && mat.targetAudience !== 'servants'
            );

            if (visibleReferences.length === 0) {
              return (
                <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                  لم يتم إتاحة مراجع أو محاضرات لهذه المادة بعد (سيقوم الخادم بفتح المحاضرات تباعاً).
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

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {/* YouTube Video Player Trigger */}
                        {mat.type === 'video' && mat.videoId && (
                          <button
                            onClick={() => setActivePreviewVideo(mat)}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>تشغيل الفيديو</span>
                          </button>
                        )}

                        {/* PDF In-App Preview Trigger */}
                        {mat.type === 'pdf' && mat.url && (
                          <button
                            onClick={() => setActivePreviewPdf(mat)}
                            className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>معاينة داخل المنصة</span>
                          </button>
                        )}

                        {/* External Drive Link */}
                        {mat.url && (
                          <a
                            href={mat.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>معاينة درايف</span>
                          </a>
                        )}

                        {/* Direct Download Button */}
                        {mat.url && (
                          <a
                            href={
                              mat.fileId 
                                ? `https://drive.google.com/uc?export=download&id=${mat.fileId}`
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

      {/* PDF In-App Preview Modal */}
      {activePreviewPdf && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-maroon-800" />
                <span className="font-extrabold text-sm text-slate-900">{activePreviewPdf.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {activePreviewPdf.fileId && (
                  <a
                    href={`https://drive.google.com/uc?export=download&id=${activePreviewPdf.fileId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-maroon-800 hover:bg-maroon-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل الملف</span>
                  </a>
                )}
                <button
                  onClick={() => setActivePreviewPdf(null)}
                  className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 w-full bg-slate-100">
              <iframe
                src={`https://drive.google.com/file/d/${activePreviewPdf.fileId}/preview`}
                className="w-full h-full border-none"
                title={activePreviewPdf.title}
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
