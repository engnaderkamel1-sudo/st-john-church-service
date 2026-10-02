import React, { useState } from 'react';
import { 
  BookOpen, ShieldCheck, Plus, Trash2, ChevronLeft, UploadCloud, 
  FileText, Music, Video, Check, ExternalLink, Eye, EyeOff,
  FileSpreadsheet, File, Image as ImageIcon, Sparkles, Presentation
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import ServantAiStudioModal from './ServantAiStudioModal';
import AiPresentationViewer from './AiPresentationViewer';

export default function ServantCurriculum({
  user,
  selectedGrade,
  getGradeTitle,
  curriculumTarget,
  setCurriculumTarget,
  activeSubject,
  setActiveSubject,
  subjectsByGrade,
  setSubjectsByGrade
}) {
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectTeacher, setNewSubjectTeacher] = useState('');
  const [showAddRefModal, setShowAddRefModal] = useState(false);
  const [newRefTitle, setNewRefTitle] = useState('');
  const [newRefType, setNewRefType] = useState('pdf');
  const [newRefUrl, setNewRefUrl] = useState('');
  const [refSaving, setRefSaving] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [showAiStudioModal, setShowAiStudioModal] = useState(false);
  const [aiStudioMode, setAiStudioMode] = useState('presentation'); // 'presentation' | 'study_guide'
  const [activePresentation, setActivePresentation] = useState(null);
  const [targetRefForAi, setTargetRefForAi] = useState(null);

  const allCurrentGradeSubjects = subjectsByGrade[selectedGrade] || [];
  const currentGradeSubjects = allCurrentGradeSubjects.filter(
    sub => (sub.targetAudience || 'students') === curriculumTarget
  );

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

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    try {
      await addDoc(collection(db, 'service_curriculum'), {
        grade: selectedGrade,
        name: newSubjectName.trim(),
        teacher: newSubjectTeacher.trim() || user.fullName || 'خادم المادة',
        targetAudience: curriculumTarget,
        references: [],
        createdAt: serverTimestamp()
      });

      setNewSubjectName('');
      setNewSubjectTeacher('');
      setShowAddSubjectModal(false);
    } catch (err) {
      console.error('Error adding subject:', err);
      const newSub = {
        id: `sub-${Date.now()}`,
        grade: selectedGrade,
        name: newSubjectName.trim(),
        teacher: newSubjectTeacher.trim() || user.fullName || 'خادم المادة',
        targetAudience: curriculumTarget,
        references: []
      };
      setSubjectsByGrade(prev => ({
        ...prev,
        [selectedGrade]: [...(prev[selectedGrade] || []), newSub]
      }));
      setNewSubjectName('');
      setNewSubjectTeacher('');
      setShowAddSubjectModal(false);
    }
  };

  const handleDeleteSubject = async (subId, e) => {
    e?.stopPropagation();
    if (!window.confirm('هل أنت متأكد من حذف هذه المادة وجميع مراجعها؟')) return;
    try {
      await deleteDoc(doc(db, 'service_curriculum', subId));
      if (activeSubject?.id === subId) setActiveSubject(null);
    } catch (err) {
      console.error('Error deleting subject:', err);
      setSubjectsByGrade(prev => ({
        ...prev,
        [selectedGrade]: (prev[selectedGrade] || []).filter(s => s.id !== subId)
      }));
      if (activeSubject?.id === subId) setActiveSubject(null);
    }
  };

  const detectFileType = (file) => {
    if (!file) return 'file';
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx', 'rtf', 'txt', 'odt'].includes(ext)) return 'doc';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
    if (['ppt', 'pptx'].includes(ext)) return 'ppt';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'wma'].includes(ext) || file.type.startsWith('audio/')) return 'audio';
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext) || file.type.startsWith('video/')) return 'video';
    return 'file';
  };

  const parseResourceLink = (url, type) => {
    if (!url) return { url: '', fileId: null, videoId: null };
    const cleanUrl = url.trim();

    if (type !== 'video') {
      const driveMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      const fileId = driveMatch ? driveMatch[1] : null;
      return { url: cleanUrl, fileId, videoId: null };
    }

    if (type === 'video') {
      const ytMatch = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
      const videoId = ytMatch ? ytMatch[1] : null;
      return { url: cleanUrl, fileId: null, videoId };
    }

    return { url: cleanUrl, fileId: null, videoId: null };
  };

  const handleAddReference = async (e) => {
    e.preventDefault();
    if (!newRefTitle.trim() || !activeSubject) return;

    setRefSaving(true);
    let finalUrl = newRefUrl.trim();
    let finalFileId = null;

    try {
      if (newRefType !== 'video' && selectedUploadFile) {
        setUploadStatusText('جاري تجهيز الملف للرفع...');
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            const base64 = typeof result === 'string' && result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedUploadFile);
        });

        setUploadStatusText('جاري الرفع السحابي إلى Google Drive...');
        const driveEndpoint = 'https://script.google.com/macros/s/AKfycbxhdl_hk5vB7NLLL7zdPmVXlwvAOiZYVLsrk5T73UdJpJJM9JpU74p0DexpSch7gI4I/exec';
        const response = await fetch(driveEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            fileName: selectedUploadFile.name,
            mimeType: selectedUploadFile.type || 'application/octet-stream',
            base64Data: base64Data,
            base64: base64Data
          })
        });

        const resData = await response.json();
        if (resData.status === 'success') {
          finalUrl = resData.fileUrl || resData.url || resData.downloadUrl;
          finalFileId = resData.fileId;
        } else {
          throw new Error(resData.message || 'تعذر استكمال الرفع إلى Google Drive');
        }
      }
    } catch (uploadErr) {
      console.error('Drive upload error:', uploadErr);
      if (!finalUrl) {
        alert('تنبيه: حدث خطأ أثناء رفع الملف إلى Google Drive: ' + (uploadErr.message || 'يرجى مراجعة صلاحيات السكربت أو تجربة رابط مباشر.'));
        setRefSaving(false);
        setUploadStatusText('');
        return;
      }
    }

    setUploadStatusText('جاري حفظ بيانات المحتوى في المادة...');
    const detectedType = selectedUploadFile ? detectFileType(selectedUploadFile) : newRefType;
    const parsed = parseResourceLink(finalUrl, detectedType);

    const newRef = {
      id: `rf-${Date.now()}`,
      title: newRefTitle.trim(),
      type: detectedType,
      fileType: detectedType,
      fileName: selectedUploadFile?.name || '',
      url: finalUrl,
      fileId: finalFileId || parsed.fileId,
      videoId: parsed.videoId,
      date: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }),
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      uploadedBy: user.fullName || user.phone || 'الخادم المسؤول',
      uploadedByRole: user.role || 'servant',
      targetAudience: curriculumTarget,
      isPublishedForStudents: true
    };

    const updatedRefs = [newRef, ...(activeSubject.references || [])];

    try {
      await updateDoc(doc(db, 'service_curriculum', activeSubject.id), {
        references: updatedRefs
      });
      setActiveSubject({ ...activeSubject, references: updatedRefs });
    } catch (err) {
      console.error('Error adding reference:', err);
      setActiveSubject({ ...activeSubject, references: updatedRefs });
      setSubjectsByGrade(prev => {
        const currentList = prev[selectedGrade] || [];
        const updatedList = currentList.map(s => s.id === activeSubject.id ? { ...s, references: updatedRefs } : s);
        return { ...prev, [selectedGrade]: updatedList };
      });
    } finally {
      setRefSaving(false);
      setUploadStatusText('');
      setNewRefTitle('');
      setNewRefUrl('');
      setSelectedUploadFile(null);
      setShowAddRefModal(false);
    }
  };

  const handleToggleRefVisibility = async (refId) => {
    if (!activeSubject) return;
    const currentRefs = activeSubject.references || [];
    const targetRef = currentRefs.find(r => r.id === refId);
    if (!targetRef) return;

    const newStatus = targetRef.isPublishedForStudents === false ? true : false;
    const updatedRefs = currentRefs.map(r => 
      r.id === refId ? { ...r, isPublishedForStudents: newStatus } : r
    );

    try {
      await updateDoc(doc(db, 'service_curriculum', activeSubject.id), {
        references: updatedRefs
      });
      setActiveSubject({ ...activeSubject, references: updatedRefs });
    } catch (err) {
      console.error('Error toggling reference visibility:', err);
      setActiveSubject({ ...activeSubject, references: updatedRefs });
    }
  };

  const handleDeleteReference = async (refId) => {
    if (!activeSubject) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا المرجع؟')) return;

    const updatedRefs = (activeSubject.references || []).filter(r => r.id !== refId);
    try {
      await updateDoc(doc(db, 'service_curriculum', activeSubject.id), {
        references: updatedRefs
      });
      setActiveSubject({ ...activeSubject, references: updatedRefs });
    } catch (err) {
      console.error('Error deleting reference:', err);
      setActiveSubject({ ...activeSubject, references: updatedRefs });
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
      {/* Audience Switcher Tabs: Students vs Servants */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setCurriculumTarget('students'); setActiveSubject(null); }}
            className={`text-xs px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              curriculumTarget === 'students'
                ? 'bg-maroon-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>مناهج ومراجع المخدومين</span>
          </button>

          <button
            type="button"
            onClick={() => { setCurriculumTarget('servants'); setActiveSubject(null); }}
            className={`text-xs px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              curriculumTarget === 'servants'
                ? 'bg-maroon-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-gold-300" />
            <span>مناهج ومراجع الخدام 🔒 (خاص)</span>
          </button>
        </div>

        <div className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
          المرحلة المحددة: <strong className="text-maroon-900">{getGradeTitle(selectedGrade)}</strong>
        </div>
      </div>

      {/* Audience Context Notice */}
      <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 border font-medium ${
        curriculumTarget === 'servants'
          ? 'bg-amber-50/70 border-amber-200 text-amber-900'
          : 'bg-slate-50 border-slate-200 text-slate-700'
      }`}>
        {curriculumTarget === 'servants' ? (
          <>
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
            <span>قسم مخصص للخدام فقط: لرفع مراجع التحضير والتأملات والتوجيهات الرعوية الخاصة بالخدمة (مخفية تماماً عن المخدومين).</span>
          </>
        ) : (
          <>
            <BookOpen className="w-4 h-4 text-maroon-800 shrink-0" />
            <span>مناهج ومحاضرات المخدومين: يتم بثها للطلبة، مع إمكانية إتاحة أو إخفاء أي محاضرة بزر واحد في أي وقت.</span>
          </>
        )}
      </div>

      {!activeSubject ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {curriculumTarget === 'students' ? 'مواد ومناهج المخدومين' : 'مواد ومراجع الخدام'}: {getGradeTitle(selectedGrade)}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                إدارة المواد ورفع الملفات (PDF، Word، Excel، صور، تسجيلات) إلى Google Drive مباشرة.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAiStudioMode('presentation');
                  setShowAiStudioModal(true);
                }}
                className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold text-xs py-2 px-3.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                title="توليد عرض تقديمي للشرائح Data Show من كتاب أو مذكرة الدرس بالذكاء الاصطناعي"
              >
                <Presentation className="w-4 h-4 text-gold-300" />
                <span>إنشاء Presentation (Data Show) 📽️</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAiStudioMode('study_guide');
                  setShowAiStudioModal(true);
                }}
                className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs py-2 px-3.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                title="توليد ملخص ودليل دراسي كنسي شامل للدرس مع الشواهد والأسئلة"
              >
                <Sparkles className="w-4 h-4 text-purple-200" />
                <span>توليد ملخص الدرس كنسياً 📖</span>
              </button>

              <button
                onClick={() => setShowAddSubjectModal(true)}
                className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مادة جديدة</span>
              </button>
            </div>
          </div>

          {showAddSubjectModal && (
            <form onSubmit={handleAddSubject} className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl space-y-3">
              <h4 className="font-extrabold text-xs text-maroon-900">
                إضافة مادة جديدة ({curriculumTarget === 'students' ? 'للمخدومين' : 'للخدام فقط'}) - {getGradeTitle(selectedGrade)}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم المادة</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: طقوس الكنيسة، تاريخ كنيسة، عقيدة، إعداد درس"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">خادم المادة المسئول</label>
                  <input
                    type="text"
                    placeholder="اسم الخادم (اختياري)"
                    value={newSubjectTeacher}
                    onChange={(e) => setNewSubjectTeacher(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddSubjectModal(false)} className="bg-white border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-xl font-bold">
                  إلغاء
                </button>
                <button type="submit" className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl">
                  حفظ المادة
                </button>
              </div>
            </form>
          )}

          {currentGradeSubjects.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">لا توجد مواد مضافة في هذا القسم لهذه المرحلة بعد.</p>
              <p className="text-[11px] text-slate-400 mt-1">اضغط على زر "إضافة مادة جديدة" للبدء في إضافة المواد ورفع المذكرات والمحاضرات.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentGradeSubjects.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => setActiveSubject(sub)}
                  className="bg-slate-50 border border-slate-200 hover:border-maroon-700 p-5 rounded-2xl cursor-pointer transition-all hover:shadow-md group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] bg-maroon-100 text-maroon-900 font-extrabold px-2.5 py-0.5 rounded-full">
                        {sub.teacher}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400 font-bold">{(sub.references || []).length} مراجع</span>
                        <button
                          onClick={(e) => handleDeleteSubject(sub.id, e)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                          title="حذف المادة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-base group-hover:text-maroon-800 transition-colors mb-1">{sub.name}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">اضغط للدخول وإدارة المذكرات والملفات والتسجيلات وفتح المحاضرات للمخدومين.</p>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-maroon-800 pt-3 border-t border-slate-200/60">
                    <span>إدارة مراجع ومحاضرات المادة ({(sub.references || []).length})</span>
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs text-slate-400 font-bold">
                المادة الحالية ({curriculumTarget === 'students' ? 'مناهج المخدومين' : 'مناهج الخدام 🔒'})
              </span>
              <h4 className="font-extrabold text-slate-900 text-lg">{activeSubject.name}</h4>
              <span className="text-xs text-maroon-800 font-semibold">المسئول: {activeSubject.teacher}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTargetRefForAi({
                    title: `منهج ومحاضرات مادة: ${activeSubject.name}`,
                    type: 'مادة تعليمية',
                    url: (activeSubject.references && activeSubject.references.length > 0) ? activeSubject.references[0].url : ''
                  });
                  setAiStudioMode('presentation');
                  setShowAiStudioModal(true);
                }}
                className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold text-xs py-2 px-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                title="توليد عرض تقديمي للشرائح Data Show لهذه المادة بالذكاء الاصطناعي"
              >
                <Presentation className="w-4 h-4 text-gold-300" />
                <span>Presentation 📽️</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetRefForAi({
                    title: `منهج ومحاضرات مادة: ${activeSubject.name}`,
                    type: 'مادة تعليمية',
                    url: (activeSubject.references && activeSubject.references.length > 0) ? activeSubject.references[0].url : ''
                  });
                  setAiStudioMode('study_guide');
                  setShowAiStudioModal(true);
                }}
                className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs py-2 px-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                title="توليد ملخص ودليل دراسي كنسي شامل لهذه المادة"
              >
                <Sparkles className="w-4 h-4 text-purple-200" />
                <span>ملخص المادة 📖</span>
              </button>

              <button
                onClick={() => setShowAddRefModal(true)}
                className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                <UploadCloud className="w-4 h-4" />
                <span>إضافة محتوى / ملف</span>
              </button>
              <button
                onClick={() => setActiveSubject(null)}
                className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200"
              >
                ← العودة لقائمة المواد
              </button>
            </div>
          </div>

          {showAddRefModal && (
            <form onSubmit={handleAddReference} className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl space-y-3.5">
              <h5 className="font-extrabold text-xs text-slate-800">
                إضافة محتوى تعليمي لمادة ({activeSubject.name}) - {curriculumTarget === 'students' ? 'للمخدومين' : 'للخدام فقط'}
              </h5>
              
              {/* Type Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع المحتوى</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRefType('file')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      newRefType === 'file' || newRefType === 'pdf' ? 'bg-maroon-800 text-white border-maroon-800 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>ملف (PDF، Word، Excel، صور)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRefType('audio')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      newRefType === 'audio' ? 'bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>تسجيل صوتي</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRefType('video')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      newRefType === 'video' ? 'bg-red-700 text-white border-red-700 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>فيديو يوتيوب</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان المحتوى / المرجع</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مذكرة شرح المحاضرة الأولى + أسئلة تطبيقية"
                  value={newRefTitle}
                  onChange={(e) => setNewRefTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800"
                />
              </div>

              {newRefType !== 'video' ? (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700">
                    اختر أي ملف من جهازك (PDF، Word، Excel، PowerPoint، صور، صوتيات):
                  </label>
                  <div className="border-2 border-dashed border-maroon-200 hover:border-maroon-600 bg-white p-4 rounded-2xl text-center cursor-pointer transition-colors relative">
                    <input
                      type="file"
                      accept="*/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedUploadFile(e.target.files[0]);
                          if (!newRefTitle.trim()) {
                            setNewRefTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                          }
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <UploadCloud className="w-7 h-7 text-maroon-700 mx-auto mb-1" />
                    {selectedUploadFile ? (
                      <div className="text-xs font-bold text-emerald-700">
                        تم اختيار: {selectedUploadFile.name} ({(selectedUploadFile.size / 1024 / 1024).toFixed(2)} MB) ✓
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">اضغط هنا لاختيار الملف من الموبايل أو الكمبيوتر</span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">سيقوم التطبيق برفعه مباشرة إلى Google Drive الخاص بالخدمة تلقائياً</span>
                      </div>
                    )}
                  </div>

                  <details className="text-[11px] text-slate-500 pt-1">
                    <summary className="cursor-pointer hover:text-maroon-800 font-bold">أو وضع رابط مباشر بدلاً من الرفع (اختياري)</summary>
                    <input
                      type="text"
                      placeholder="https://drive.google.com/file/d/.../view"
                      value={newRefUrl}
                      onChange={(e) => setNewRefUrl(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs mt-1.5 focus:outline-none focus:border-maroon-800"
                    />
                  </details>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    رابط فيديو يوتيوب (YouTube Link or ID)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="https://www.youtube.com/watch?v=... أو https://youtu.be/..."
                    value={newRefUrl}
                    onChange={(e) => setNewRefUrl(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setShowAddRefModal(false)} className="bg-white border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-xl font-bold">
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  disabled={refSaving || (newRefType !== 'video' && !selectedUploadFile && !newRefUrl.trim())}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2 rounded-xl flex items-center gap-1.5 disabled:opacity-50 shadow-xs transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{refSaving ? (uploadStatusText || 'جاري الرفع...') : 'تأكيد حفظ ورفع المحتوى'}</span>
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {(!activeSubject.references || activeSubject.references.length === 0) ? (
              <div className="text-center py-10 text-slate-400 text-xs">لم يتم إضافة مراجع أو محتوى لهذه المادة بعد.</div>
            ) : (
              activeSubject.references.map((rf) => {
                const meta = getRefTypeMeta(rf.type);
                const IconComp = meta.icon;
                return (
                  <div key={rf.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 border ${meta.color}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-extrabold text-slate-900 text-sm">{rf.title}</h5>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}>
                            {meta.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap">
                          <span>رفع بواسطة: <strong className="text-slate-600">{rf.uploadedBy || 'الخادم المسؤول'}</strong></span>
                          <span>•</span>
                          <span>{rf.date || 'اليوم'} {rf.time ? `(${rf.time})` : ''}</span>
                          {rf.fileName && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[10px] text-slate-500">{rf.fileName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {rf.url && (
                        <a
                          href={rf.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>فتح</span>
                        </a>
                      )}

                      {/* Direct AI Presentation from this file */}
                      <button
                        type="button"
                        onClick={() => {
                          setTargetRefForAi(rf);
                          setAiStudioMode('presentation');
                          setShowAiStudioModal(true);
                        }}
                        className="bg-amber-100/70 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1 transition-all"
                        title="إنشاء عرض تقديمي (Presentation Data Show) من هذا الملف مباشرة"
                      >
                        <Presentation className="w-3 h-3 text-amber-700" />
                        <span>Presentation 📽️</span>
                      </button>

                      {/* Direct AI Summary from this file */}
                      <button
                        type="button"
                        onClick={() => {
                          setTargetRefForAi(rf);
                          setAiStudioMode('study_guide');
                          setShowAiStudioModal(true);
                        }}
                        className="bg-purple-100/70 hover:bg-purple-200 text-purple-900 border border-purple-300 font-bold px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1 transition-all"
                        title="توليد ملخص ودليل دراسي كنسي من هذا الملف مباشرة"
                      >
                        <Sparkles className="w-3 h-3 text-purple-700" />
                        <span>ملخص 📖</span>
                      </button>

                      {/* Toggle Visibility for Students */}
                      {curriculumTarget === 'students' ? (
                        <button
                          type="button"
                          onClick={() => handleToggleRefVisibility(rf.id)}
                          className={`font-bold px-3 py-1 rounded-lg text-[10px] flex items-center gap-1.5 transition-all shadow-2xs ${
                            rf.isPublishedForStudents !== false
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                          }`}
                          title="اضغط لتفعيل أو إخفاء المحتوى عن المخدومين"
                        >
                          {rf.isPublishedForStudents !== false ? (
                            <>
                              <Eye className="w-3 h-3 text-emerald-600" />
                              <span>متاح للمخدومين 👁️ (انقر للإخفاء)</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 text-amber-600" />
                              <span>مخفي عن المخدومين 🔒 (انقر للإتاحة)</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 border border-slate-200 font-bold px-2.5 py-1 rounded-lg text-[10px]">
                          خاص بالخدام 🔒
                        </span>
                      )}

                      <button
                        onClick={() => handleDeleteReference(rf.id)}
                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="حذف هذا المرجع"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Presentation Fullscreen / Data Show Viewer Modal */}
      {activePresentation && (
        <AiPresentationViewer
          presentation={activePresentation}
          onClose={() => setActivePresentation(null)}
        />
      )}

      {/* AI Studio Modal for Presentations & Study Guides */}
      <ServantAiStudioModal
        isOpen={showAiStudioModal}
        onClose={() => {
          setShowAiStudioModal(false);
          setTargetRefForAi(null);
        }}
        initialGrade={selectedGrade}
        initialMode={aiStudioMode}
        targetReference={targetRefForAi}
        initialText=""
        onOpenPresentation={(pres) => {
          setActivePresentation(pres);
          setShowAiStudioModal(false);
          setTargetRefForAi(null);
        }}
        onAddQuestionsToBank={() => {
          setShowAiStudioModal(false);
          setTargetRefForAi(null);
        }}
      />
    </div>
  );
}
