import React, { useState, useEffect } from 'react';
import { 
  BookOpen, ShieldCheck, Plus, Trash2, ChevronLeft, UploadCloud, 
  FileText, Music, Video, Check, ExternalLink, Eye, EyeOff,
  FileSpreadsheet, File, Image as ImageIcon, Sparkles, Presentation,
  Calendar, User, FolderPlus, Pencil, X
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import ServantAiStudioModal from './ServantAiStudioModal';
import AiPresentationViewer from './AiPresentationViewer';

export const normalizeLectures = (subject) => {
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

export const LECTURE_NUMBERS = [
  'المحاضرة الأولى',
  'المحاضرة الثانية',
  'المحاضرة الثالثة',
  'المحاضرة الرابعة',
  'المحاضرة الخامسة',
  'المحاضرة السادسة',
  'المحاضرة السابعة',
  'المحاضرة الثامنة',
  'المحاضرة التاسعة',
  'المحاضرة العاشرة',
  'المحاضرة الحادية عشرة',
  'المحاضرة الثانية عشرة',
  'المحاضرة الثالثة عشرة',
  'المحاضرة الرابعة عشرة',
  'المحاضرة الخامسة عشرة',
  'المحاضرة السادسة عشرة',
  'المحاضرة السابعة عشرة',
  'المحاضرة الثامنة عشرة',
  'المحاضرة التاسعة عشرة',
  'المحاضرة العشرون',
  'المحاضرة الحادية والعشرون',
  'المحاضرة الثانية والعشرون',
  'المحاضرة الثالثة والعشرون',
  'المحاضرة الرابعة والعشرون',
  'المحاضرة الخامسة والعشرون',
  'المحاضرة السادسة والعشرون',
  'المحاضرة السابعة والعشرون',
  'المحاضرة الثامنة والعشرون',
  'المحاضرة التاسعة والعشرون',
  'المحاضرة الثلاثون'
];

export default function ServantCurriculum({
  user,
  isAppAdmin = false,
  selectedGrade,
  setSelectedGrade,
  getGradeTitle,
  curriculumTarget,
  setCurriculumTarget,
  activeSubject,
  setActiveSubject,
  subjectsByGrade,
  setSubjectsByGrade,
  activeAcademicCycle = 'cycle_1',
  academicYear = '2026-2027',
  handleUpdateAcademicCycle
}) {
  const canManageCycle = isAppAdmin || user?.role === 'admin' || user?.role === 'servant_leader' || user?.phone === '01275571569';
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectTeacher, setNewSubjectTeacher] = useState('');
  
  // Edit Subject states
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editSubjectTeacher, setEditSubjectTeacher] = useState('');

  // Lecture-level states
  const [activeLecture, setActiveLecture] = useState(null);
  const [showAddLectureModal, setShowAddLectureModal] = useState(false);
  const [showEditLectureModal, setShowEditLectureModal] = useState(false);
  const [editingLecture, setEditingLecture] = useState(null);
  const [editLectureType, setEditLectureType] = useState('single');
  const [editLectureNumber, setEditLectureNumber] = useState('');
  const [editLectureTopic, setEditLectureTopic] = useState('');
  const [editLectureDate, setEditLectureDate] = useState('');
  const [editLectureLecturer, setEditLectureLecturer] = useState('');
  const [editSubLecturesList, setEditSubLecturesList] = useState([]);
  const [lectureEntryMode, setLectureEntryMode] = useState('single'); // 'single' | 'combined'
  
  // Single Lecture fields
  const [singleLectureNumber, setSingleLectureNumber] = useState('المحاضرة الأولى');
  const [singleLectureTopic, setSingleLectureTopic] = useState('');
  const [singleLectureDate, setSingleLectureDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [singleLectureLecturer, setSingleLectureLecturer] = useState('');

  // Combined Lectures list fields
  const [subLecturesList, setSubLecturesList] = useState([
    { id: 'sub-1', number: 'المحاضرة الأولى', topic: '', lecturer: '', date: new Date().toISOString().split('T')[0] },
    { id: 'sub-2', number: 'المحاضرة الثانية', topic: '', lecturer: '', date: new Date().toISOString().split('T')[0] }
  ]);

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
  const [loadingRefAiId, setLoadingRefAiId] = useState(null);
  const [loadedAiFile, setLoadedAiFile] = useState(null);
  const [autoGenerateAiAfterUpload, setAutoGenerateAiAfterUpload] = useState(false);
  const [isEditingYear, setIsEditingYear] = useState(false);
  const [inputYear, setInputYear] = useState(academicYear);

  // Edit Reference states
  const [showEditRefModal, setShowEditRefModal] = useState(false);
  const [editingRef, setEditingRef] = useState(null);
  const [editRefTitle, setEditRefTitle] = useState('');
  const [editRefUrl, setEditRefUrl] = useState('');
  const [editRefType, setEditRefType] = useState('pdf');
  const [editRefSaving, setEditRefSaving] = useState(false);

  // Sync activeLecture whenever activeSubject changes
  useEffect(() => {
    if (!activeSubject) {
      setActiveLecture(null);
    } else if (activeLecture) {
      const currentLecs = normalizeLectures(activeSubject);
      const updated = currentLecs.find(l => l.id === activeLecture.id);
      if (updated) {
        setActiveLecture(updated);
      }
    }
  }, [activeSubject]);

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

  const handleOpenEditSubject = (subject, e) => {
    if (e) e.stopPropagation();
    setEditingSubject(subject);
    setEditSubjectName(subject.name || '');
    setEditSubjectTeacher(subject.teacher || '');
    setShowEditSubjectModal(true);
  };

  const handleSaveEditSubject = async (e) => {
    e.preventDefault();
    if (!editingSubject || !editSubjectName.trim()) return;

    const updatedName = editSubjectName.trim();
    const updatedTeacher = editSubjectTeacher.trim() || user?.fullName || 'خادم المادة';

    try {
      await updateDoc(doc(db, 'service_curriculum', editingSubject.id), {
        name: updatedName,
        teacher: updatedTeacher
      });

      const updatedObj = { ...editingSubject, name: updatedName, teacher: updatedTeacher };
      if (activeSubject?.id === editingSubject.id) {
        setActiveSubject(prev => ({ ...prev, name: updatedName, teacher: updatedTeacher }));
      }
      setSubjectsByGrade(prev => {
        const currentList = prev[selectedGrade] || [];
        const updatedList = currentList.map(s => s.id === editingSubject.id ? { ...s, name: updatedName, teacher: updatedTeacher } : s);
        return { ...prev, [selectedGrade]: updatedList };
      });
      setShowEditSubjectModal(false);
    } catch (err) {
      console.error('Error updating subject:', err);
      alert('حدث خطأ أثناء تعديل بيانات المادة: ' + err.message);
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
    let uploadedBase64 = null;
    let uploadedFileMeta = null;

    if (selectedUploadFile) {
      uploadedFileMeta = {
        name: selectedUploadFile.name,
        size: selectedUploadFile.size,
        type: selectedUploadFile.type || 'application/pdf'
      };
    }

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
        uploadedBase64 = base64Data;

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

    const currentLecs = normalizeLectures(activeSubject);
    let targetLecId = activeLecture?.id;
    if (!targetLecId && currentLecs.length > 0) {
      targetLecId = currentLecs[0].id;
    }

    let updatedLectures = [];
    if (currentLecs.length === 0) {
      const defaultLec = {
        id: `lec-${Date.now()}`,
        title: 'المحاضرة الأولى',
        date: new Date().toISOString().split('T')[0],
        lecturer: activeSubject.teacher || user.fullName || 'خادم المادة',
        isPublishedForStudents: true,
        createdAt: new Date().toISOString(),
        files: [newRef]
      };
      updatedLectures = [defaultLec];
      setActiveLecture(defaultLec);
    } else {
      updatedLectures = currentLecs.map(lec => {
        if (lec.id === targetLecId) {
          return {
            ...lec,
            files: [newRef, ...(lec.files || [])]
          };
        }
        return lec;
      });
      const cur = updatedLectures.find(l => l.id === targetLecId);
      if (cur) setActiveLecture(cur);
    }

    const allFlattenedRefs = updatedLectures.flatMap(l => l.files || []);

    try {
      await updateDoc(doc(db, 'service_curriculum', activeSubject.id), {
        lectures: updatedLectures,
        references: allFlattenedRefs
      });
      const updatedSubject = { ...activeSubject, lectures: updatedLectures, references: allFlattenedRefs };
      setActiveSubject(updatedSubject);
      setSubjectsByGrade(prev => {
        const currentList = prev[selectedGrade] || [];
        const updatedList = currentList.map(s => s.id === activeSubject.id ? updatedSubject : s);
        return { ...prev, [selectedGrade]: updatedList };
      });

      if (autoGenerateAiAfterUpload && uploadedBase64) {
        setTargetRefForAi(newRef);
        setAiStudioMode('study_guide');
        setLoadedAiFile({
          base64: uploadedBase64,
          mimeType: uploadedFileMeta?.type || 'application/pdf',
          fileName: uploadedFileMeta?.name || newRef.title,
          fileSize: uploadedFileMeta?.size || 0
        });
        setShowAiStudioModal(true);
      }
    } catch (err) {
      console.error('Error adding reference:', err);
      const updatedSubject = { ...activeSubject, lectures: updatedLectures, references: allFlattenedRefs };
      setActiveSubject(updatedSubject);
      setSubjectsByGrade(prev => {
        const currentList = prev[selectedGrade] || [];
        const updatedList = currentList.map(s => s.id === activeSubject.id ? updatedSubject : s);
        return { ...prev, [selectedGrade]: updatedList };
      });
    } finally {
      setRefSaving(false);
      setUploadStatusText('');
      setNewRefTitle('');
      setNewRefUrl('');
      setSelectedUploadFile(null);
      setAutoGenerateAiAfterUpload(false);
      setShowAddRefModal(false);
    }
  };

  // Direct Cloud Background Downloader for AI Studio
  const handleOpenAiForRef = async (rf, mode) => {
    setTargetRefForAi(rf);
    setAiStudioMode(mode);
    setLoadedAiFile(null);

    // If it's a YouTube video, open AI Studio normally for notes/questions
    if (rf.type === 'video') {
      setShowAiStudioModal(true);
      return;
    }

    // Extract fileId from rf or rf.url
    let fileId = rf.fileId;
    if (!fileId && rf.url) {
      const match = rf.url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || rf.url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match) fileId = match[1];
    }

    if (!fileId) {
      setShowAiStudioModal(true);
      return;
    }

    setLoadingRefAiId(rf.id);

    try {
      // 1. Primary: Fetch via Google Apps Script (bypasses browser CORS & CORP restrictions completely)
      const scriptEndpoint = `https://script.google.com/macros/s/AKfycbxhdl_hk5vB7NLLL7zdPmVXlwvAOiZYVLsrk5T73UdJpJJM9JpU74p0DexpSch7gI4I/exec?action=getFile&fileId=${fileId}`;
      const scriptRes = await fetch(scriptEndpoint);
      if (scriptRes.ok) {
        const data = await scriptRes.json();
        if (data.status === 'success' && data.base64) {
          setLoadedAiFile({
            base64: data.base64,
            mimeType: data.mimeType || 'application/pdf',
            fileName: data.fileName || rf.fileName || rf.title || 'مستند الدرس',
            fileSize: data.base64 ? Math.round((data.base64.length * 3) / 4) : 0
          });
          setShowAiStudioModal(true);
          return;
        }
      }

      // 2. Secondary fallback: Direct fetch from Google Drive CDN
      const downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error('فشل جلب الملف من خوادم Google Drive');

      const blob = await res.blob();
      const mimeType = blob.type && blob.type !== 'application/octet-stream'
        ? blob.type
        : (rf.type === 'image' ? 'image/jpeg' : 'application/pdf');

      // Convert to Base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          resolve(typeof result === 'string' ? result.split(',')[1] : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      setLoadedAiFile({
        base64,
        mimeType,
        fileName: rf.fileName || rf.title || 'مستند الدرس',
        fileSize: blob.size
      });
      setShowAiStudioModal(true);
    } catch (fetchErr) {
      console.warn('Auto-fetch from Google Drive failed, opening with manual upload fallback:', fetchErr);
      setLoadedAiFile(null);
      setShowAiStudioModal(true);
    } finally {
      setLoadingRefAiId(null);
    }
  };

  const handleAddSubLecture = () => {
    const nextIdx = subLecturesList.length;
    const nextNumber = LECTURE_NUMBERS[nextIdx] || `المحاضرة ${nextIdx + 1}`;
    setSubLecturesList(prev => [
      ...prev,
      {
        id: `sub-${Date.now()}`,
        number: nextNumber,
        topic: '',
        lecturer: singleLectureLecturer || activeSubject?.teacher || user.fullName || '',
        date: new Date().toISOString().split('T')[0]
      }
    ]);
  };

  const handleRemoveSubLecture = (id) => {
    if (subLecturesList.length <= 2) {
      alert('يجب أن تحتوي المجموعة المجمعة على محاضرتين على الأقل.');
      return;
    }
    setSubLecturesList(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdateSubLecture = (id, field, value) => {
    setSubLecturesList(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleAddLecture = async (e) => {
    e.preventDefault();
    if (!activeSubject) return;

    let newLec = null;
    if (lectureEntryMode === 'single') {
      const title = singleLectureTopic.trim()
        ? `${singleLectureNumber}: ${singleLectureTopic.trim()}`
        : singleLectureNumber;

      newLec = {
        id: `lec-${Date.now()}`,
        type: 'single',
        number: singleLectureNumber,
        topic: singleLectureTopic.trim(),
        title: title,
        date: singleLectureDate || new Date().toISOString().split('T')[0],
        lecturer: singleLectureLecturer.trim() || activeSubject.teacher || user.fullName || 'خادم المادة',
        isPublishedForStudents: true,
        createdAt: new Date().toISOString(),
        files: []
      };
    } else {
      // Combined lectures
      const numbersList = subLecturesList.map(s => s.number);
      const combinedNumbers = numbersList.join(' • ');
      const combinedTopics = subLecturesList.map(s => s.topic).filter(Boolean).join(' • ');
      const combinedTitle = combinedTopics ? `${combinedNumbers} (${combinedTopics})` : combinedNumbers;
      const firstDate = subLecturesList[0]?.date || '';
      const lastDate = subLecturesList[subLecturesList.length - 1]?.date || '';
      const dateRange = (firstDate && lastDate && firstDate !== lastDate) ? `${firstDate} إلى ${lastDate}` : (firstDate || lastDate);
      const lecturers = Array.from(new Set(subLecturesList.map(s => s.lecturer).filter(Boolean))).join('، ') || activeSubject.teacher || user.fullName || 'خدام المادة';

      newLec = {
        id: `lec-${Date.now()}`,
        type: 'combined',
        number: combinedNumbers,
        title: combinedTitle,
        date: dateRange,
        lecturer: lecturers,
        subLectures: subLecturesList,
        isPublishedForStudents: true,
        createdAt: new Date().toISOString(),
        files: []
      };
    }

    const currentLecs = normalizeLectures(activeSubject);
    const updatedLectures = [...currentLecs, newLec];
    const allFlattenedRefs = updatedLectures.flatMap(l => l.files || []);

    try {
      await updateDoc(doc(db, 'service_curriculum', activeSubject.id), {
        lectures: updatedLectures,
        references: allFlattenedRefs
      });
      const updatedSubject = { ...activeSubject, lectures: updatedLectures, references: allFlattenedRefs };
      setActiveSubject(updatedSubject);
      setActiveLecture(newLec);
      setShowAddLectureModal(false);
      setSingleLectureTopic('');
      setSingleLectureLecturer('');
      setSubjectsByGrade(prev => {
        const currentList = prev[selectedGrade] || [];
        const updatedList = currentList.map(s => s.id === activeSubject.id ? updatedSubject : s);
        return { ...prev, [selectedGrade]: updatedList };
      });
    } catch (err) {
      console.error('Error adding lecture:', err);
      alert('حدث خطأ أثناء حفظ المحاضرة: ' + err.message);
    }
  };

  const handleToggleLectureVisibility = async (lectureId, e) => {
    if (e) e.stopPropagation();
    if (!activeSubject) return;
    const currentLecs = normalizeLectures(activeSubject);
    const updatedLectures = currentLecs.map(l => 
      l.id === lectureId ? { ...l, isPublishedForStudents: l.isPublishedForStudents === false } : l
    );
    const allFlattenedRefs = updatedLectures.flatMap(l => l.files || []);

    try {
      await updateDoc(doc(db, 'service_curriculum', activeSubject.id), {
        lectures: updatedLectures,
        references: allFlattenedRefs
      });
      const updatedSubject = { ...activeSubject, lectures: updatedLectures, references: allFlattenedRefs };
      setActiveSubject(updatedSubject);
      if (activeLecture?.id === lectureId) {
        setActiveLecture(updatedLectures.find(l => l.id === lectureId) || null);
      }
      setSubjectsByGrade(prev => {
        const currentList = prev[selectedGrade] || [];
        const updatedList = currentList.map(s => s.id === activeSubject.id ? updatedSubject : s);
        return { ...prev, [selectedGrade]: updatedList };
      });
    } catch (err) {
      console.error('Error toggling lecture visibility:', err);
    }
  };

  const handleDeleteLecture = async (lectureId, e) => {
    if (e) e.stopPropagation();
    if (!activeSubject) return;
    if (!window.confirm('هل أنت متأكد من حذف هذه المحاضرة وجميع الملفات التابعة لها؟')) return;

    const currentLecs = normalizeLectures(activeSubject);
    const updatedLectures = currentLecs.filter(l => l.id !== lectureId);
    const allFlattenedRefs = updatedLectures.flatMap(l => l.files || []);

    try {
      await updateDoc(doc(db, 'service_curriculum', activeSubject.id), {
        lectures: updatedLectures,
        references: allFlattenedRefs
      });
      const updatedSubject = { ...activeSubject, lectures: updatedLectures, references: allFlattenedRefs };
      setActiveSubject(updatedSubject);
      if (activeLecture?.id === lectureId) {
        setActiveLecture(null);
      }
      setSubjectsByGrade(prev => {
        const currentList = prev[selectedGrade] || [];
        const updatedList = currentList.map(s => s.id === activeSubject.id ? updatedSubject : s);
        return { ...prev, [selectedGrade]: updatedList };
      });
    } catch (err) {
      console.error('Error deleting lecture:', err);
    }
  };

  const handleOpenEditLecture = (lec, e) => {
    if (e) e.stopPropagation();
    setEditingLecture(lec);
    const isCombined = (lec.type === 'combined') || (Array.isArray(lec.subLectures) && lec.subLectures.length > 1);
    setEditLectureType(isCombined ? 'combined' : 'single');

    let num = lec.number || '';
    let top = lec.topic || '';
    if (!num && lec.title) {
      if (lec.title.includes(':')) {
        const parts = lec.title.split(':');
        num = parts[0].trim();
        top = parts.slice(1).join(':').trim();
      } else {
        num = lec.title;
      }
    }

    setEditLectureNumber(num || LECTURE_NUMBERS[0]);
    setEditLectureTopic(top);
    setEditLectureDate(lec.date || new Date().toISOString().split('T')[0]);
    setEditLectureLecturer(lec.lecturer || activeSubject?.teacher || '');

    if (isCombined && Array.isArray(lec.subLectures) && lec.subLectures.length > 0) {
      setEditSubLecturesList(lec.subLectures.map(s => ({ ...s })));
    } else {
      setEditSubLecturesList([
        { id: `sub-1`, number: num || 'المحاضرة الأولى', topic: top || '', lecturer: lec.lecturer || activeSubject?.teacher || '', date: lec.date || new Date().toISOString().split('T')[0] },
        { id: `sub-2`, number: 'المحاضرة الثانية', topic: '', lecturer: lec.lecturer || activeSubject?.teacher || '', date: lec.date || new Date().toISOString().split('T')[0] }
      ]);
    }

    setShowEditLectureModal(true);
  };

  const handleAddEditSubLecture = () => {
    const nextIdx = editSubLecturesList.length;
    const nextNumber = LECTURE_NUMBERS[nextIdx] || `المحاضرة ${nextIdx + 1}`;
    setEditSubLecturesList(prev => [
      ...prev,
      {
        id: `sub-${Date.now()}`,
        number: nextNumber,
        topic: '',
        lecturer: editLectureLecturer || activeSubject?.teacher || user?.fullName || '',
        date: new Date().toISOString().split('T')[0]
      }
    ]);
  };

  const handleRemoveEditSubLecture = (id) => {
    if (editSubLecturesList.length <= 2) {
      alert('يجب أن تحتوي المجموعة المجمعة على محاضرتين على الأقل.');
      return;
    }
    setEditSubLecturesList(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdateEditSubLecture = (id, field, value) => {
    setEditSubLecturesList(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSaveEditLecture = async (e) => {
    e.preventDefault();
    if (!activeSubject || !editingLecture) return;

    let updatedLec = null;
    if (editLectureType === 'single') {
      const title = editLectureTopic.trim()
        ? `${editLectureNumber}: ${editLectureTopic.trim()}`
        : editLectureNumber;

      updatedLec = {
        ...editingLecture,
        type: 'single',
        number: editLectureNumber,
        topic: editLectureTopic.trim(),
        title: title,
        date: editLectureDate || new Date().toISOString().split('T')[0],
        lecturer: editLectureLecturer.trim() || activeSubject.teacher || user?.fullName || 'خادم المادة'
      };
    } else {
      const numbersList = editSubLecturesList.map(s => s.number);
      const combinedNumbers = numbersList.join(' • ');
      const combinedTopics = editSubLecturesList.map(s => s.topic).filter(Boolean).join(' • ');
      const combinedTitle = combinedTopics ? `${combinedNumbers} (${combinedTopics})` : combinedNumbers;
      const firstDate = editSubLecturesList[0]?.date || '';
      const lastDate = editSubLecturesList[editSubLecturesList.length - 1]?.date || '';
      const dateRange = (firstDate && lastDate && firstDate !== lastDate) ? `${firstDate} إلى ${lastDate}` : (firstDate || lastDate);
      const lecturers = Array.from(new Set(editSubLecturesList.map(s => s.lecturer).filter(Boolean))).join('، ') || activeSubject.teacher || user?.fullName || 'خدام المادة';

      updatedLec = {
        ...editingLecture,
        type: 'combined',
        number: combinedNumbers,
        title: combinedTitle,
        date: dateRange,
        lecturer: lecturers,
        subLectures: editSubLecturesList
      };
    }

    const currentLecs = normalizeLectures(activeSubject);
    const updatedLectures = currentLecs.map(l => l.id === editingLecture.id ? updatedLec : l);
    const allFlattenedRefs = updatedLectures.flatMap(l => l.files || []);

    try {
      await updateDoc(doc(db, 'service_curriculum', activeSubject.id), {
        lectures: updatedLectures,
        references: allFlattenedRefs
      });

      const updatedSubject = { ...activeSubject, lectures: updatedLectures, references: allFlattenedRefs };
      setActiveSubject(updatedSubject);
      if (activeLecture?.id === editingLecture.id) {
        setActiveLecture(updatedLec);
      }
      setShowEditLectureModal(false);
      setSubjectsByGrade(prev => {
        const currentList = prev[selectedGrade] || [];
        const updatedList = currentList.map(s => s.id === activeSubject.id ? updatedSubject : s);
        return { ...prev, [selectedGrade]: updatedList };
      });
    } catch (err) {
      console.error('Error updating lecture:', err);
      alert('حدث خطأ أثناء حفظ تعديل المحاضرة: ' + err.message);
    }
  };

  const handleToggleRefVisibility = async (refId) => {
    if (!activeSubject) return;
    const currentLecs = normalizeLectures(activeSubject);
    const updatedLectures = currentLecs.map(lec => ({
      ...lec,
      files: (lec.files || []).map(r => 
        r.id === refId ? { ...r, isPublishedForStudents: r.isPublishedForStudents === false } : r
      )
    }));
    const allFlattenedRefs = updatedLectures.flatMap(l => l.files || []);

    try {
      await updateDoc(doc(db, 'service_curriculum', activeSubject.id), {
        lectures: updatedLectures,
        references: allFlattenedRefs
      });
      const updatedSubject = { ...activeSubject, lectures: updatedLectures, references: allFlattenedRefs };
      setActiveSubject(updatedSubject);
      if (activeLecture) {
        setActiveLecture(updatedLectures.find(l => l.id === activeLecture.id) || null);
      }
      setSubjectsByGrade(prev => {
        const currentList = prev[selectedGrade] || [];
        const updatedList = currentList.map(s => s.id === activeSubject.id ? updatedSubject : s);
        return { ...prev, [selectedGrade]: updatedList };
      });
    } catch (err) {
      console.error('Error toggling reference visibility:', err);
    }
  };

  const handleDeleteReference = async (refId) => {
    if (!activeSubject) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا الملف من المحاضرة؟')) return;

    const currentLecs = normalizeLectures(activeSubject);
    const updatedLectures = currentLecs.map(lec => ({
      ...lec,
      files: (lec.files || []).filter(r => r.id !== refId)
    }));
    const allFlattenedRefs = updatedLectures.flatMap(l => l.files || []);

    try {
      await updateDoc(doc(db, 'service_curriculum', activeSubject.id), {
        lectures: updatedLectures,
        references: allFlattenedRefs
      });
      const updatedSubject = { ...activeSubject, lectures: updatedLectures, references: allFlattenedRefs };
      setActiveSubject(updatedSubject);
      if (activeLecture) {
        setActiveLecture(updatedLectures.find(l => l.id === activeLecture.id) || null);
      }
      setSubjectsByGrade(prev => {
        const currentList = prev[selectedGrade] || [];
        const updatedList = currentList.map(s => s.id === activeSubject.id ? updatedSubject : s);
        return { ...prev, [selectedGrade]: updatedList };
      });
    } catch (err) {
      console.error('Error deleting reference:', err);
    }
  };

  const handleOpenEditReference = (rf) => {
    setEditingRef(rf);
    setEditRefTitle(rf.title || '');
    setEditRefUrl(rf.url || '');
    setEditRefType(rf.type || 'pdf');
    setShowEditRefModal(true);
  };

  const handleSaveEditedReference = async (e) => {
    e.preventDefault();
    if (!editingRef || !activeSubject || !editRefTitle.trim()) return;

    setEditRefSaving(true);
    const parsed = parseResourceLink(editRefUrl.trim(), editRefType);
    const updatedRef = {
      ...editingRef,
      title: editRefTitle.trim(),
      url: editRefUrl.trim(),
      type: editRefType,
      fileType: editRefType,
      fileId: parsed.fileId || editingRef.fileId || null,
      videoId: parsed.videoId || editingRef.videoId || null
    };

    const currentLecs = normalizeLectures(activeSubject);
    const updatedLectures = currentLecs.map(lec => ({
      ...lec,
      files: (lec.files || []).map(r => r.id === editingRef.id ? updatedRef : r)
    }));
    const allFlattenedRefs = updatedLectures.flatMap(l => l.files || []);

    try {
      await updateDoc(doc(db, 'service_curriculum', activeSubject.id), {
        lectures: updatedLectures,
        references: allFlattenedRefs
      });

      const updatedSubject = { ...activeSubject, lectures: updatedLectures, references: allFlattenedRefs };
      setActiveSubject(updatedSubject);
      if (activeLecture) {
        setActiveLecture(updatedLectures.find(l => l.id === activeLecture.id) || null);
      }
      setSubjectsByGrade(prev => {
        const currentList = prev[selectedGrade] || [];
        const updatedList = currentList.map(s => s.id === activeSubject.id ? updatedSubject : s);
        return { ...prev, [selectedGrade]: updatedList };
      });
      setShowEditRefModal(false);
      setEditingRef(null);
    } catch (err) {
      console.error('Error updating reference:', err);
      alert('حدث خطأ أثناء حفظ تعديل المرجع: ' + err.message);
    } finally {
      setEditRefSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
      {/* Curriculum Stage / Year Tabs & Academic Cycle Adoption */}
      <div className="space-y-3 pb-2 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Stage Tabs (فصل أليشع النبي تمهيدي | منهج سنة أولى بولس الرسول | منهج سنة ثانية بولس الرسول) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-black text-slate-800 shrink-0 ml-1">المرحلة:</span>
            {[
              { 
                key: 'elisha', 
                label: 'فصل أليشع النبي (تمهيدي)', 
                badge: 'تحضيري',
                isLive: false 
              },
              { 
                key: 'cycle_1', 
                label: 'منهج سنة أولى (بولس الرسول)', 
                badge: activeAcademicCycle === 'cycle_1' ? 'المعتمد للطلبة ⭐' : 'مقرر',
                isLive: activeAcademicCycle === 'cycle_1'
              },
              { 
                key: 'cycle_2', 
                label: 'منهج سنة ثانية (بولس الرسول)', 
                badge: activeAcademicCycle === 'cycle_2' ? 'المعتمد للطلبة ⭐' : 'مقرر',
                isLive: activeAcademicCycle === 'cycle_2'
              }
            ].map(item => {
              const isSelected = selectedGrade === item.key || 
                (item.key === 'cycle_1' && selectedGrade === 'first') || 
                (item.key === 'cycle_2' && selectedGrade === 'second');

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (setSelectedGrade) setSelectedGrade(item.key);
                    setActiveSubject(null);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-maroon-800 text-white shadow-sm ring-1 ring-gold-400/40'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isSelected
                      ? (item.isLive ? 'bg-gold-400 text-maroon-950 font-black' : 'bg-white/20 text-white')
                      : (item.isLive ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold' : 'bg-slate-200 text-slate-700')
                  }`}>
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Academic Year indicator & admin quick edit */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold shrink-0 self-end sm:self-auto">
            <span>العام الدراسي:</span>
            {canManageCycle && isEditingYear ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={inputYear}
                  onChange={(e) => setInputYear(e.target.value)}
                  placeholder="2026-2027"
                  className="bg-slate-50 border border-gold-400 rounded-lg px-2 py-0.5 text-xs text-slate-800 font-mono focus:outline-none w-24 text-center"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (inputYear.trim() && handleUpdateAcademicCycle) {
                      handleUpdateAcademicCycle(activeAcademicCycle, inputYear.trim());
                    }
                    setIsEditingYear(false);
                  }}
                  className="bg-maroon-800 hover:bg-maroon-900 text-gold-300 text-[10px] px-2 py-1 rounded-md font-bold cursor-pointer"
                >
                  حفظ ✓
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingYear(false)}
                  className="text-slate-400 hover:text-slate-600 text-[10px] px-1 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            ) : (
              <span 
                onClick={() => {
                  if (canManageCycle) {
                    setInputYear(academicYear);
                    setIsEditingYear(true);
                  }
                }}
                className={`font-mono text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-xs flex items-center gap-1.5 ${canManageCycle ? 'cursor-pointer hover:bg-slate-200' : ''}`}
                title={canManageCycle ? "اضغط لتعديل العام الدراسي" : ""}
              >
                <span>{academicYear}</span>
                {canManageCycle && <Pencil className="w-2.5 h-2.5 text-slate-400" />}
              </span>
            )}
          </div>
        </div>

        {/* Admin Adoption Safety Banner & Switch Confirmation */}
        {canManageCycle && (selectedGrade === 'cycle_1' || selectedGrade === 'cycle_2' || selectedGrade === 'first' || selectedGrade === 'second') && (() => {
          const normalizedGrade = (selectedGrade === 'first' || selectedGrade === 'cycle_1') ? 'cycle_1' : 'cycle_2';
          const isCurrentActive = activeAcademicCycle === normalizedGrade;
          const currentYearLabel = normalizedGrade === 'cycle_1' ? 'سنة أولى' : 'سنة ثانية';
          const otherYearLabel = normalizedGrade === 'cycle_1' ? 'سنة ثانية' : 'سنة أولى';

          return (
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border text-xs ${
              isCurrentActive 
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/70 border-amber-200 text-amber-950'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-sm shrink-0">{isCurrentActive ? '⭐' : '📌'}</span>
                <p className="font-bold">
                  {isCurrentActive ? (
                    <span>
                      منهج ({currentYearLabel} - بولس الرسول) هو <span className="text-emerald-800 underline underline-offset-2">المنهج المعتمد والمبثوث للطلبة حالياً</span> لهذا العام الدراسي ({academicYear}).
                    </span>
                  ) : (
                    <span>
                      أنت تتصفح حالياً منهج ({currentYearLabel})، بينما المعتمد للطلبة هو ({otherYearLabel}).
                    </span>
                  )}
                </p>
              </div>

              {!isCurrentActive && (
                <button
                  type="button"
                  onClick={() => {
                    const targetTitle = normalizedGrade === 'cycle_1' ? 'منهج سنة أولى (بولس الرسول)' : 'منهج سنة ثانية (بولس الرسول)';
                    const confirmed = window.confirm(
                      `هل أنت متأكد من اعتماد وبث (${targetTitle}) لجميع طلاب قاعة إعداد خدام للعام الدراسي (${academicYear})؟\n\nتأكيد هذا الإجراء سيجعل جميع الطلاب يشاهدون هذا المنهج في حساباتهم.`
                    );
                    if (confirmed && handleUpdateAcademicCycle) {
                      handleUpdateAcademicCycle(normalizedGrade, academicYear);
                    }
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-maroon-800 hover:bg-maroon-900 text-gold-300 shadow-xs transition-all cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <span>اعتماد وبث هذا المنهج للطلبة ⭐</span>
                </button>
              )}
            </div>
          );
        })()}
      </div>

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
          المنهج المعروض: <strong className="text-maroon-900">{getGradeTitle(selectedGrade)}</strong>
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddSubjectModal(true)}
                className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">المنهج المستهدف</label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade && setSelectedGrade(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800"
                  >
                    <option value="cycle_1">منهج المرحلة الأولى (الدورة أ)</option>
                    <option value="cycle_2">منهج المرحلة الثانية (الدورة ب)</option>
                    <option value="elisha">فصل أليشع (تمهيدي إعداد خدام)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم المادة</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: طقوس الكنيسة، تاريخ كنيسة، عقيدة"
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
              {currentGradeSubjects.map((sub) => {
                const lecs = normalizeLectures(sub);
                const lecsCount = lecs.length;
                const totalRefsCount = (sub.references || []).length || lecs.flatMap(l => l.files || []).length || lecsCount;
                const isServantMode = curriculumTarget === 'servants';

                return (
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
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditSubject(sub, e)}
                            className="text-slate-400 hover:text-maroon-700 p-1 rounded-lg hover:bg-maroon-50 transition-colors"
                            title="تعديل بيانات المادة واسم المسؤول"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs text-slate-400 font-bold">
                            {isServantMode
                              ? `${totalRefsCount} ${totalRefsCount === 1 ? 'مرجع' : (totalRefsCount >= 3 && totalRefsCount <= 10) ? 'مراجع' : 'مرجع'}`
                              : `${lecsCount} ${lecsCount === 1 ? 'محاضرة' : (lecsCount >= 3 && lecsCount <= 10) ? 'محاضرات' : 'محاضرة'}`
                            }
                          </span>
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
                      <p className="text-xs text-slate-500 leading-relaxed mb-4">
                        {isServantMode 
                          ? 'اضغط للدخول واستعراض مراجع وكتب المادة وتوليد الملخصات والعروض التقديمية.'
                          : 'اضغط للدخول وإدارة المذكرات والملفات والتسجيلات وفتح المحاضرات للمخدومين.'
                        }
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-maroon-800 pt-3 border-t border-slate-200/60">
                      <span>{isServantMode ? `إدارة مراجع المادة (${totalRefsCount})` : `إدارة محاضرات المادة (${lecsCount})`}</span>
                      <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {!activeLecture ? (
            /* ========================================================================= */
            /* 1. LECTURES LIST VIEW FOR ACTIVE SUBJECT                                 */
            /* ========================================================================= */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-bold mb-0.5">
                    <span>{curriculumTarget === 'students' ? 'مناهج المخدومين' : 'مناهج الخدام 🔒'}</span>
                    <span>•</span>
                    <span className="text-maroon-800">{getGradeTitle(selectedGrade)}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-maroon-800" />
                      <span>مادة: {activeSubject.name}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditSubject(activeSubject, e)}
                      className="bg-slate-100 hover:bg-maroon-50 text-slate-600 hover:text-maroon-800 border border-slate-200 hover:border-maroon-200 text-xs font-bold px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      title="تعديل اسم المادة والمسؤول"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>تعديل المادة</span>
                    </button>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">مسئول المادة: <strong className="text-slate-700">{activeSubject.teacher || 'خادم المادة'}</strong></span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const lecturesList = normalizeLectures(activeSubject);
                      const nextNum = LECTURE_NUMBERS[lecturesList.length] || 'المحاضرة الأولى';
                      const afterNextNum = LECTURE_NUMBERS[lecturesList.length + 1] || 'المحاضرة الثانية';
                      setLectureEntryMode('single');
                      setSingleLectureNumber(nextNum);
                      setSingleLectureTopic('');
                      setSingleLectureDate(new Date().toISOString().split('T')[0]);
                      setSingleLectureLecturer(activeSubject.teacher || user.fullName || '');
                      setSubLecturesList([
                        { id: 'sub-1', number: nextNum, topic: '', lecturer: activeSubject.teacher || user.fullName || '', date: new Date().toISOString().split('T')[0] },
                        { id: 'sub-2', number: afterNextNum, topic: '', lecturer: activeSubject.teacher || user.fullName || '', date: new Date().toISOString().split('T')[0] }
                      ]);
                      setShowAddLectureModal(true);
                    }}
                    className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة محاضرة جديدة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubject(null)}
                    className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 cursor-pointer transition-colors"
                  >
                    ← العودة لقائمة المواد
                  </button>
                </div>
              </div>

              {/* Add Lecture Modal */}
              {showAddLectureModal && (
                <form onSubmit={handleAddLecture} className="bg-slate-50 border border-maroon-200 p-4.5 rounded-2xl space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                    <h5 className="font-extrabold text-xs text-maroon-900 flex items-center gap-1.5">
                      <FolderPlus className="w-4 h-4 text-maroon-800" />
                      <span>إضافة محاضرة لمادة ({activeSubject.name})</span>
                    </h5>

                    {/* Mode Toggle Pills */}
                    <div className="flex items-center gap-1.5 bg-slate-200/90 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setLectureEntryMode('single')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          lectureEntryMode === 'single'
                            ? 'bg-maroon-800 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        محاضرة مفردة
                      </button>
                      <button
                        type="button"
                        onClick={() => setLectureEntryMode('combined')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          lectureEntryMode === 'combined'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>محاضرات مجمّعة (محتوى مشترك)</span>
                        <Sparkles className="w-3 h-3 text-gold-300" />
                      </button>
                    </div>
                  </div>

                  {lectureEntryMode === 'single' ? (
                    /* 1. Single Lecture Mode */
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم المحاضرة (اختر) *</label>
                          <select
                            value={singleLectureNumber}
                            onChange={(e) => setSingleLectureNumber(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800 font-extrabold text-maroon-900"
                          >
                            {LECTURE_NUMBERS.map((num) => (
                              <option key={num} value={num}>{num}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">موضوع الدرس (اختياري)</label>
                          <input
                            type="text"
                            placeholder="مثال: مقدمة في علم الطقس"
                            value={singleLectureTopic}
                            onChange={(e) => setSingleLectureTopic(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ المحاضرة *</label>
                          <input
                            type="date"
                            required
                            value={singleLectureDate}
                            onChange={(e) => setSingleLectureDate(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800 font-bold text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">المحاضر (مُلقي الدرس) *</label>
                          <input
                            type="text"
                            required
                            placeholder="مثال: ت. عفاف كمال عبد النور"
                            value={singleLectureLecturer}
                            onChange={(e) => setSingleLectureLecturer(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800 font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 2. Combined Lectures Mode */
                    <div className="space-y-3">
                      <div className="bg-amber-50/80 border border-amber-200/90 p-3 rounded-xl text-xs text-amber-950 font-medium leading-relaxed">
                        💡 <strong>الكارت المجمّع:</strong> يمكنك تحديد المحاضرات المشتركة في العرض التقديمي والمذكرات، وستظهر كل واحدة ببياناتها المستقلة (المحاضر والتاريخ والموضوع) جنباً إلى جنب داخل كارت واحد متصل، وبضغطة واحدة يُفتح المحتوى المشترك للجميع.
                      </div>

                      <div className="space-y-2.5">
                        {subLecturesList.map((sub, idx) => (
                          <div key={sub.id} className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-maroon-900 bg-maroon-50 px-2.5 py-0.5 rounded-md border border-maroon-200/60">
                                المحاضرة رقم {idx + 1} في المجموعة
                              </span>
                              {subLecturesList.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSubLecture(sub.id)}
                                  className="text-red-500 hover:text-red-700 text-xs font-bold p-1 rounded-lg hover:bg-red-50 transition-colors"
                                  title="حذف هذه المحاضرة من المجموعة"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">الرقم المعتمد *</label>
                                <select
                                  value={sub.number}
                                  onChange={(e) => handleUpdateSubLecture(sub.id, 'number', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-maroon-900 focus:outline-none focus:border-maroon-800"
                                >
                                  {LECTURE_NUMBERS.map((num) => (
                                    <option key={num} value={num}>{num}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">موضوع المحاضرة</label>
                                <input
                                  type="text"
                                  placeholder="موضوع الدرس"
                                  value={sub.topic}
                                  onChange={(e) => handleUpdateSubLecture(sub.id, 'topic', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-maroon-800"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">المحاضر *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="اسم المحاضر"
                                  value={sub.lecturer}
                                  onChange={(e) => handleUpdateSubLecture(sub.id, 'lecturer', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-maroon-800"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">تاريخ الإلقاء *</label>
                                <input
                                  type="date"
                                  required
                                  value={sub.date}
                                  onChange={(e) => handleUpdateSubLecture(sub.id, 'date', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800"
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={handleAddSubLecture}
                          className="w-full bg-white hover:bg-slate-100 border border-dashed border-amber-400 text-amber-900 font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4 text-amber-700" />
                          <span>إضافة محاضرة أخرى تالية للمجموعة</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setShowAddLectureModal(false)}
                      className="bg-white border border-slate-200 text-slate-600 text-xs px-3.5 py-1.5 rounded-xl font-bold hover:bg-slate-100 cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs px-5 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{lectureEntryMode === 'single' ? 'حفظ المحاضرة والدخول إليها' : 'حفظ الكارت المجمّع والدخول للمحتوى'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Lectures Cards Grid */}
              {(() => {
                const lecturesList = normalizeLectures(activeSubject);
                if (lecturesList.length === 0) {
                  return (
                    <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
                      <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">لم يتم إضافة محاضرات لهذه المادة بعد.</p>
                      <p className="text-[11px] text-slate-400 mt-1">اضغط على زر "إضافة محاضرة جديدة" للبدء في تنظيم المحاضرات ورفع مذكراتها وملفاتها.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {lecturesList.map((lec) => {
                      const filesCount = (lec.files || []).length;
                      const isCombined = lec.type === 'combined' || (Array.isArray(lec.subLectures) && lec.subLectures.length > 1);

                      if (isCombined) {
                        /* ========================================================= */
                        /* COMBINED LECTURES CARD (SIDE-BY-SIDE SUB-LECTURES)        */
                        /* ========================================================= */
                        return (
                          <div
                            key={lec.id}
                            onClick={() => setActiveLecture(lec)}
                            className="col-span-1 sm:col-span-2 bg-gradient-to-br from-amber-50/40 via-white to-slate-50 border-2 border-amber-300/80 hover:border-maroon-700 p-5 rounded-3xl cursor-pointer transition-all hover:shadow-lg group flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="bg-amber-100 text-amber-950 border border-amber-300 font-black text-xs px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                                    <span>كارت مجمّع: محاضرات متصلة بمحتوى دراسي مشترك</span>
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-bold">
                                    ({lec.subLectures.length} محاضرات متصلة)
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  {curriculumTarget === 'students' && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleToggleLectureVisibility(lec.id, e)}
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                                        lec.isPublishedForStudents !== false
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                          : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                      }`}
                                      title="إتاحة أو إخفاء المحاضرات المجمعة عن المخدومين"
                                    >
                                      {lec.isPublishedForStudents !== false ? 'متاحة 👁️' : 'مخفية 🔒'}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenEditLecture(lec, e)}
                                    className="text-slate-400 hover:text-maroon-700 p-1 rounded-lg hover:bg-maroon-50 transition-colors"
                                    title="تعديل بيانات المحاضرات المجمعة"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteLecture(lec.id, e)}
                                    className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                                    title="حذف هذا الكارت المجمّع بكافة ملفاته"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* SIDE-BY-SIDE SUB-LECTURES (Requested by user) */}
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
                              <span className="text-slate-500 text-[11px]">{filesCount} ملفات ومحتويات مشتركة للجميع</span>
                              <div className="flex items-center gap-1 group-hover:-translate-x-1 transition-transform font-extrabold text-maroon-800">
                                <span>فتح المحتوى الموحد للمحاضرات</span>
                                <ChevronLeft className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      /* ========================================================= */
                      /* SINGLE LECTURE CARD                                       */
                      /* ========================================================= */
                      return (
                        <div
                          key={lec.id}
                          onClick={() => setActiveLecture(lec)}
                          className="bg-slate-50 border border-slate-200 hover:border-maroon-700 p-5 rounded-2xl cursor-pointer transition-all hover:shadow-md group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2.5">
                              <div>
                                <span className="font-black text-maroon-900 text-xs bg-maroon-50 border border-maroon-200/80 px-2.5 py-0.5 rounded-lg inline-block mb-1">
                                  {lec.number || lec.title}
                                </span>
                                {lec.topic && (
                                  <h4 className="font-extrabold text-slate-900 text-base group-hover:text-maroon-800 transition-colors leading-snug">
                                    {lec.topic}
                                  </h4>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                {curriculumTarget === 'students' && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleLectureVisibility(lec.id, e)}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                                      lec.isPublishedForStudents !== false
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                        : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                    }`}
                                    title="إتاحة أو إخفاء المحاضرة بكامل ملفاتها عن المخدومين"
                                  >
                                    {lec.isPublishedForStudents !== false ? 'متاحة 👁️' : 'مخفية 🔒'}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenEditLecture(lec, e)}
                                  className="text-slate-400 hover:text-maroon-700 p-1 rounded-lg hover:bg-maroon-50 transition-colors"
                                  title="تعديل بيانات المحاضرة"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteLecture(lec.id, e)}
                                  className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                                  title="حذف المحاضرة بكافة ملفاتها"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600 mb-3">
                              <span className="flex items-center gap-1 bg-white border border-slate-200/80 px-2 py-0.5 rounded-lg text-[11px]">
                                <User className="w-3 h-3 text-maroon-800" />
                                <span>المحاضر: <strong>{lec.lecturer || activeSubject.teacher || 'خادم المادة'}</strong></span>
                              </span>
                              <span className="flex items-center gap-1 bg-white border border-slate-200/80 px-2 py-0.5 rounded-lg text-[11px] text-slate-500">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>{lec.date || 'غير محدد'}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs font-bold text-maroon-800 pt-3 border-t border-slate-200/60">
                            <span className="text-slate-500 text-[11px]">{filesCount} ملفات ومحتويات مرفقة</span>
                            <div className="flex items-center gap-1 group-hover:-translate-x-1 transition-transform">
                              <span>فتح المحاضرة وإدارة ملفاتها</span>
                              <ChevronLeft className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          ) : (
            /* ========================================================================= */
            /* 2. LECTURE DETAILS & FILES VIEW                                          */
            /* ========================================================================= */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-bold mb-0.5">
                    <button
                      type="button"
                      onClick={() => setActiveLecture(null)}
                      className="hover:text-maroon-800 underline cursor-pointer"
                    >
                      مادة {activeSubject.name}
                    </button>
                    <span>/</span>
                    <span className="text-maroon-900 font-extrabold">{activeLecture.title}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                      <FolderPlus className="w-5 h-5 text-maroon-800" />
                      <span>{activeLecture.title}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditLecture(activeLecture, e)}
                      className="bg-slate-100 hover:bg-maroon-50 text-slate-600 hover:text-maroon-800 border border-slate-200 hover:border-maroon-200 text-xs font-bold px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                      title="تعديل بيانات المحاضرة والمحاضر"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>تعديل المحاضرة</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                    <span>المحاضر: <strong className="text-slate-700">{activeLecture.lecturer}</strong></span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{activeLecture.date}</span>
                    </span>
                    <span>•</span>
                    <span>({(activeLecture.files || []).length} ملفات ومرفقات)</span>
                  </div>

                  {/* Sub-lectures chips if combined */}
                  {Array.isArray(activeLecture.subLectures) && activeLecture.subLectures.length > 1 && (
                    <div className="flex items-center gap-2 flex-wrap mt-2 pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-amber-900">المحاضرات المتصلة بالمحتوى:</span>
                      {activeLecture.subLectures.map((sub, sIdx) => (
                        <span key={sub.id || sIdx} className="bg-amber-100/70 border border-amber-300 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                          {sub.number} ({sub.topic || sub.lecturer || sub.date})
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetRefForAi({
                        title: `${activeLecture.title} (${activeSubject.name})`,
                        type: 'محاضرة تعليمية',
                        url: (activeLecture.files && activeLecture.files.length > 0) ? activeLecture.files[0].url : ''
                      });
                      setAiStudioMode('presentation');
                      setShowAiStudioModal(true);
                    }}
                    className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold text-xs py-2 px-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    title="توليد عرض تقديمي للشرائح Data Show لهذه المحاضرة بالذكاء الاصطناعي"
                  >
                    <Presentation className="w-4 h-4 text-gold-300" />
                    <span>Presentation 📽️</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetRefForAi({
                        title: `${activeLecture.title} (${activeSubject.name})`,
                        type: 'محاضرة تعليمية',
                        url: (activeLecture.files && activeLecture.files.length > 0) ? activeLecture.files[0].url : ''
                      });
                      setAiStudioMode('study_guide');
                      setShowAiStudioModal(true);
                    }}
                    className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs py-2 px-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    title="توليد ملخص ودليل دراسي كنسي شامل لهذه المحاضرة"
                  >
                    <Sparkles className="w-4 h-4 text-purple-200" />
                    <span>ملخص المحاضرة 📖</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAddRefModal(true)}
                    className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>إضافة محتوى / ملف للمحاضرة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveLecture(null)}
                    className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 cursor-pointer transition-colors"
                  >
                    ← العودة لمحاضرات المادة
                  </button>
                </div>
              </div>

              {/* Upload/Add File Modal inside activeLecture */}
              {showAddRefModal && (
                <form onSubmit={handleAddReference} className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl space-y-3.5 shadow-sm">
                  <h5 className="font-extrabold text-xs text-slate-800">
                    إضافة محتوى أو ملف لـ ({activeLecture.title}) - مادة ({activeSubject.name})
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
                      placeholder="مثال: مذكرة شرح المحاضرة + أسئلة تطبيقية"
                      value={newRefTitle}
                      onChange={(e) => setNewRefTitle(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800 font-bold"
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

                  {/* Optional Auto AI Studio Generation checkbox */}
                  {newRefType !== 'video' && (
                    <label className="flex items-center gap-2 cursor-pointer bg-amber-50/70 border border-amber-200/80 p-2.5 rounded-xl text-xs font-bold text-amber-950 hover:bg-amber-100/70 transition-colors">
                      <input
                        type="checkbox"
                        checked={autoGenerateAiAfterUpload}
                        onChange={(e) => setAutoGenerateAiAfterUpload(e.target.checked)}
                        className="rounded text-maroon-800 focus:ring-maroon-800"
                      />
                      <span>توليد ملخص الدرس فوراً بعد الرفع بالذكاء الاصطناعي 🪄 (اختياري)</span>
                    </label>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button type="button" onClick={() => setShowAddRefModal(false)} className="bg-white border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-xl font-bold cursor-pointer">
                      إلغاء
                    </button>
                    <button 
                      type="submit" 
                      disabled={refSaving || (newRefType !== 'video' && !selectedUploadFile && !newRefUrl.trim())}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2 rounded-xl flex items-center gap-1.5 disabled:opacity-50 shadow-xs transition-all cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{refSaving ? (uploadStatusText || 'جاري الرفع...') : 'تأكيد حفظ ورفع المحتوى للمحاضرة'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Files List inside activeLecture */}
              <div className="space-y-3">
                {(!activeLecture.files || activeLecture.files.length === 0) ? (
                  <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-slate-400 text-xs">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-600">لا توجد ملفات أو محتويات مرفوعة لهذه المحاضرة حتى الآن.</p>
                    <p className="text-[11px] text-slate-400 mt-1">اضغط على زر "إضافة محتوى / ملف للمحاضرة" لرفع مذكرات PDF، عروض PowerPoint، أو تسجيلات صوتية وفيديو.</p>
                  </div>
                ) : (
                  activeLecture.files.map((rf) => {
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
                        
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
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
                            disabled={loadingRefAiId === rf.id}
                            onClick={() => handleOpenAiForRef(rf, 'presentation')}
                            className="bg-amber-100/70 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1 transition-all disabled:opacity-60 cursor-pointer"
                            title="إنشاء عرض تقديمي (Presentation Data Show) من هذا الملف مباشرة"
                          >
                            {loadingRefAiId === rf.id && aiStudioMode === 'presentation' ? (
                              <>
                                <div className="w-3 h-3 border-2 border-amber-800 border-t-transparent rounded-full animate-spin"></div>
                                <span>جاري القراءة سحابياً...</span>
                              </>
                            ) : (
                              <>
                                <Presentation className="w-3 h-3 text-amber-700" />
                                <span>Presentation 📽️</span>
                              </>
                            )}
                          </button>

                          {/* Direct AI Summary from this file */}
                          <button
                            type="button"
                            disabled={loadingRefAiId === rf.id}
                            onClick={() => handleOpenAiForRef(rf, 'study_guide')}
                            className="bg-purple-100/70 hover:bg-purple-200 text-purple-900 border border-purple-300 font-bold px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1 transition-all disabled:opacity-60 cursor-pointer"
                            title="توليد ملخص ودليل دراسي كنسي من هذا الملف مباشرة"
                          >
                            {loadingRefAiId === rf.id && aiStudioMode === 'study_guide' ? (
                              <>
                                <div className="w-3 h-3 border-2 border-purple-800 border-t-transparent rounded-full animate-spin"></div>
                                <span>جاري القراءة سحابياً...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 text-purple-700" />
                                <span>ملخص 📖</span>
                              </>
                            )}
                          </button>

                          {/* Toggle Visibility for Students */}
                          {curriculumTarget === 'students' ? (
                            <button
                              type="button"
                              onClick={() => handleToggleRefVisibility(rf.id)}
                              className={`font-bold px-3 py-1 rounded-lg text-[10px] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                                rf.isPublishedForStudents !== false
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                              }`}
                              title="اضغط لتفعيل أو إخفاء المحتوى عن المخدومين"
                            >
                              {rf.isPublishedForStudents !== false ? (
                                <>
                                  <Eye className="w-3 h-3 text-emerald-600" />
                                  <span>متاح للمخدومين 👁️</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3 text-amber-600" />
                                  <span>مخفي عن المخدومين 🔒</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 border border-slate-200 font-bold px-2.5 py-1 rounded-lg text-[10px]">
                              خاص بالخدام 🔒
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEditReference(rf)}
                            className="text-slate-400 hover:text-maroon-800 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                            title="تعديل هذا المرجع أو الملف"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteReference(rf.id)}
                            className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="حذف هذا الملف"
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
          setLoadedAiFile(null);
        }}
        initialGrade={selectedGrade}
        initialMode={aiStudioMode}
        targetReference={targetRefForAi}
        initialText=""
        initialBase64={loadedAiFile?.base64 || ''}
        initialMimeType={loadedAiFile?.mimeType || ''}
        initialFileName={loadedAiFile?.fileName || ''}
        initialFileSize={loadedAiFile?.fileSize || 0}
        onOpenPresentation={(pres) => {
          setActivePresentation(pres);
          setShowAiStudioModal(false);
          setTargetRefForAi(null);
          setLoadedAiFile(null);
        }}
        onAddQuestionsToBank={() => {
          setShowAiStudioModal(false);
          setTargetRefForAi(null);
          setLoadedAiFile(null);
        }}
      />

      {/* Edit Subject Modal */}
      {showEditSubjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 text-right animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-maroon-800" />
                <span>تعديل بيانات المادة</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowEditSubjectModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSubject} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المادة *</label>
                <input
                  type="text"
                  required
                  value={editSubjectName}
                  onChange={(e) => setEditSubjectName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800 focus:bg-white transition-all"
                  placeholder="اسم المادة"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">خادم المادة المسئول *</label>
                <input
                  type="text"
                  required
                  value={editSubjectTeacher}
                  onChange={(e) => setEditSubjectTeacher(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800 focus:bg-white transition-all"
                  placeholder="اسم الخادم المسئول"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditSubjectModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-4 py-2 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lecture Modal */}
      {showEditLectureModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 text-right animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-maroon-800" />
                <span>تعديل بيانات المحاضرة</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowEditLectureModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditLecture} className="space-y-4">
              {/* Mode Selector */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => setEditLectureType('single')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    editLectureType === 'single'
                      ? 'bg-maroon-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  محاضرة مفردة
                </button>
                <button
                  type="button"
                  onClick={() => setEditLectureType('combined')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    editLectureType === 'combined'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>محاضرات مجمّعة</span>
                  <Sparkles className="w-3 h-3 text-gold-300" />
                </button>
              </div>

              {editLectureType === 'single' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم المحاضرة *</label>
                      <select
                        value={editLectureNumber}
                        onChange={(e) => setEditLectureNumber(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800 font-extrabold text-maroon-900"
                      >
                        {LECTURE_NUMBERS.map((num) => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">موضوع الدرس</label>
                      <input
                        type="text"
                        placeholder="مثال: بانوراما احداث و اسفار العهد القديم"
                        value={editLectureTopic}
                        onChange={(e) => setEditLectureTopic(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">المحاضر (مُلقي الدرس) *</label>
                      <input
                        type="text"
                        required
                        placeholder="اسم المحاضر"
                        value={editLectureLecturer}
                        onChange={(e) => setEditLectureLecturer(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ المحاضرة *</label>
                      <input
                        type="date"
                        required
                        value={editLectureDate}
                        onChange={(e) => setEditLectureDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800 font-bold text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2.5">
                    {editSubLecturesList.map((sub, idx) => (
                      <div key={sub.id} className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-maroon-900 bg-maroon-50 px-2.5 py-0.5 rounded-md border border-maroon-200/60">
                            محاضرة فرعية {idx + 1}
                          </span>
                          {editSubLecturesList.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEditSubLecture(sub.id)}
                              className="text-red-500 hover:text-red-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">رقم المحاضرة</label>
                            <select
                              value={sub.number}
                              onChange={(e) => handleUpdateEditSubLecture(sub.id, 'number', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-maroon-800"
                            >
                              {LECTURE_NUMBERS.map((num) => (
                                <option key={num} value={num}>{num}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">الموضوع (اختياري)</label>
                            <input
                              type="text"
                              placeholder="موضوع المحاضرة"
                              value={sub.topic}
                              onChange={(e) => handleUpdateEditSubLecture(sub.id, 'topic', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-maroon-800"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">المحاضر</label>
                            <input
                              type="text"
                              placeholder="اسم المحاضر"
                              value={sub.lecturer}
                              onChange={(e) => handleUpdateEditSubLecture(sub.id, 'lecturer', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-maroon-800"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">التاريخ</label>
                            <input
                              type="date"
                              value={sub.date}
                              onChange={(e) => handleUpdateEditSubLecture(sub.id, 'date', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-maroon-800"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddEditSubLecture}
                      className="w-full bg-slate-50 hover:bg-slate-100 border border-dashed border-amber-400 text-amber-900 font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-amber-700" />
                      <span>إضافة محاضرة أخرى للمجموعة</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditLectureModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-4 py-2 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Edit Reference / File */}
      {showEditRefModal && editingRef && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3.5 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 text-right">
            <div className="bg-gradient-to-r from-maroon-900 to-maroon-800 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-gold-300" />
                <h4 className="font-extrabold text-sm sm:text-base">تعديل بيانات المرجع / الملف</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditRefModal(false);
                  setEditingRef(null);
                }}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedReference} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">عنوان الكتاب / المرجع *</label>
                <input
                  type="text"
                  required
                  value={editRefTitle}
                  onChange={(e) => setEditRefTitle(e.target.value)}
                  placeholder="مثال: مذكرة شرح المحاضرة"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">رابط الملف أو Google Drive</label>
                <input
                  type="text"
                  value={editRefUrl}
                  onChange={(e) => setEditRefUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/.../view"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-700 focus:outline-none focus:border-maroon-800 focus:bg-white transition-all"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">يمكنك تعديل أو تحديث رابط الملف المباشر من Google Drive في أي وقت.</span>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">نوع الملف</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { key: 'pdf', label: 'PDF', icon: FileText, color: 'text-red-700' },
                    { key: 'ppt', label: 'PowerPoint', icon: FileText, color: 'text-amber-700' },
                    { key: 'doc', label: 'Word', icon: FileText, color: 'text-blue-700' },
                    { key: 'excel', label: 'Excel', icon: FileSpreadsheet, color: 'text-emerald-700' },
                    { key: 'image', label: 'صورة', icon: ImageIcon, color: 'text-cyan-700' },
                    { key: 'audio', label: 'تسجيل صوتي', icon: Music, color: 'text-purple-700' },
                    { key: 'video', label: 'فيديو يوتيوب', icon: Video, color: 'text-red-600' },
                    { key: 'file', label: 'ملف عام', icon: File, color: 'text-slate-600' }
                  ].map(t => {
                    const IconComp = t.icon;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setEditRefType(t.key)}
                        className={`p-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          editRefType === t.key
                            ? 'bg-maroon-800 text-white border-maroon-800 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <IconComp className={`w-3.5 h-3.5 ${editRefType === t.key ? 'text-gold-300' : t.color}`} />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditRefModal(false);
                    setEditingRef(null);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-4 py-2 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={editRefSaving || !editRefTitle.trim()}
                  className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editRefSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
