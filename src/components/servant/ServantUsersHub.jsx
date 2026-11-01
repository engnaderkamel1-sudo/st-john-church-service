import React, { useState, useEffect } from 'react';
import { Users, History, RefreshCw, Activity, UserPlus, UserX, Check, Sparkles, Key, ExternalLink, Save, Eye, EyeOff, Lock, X, CheckCircle2, ShieldAlert, UserCheck, AlertCircle, PauseCircle, Ban, RotateCcw, Calendar, MessageCircle, Send, Trash2 } from 'lucide-react';
import { getGeminiApiKey, saveGeminiApiKey } from '../../services/geminiService';
import { db } from '../../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { hashPassword, checkIsAppAdmin } from '../../utils/security';
import { getRelativeActivityInfo, formatLogTimestamp } from '../../services/activityTrackingService';

export default function ServantUsersHub({
  user,
  isAppAdmin,
  isServantLeader,
  userHubSubTab,
  setUserHubSubTab,
  allUsers,
  loginLogs,
  userRoleFilter,
  setUserRoleFilter,
  fetchAllUsers,
  fetchLoginLogs,
  handleLoadMoreLogs,
  logsLimit = 100,
  usersLoading,
  logsLoading,
  getGradeTitle,
  handleManualAttendance,
  manualAttendLoadingId,
  manualAttendSuccessId,
  handleManualAbsence,
  manualAbsenceLoadingId,
  manualAbsenceSuccessId,
  handleUpdateUserRole,
  handleApproveUser,
  handleRejectUser,
  handleUpdateUserStatus,
  handleDeleteUserPermanently,
  roleUpdatingId,
  onSelectStudent
}) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [showKeyText, setShowKeyText] = useState(false);

  // Admin User Password Reset States
  const [resettingUser, setResettingUser] = useState(null);
  const [newPassInput, setNewPassInput] = useState('');
  const [resetPassLoading, setResetPassLoading] = useState(false);
  const [resetPassSuccess, setResetPassSuccess] = useState(false);

  // WhatsApp Approval State
  const [waModalUser, setWaModalUser] = useState(null);
  const [waMessageText, setWaMessageText] = useState('');
  const [waSending, setWaSending] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logFilterRole, setLogFilterRole] = useState('all');

  const formatEgyptianPhone = (phone) => {
    if (!phone) return '';
    let cleaned = phone.toString().replace(/\D/g, '');
    if (cleaned.startsWith('0020')) {
      cleaned = cleaned.substring(2);
    } else if (cleaned.startsWith('20')) {
      // already with 20
    } else if (cleaned.startsWith('01')) {
      cleaned = '20' + cleaned.substring(1);
    } else if (cleaned.startsWith('1')) {
      cleaned = '20' + cleaned;
    }
    return cleaned;
  };

  const getDefaultWhatsAppMessage = (targetUser) => {
    const name = targetUser?.fullName ? targetUser.fullName.trim() : 'يا غالي';
    return `سلام ونعمة يا ${name}،
تم تفعيل ومراجعة حسابك بنجاح في منصة «خدمة إعداد الخدام - كنيسة القديس ماريوحنا المعمدان بالمعراج» ⛪✨

يمكنك الآن تسجيل الدخول مباشرة برقم هاتفك وكلمة المرور الخاصة بك التي قمت بإدخالها أثناء التسجيل عبر الرابط التالي:
https://st-john-church-service-rust.vercel.app/

خدمة مباركة ومثمرة! ✝️`;
  };

  const handleOpenWhatsAppModal = (item) => {
    const roleSel = document.getElementById(`role-select-${item.id}`)?.value || item.role || 'student';
    const gradeSel = document.getElementById(`grade-select-${item.id}`)?.value || item.grade || 'first';
    const joinDateSel = document.getElementById(`joindate-input-${item.id}`)?.value || '2026-10-02';

    setWaModalUser({
      user: item,
      roleSel,
      gradeSel,
      joinDateSel
    });
    setWaMessageText(getDefaultWhatsAppMessage(item));
  };

  const handleConfirmApproveAndSendWhatsApp = async () => {
    if (!waModalUser) return;
    setWaSending(true);
    try {
      const { user: targetUser, roleSel, gradeSel, joinDateSel } = waModalUser;
      
      // 1. Approve user in Firestore
      await handleApproveUser(targetUser.id, roleSel, gradeSel, joinDateSel);

      // 2. Open WhatsApp with formatted number and message
      const cleanPhone = formatEgyptianPhone(targetUser.phone);
      if (cleanPhone) {
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessageText)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      }

      setWaModalUser(null);
    } catch (err) {
      console.error('Error approving user with WhatsApp:', err);
      alert('حدث خطأ أثناء اعتماد الحساب.');
    } finally {
      setWaSending(false);
    }
  };

  useEffect(() => {
    getGeminiApiKey(user?.role).then(k => {
      if (k) setApiKeyInput(k);
    });
  }, [user]);

  const handleSaveApiKey = async (e) => {
    e?.preventDefault();
    if (!apiKeyInput.trim()) return;
    setApiKeyLoading(true);
    try {
      await saveGeminiApiKey(apiKeyInput, user);
      setApiKeySaved(true);
      setTimeout(() => setApiKeySaved(false), 3000);
    } catch (err) {
      console.error('Error saving API Key:', err);
      alert(err.message || 'حدث خطأ أثناء حفظ المفتاح');
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handleAdminSavePassword = async () => {
    if (!resettingUser || !newPassInput.trim()) return;
    setResetPassLoading(true);
    try {
      const hashedPassword = await hashPassword(newPassInput.trim());
      await updateDoc(doc(db, 'users', resettingUser.id), {
        password: hashedPassword,
        updatedAt: serverTimestamp()
      });
      setResetPassSuccess(true);
      if (fetchAllUsers) fetchAllUsers();
      setTimeout(() => {
        setResettingUser(null);
        setResetPassSuccess(false);
      }, 1500);
    } catch (err) {
      console.error('Error updating user password:', err);
      alert('حدث خطأ أثناء حفظ كلمة المرور');
    } finally {
      setResetPassLoading(false);
    }
  };

  const pendingUsers = allUsers.filter(u => u.status === 'pending_approval');
  const inactiveOrSuspendedUsers = allUsers.filter(u => u.status === 'suspended' || u.status === 'inactive' || u.status === 'rejected');
  const activeApprovedUsers = allUsers.filter(u => u.status !== 'pending_approval' && u.status !== 'suspended' && u.status !== 'inactive' && u.status !== 'rejected');

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
      {/* Subtabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setUserHubSubTab('accounts')}
          className={`py-2 px-4 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
            userHubSubTab === 'accounts'
              ? 'bg-maroon-800 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>الحسابات المعتمدة ({activeApprovedUsers.length})</span>
        </button>

        {/* Tab for Pending Approvals with pulsating badge if there are any */}
        <button
          type="button"
          onClick={() => setUserHubSubTab('pending_approvals')}
          className={`py-2 px-4 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
            userHubSubTab === 'pending_approvals'
              ? 'bg-amber-600 text-white shadow-xs'
              : pendingUsers.length > 0
              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>طلبات الاعتماد المعلقة</span>
          {pendingUsers.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              userHubSubTab === 'pending_approvals' ? 'bg-white text-amber-900' : 'bg-amber-600 text-white animate-pulse'
            }`}>
              {pendingUsers.length}
            </span>
          )}
        </button>

        {/* Tab for Suspended & Inactive Accounts (تاب منفصلة للحسابات المعلقة والمعطلة) */}
        <button
          type="button"
          onClick={() => setUserHubSubTab('suspended_accounts')}
          className={`py-2 px-4 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
            userHubSubTab === 'suspended_accounts'
              ? 'bg-rose-700 text-white shadow-xs'
              : inactiveOrSuspendedUsers.length > 0
              ? 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Ban className="w-4 h-4 text-rose-500" />
          <span>الحسابات المعلقة والمعطلة</span>
          {inactiveOrSuspendedUsers.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              userHubSubTab === 'suspended_accounts' ? 'bg-white text-rose-900' : 'bg-rose-600 text-white'
            }`}>
              {inactiveOrSuspendedUsers.length}
            </span>
          )}
        </button>

        {isAppAdmin && (
          <button
            type="button"
            onClick={() => { setUserHubSubTab('login_history'); fetchLoginLogs(); }}
            className={`py-2 px-4 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
              userHubSubTab === 'login_history'
                ? 'bg-maroon-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 text-gold-400" />
            <span>سجل النشاط والدخول ({loginLogs.length})</span>
          </button>
        )}

        {isAppAdmin && (
          <button
            type="button"
            onClick={() => setUserHubSubTab('ai_settings')}
            className={`py-2 px-4 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
              userHubSubTab === 'ai_settings'
                ? 'bg-maroon-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-gold-400" />
            <span>إعدادات الذكاء الاصطناعي (AI) 🤖</span>
          </button>
        )}
      </div>

      {/* PENDING APPROVALS TAB VIEW */}
      {userHubSubTab === 'pending_approvals' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">طلبات التسجيل الجديدة بانتظار الاعتماد</h3>
                <span className="text-[11px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                  {pendingUsers.length} طلبات معلقة
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                لا يمكن لأي مستخدم جديد الدخول للتطبيق إلا بعد قيامك بمراجعة بياناته واعتماده هنا.
              </p>
            </div>

            <button
              onClick={fetchAllUsers}
              disabled={usersLoading}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors self-start sm:self-auto"
              title="تحديث القائمة"
            >
              <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin text-maroon-800' : ''}`} />
            </button>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">لا توجد أي طلبات تسجيل معلقة حالياً.</p>
              <p className="text-[11px] text-slate-400 mt-1">كافة الحسابات المسجلة تم اعتمادها ومراجعتها.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingUsers.map((item) => (
                <div key={`pending-${item.id}`} className="bg-white border-2 border-amber-200 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm shrink-0">
                        {item.fullName ? item.fullName[0] : '؟'}
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-900 text-sm block">{item.fullName || 'بدون اسم'}</span>
                        <span className="text-xs text-slate-500 font-mono block mt-0.5" dir="ltr">{item.phone}</span>
                        {item.email && (
                          <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[200px]" dir="ltr">{item.email}</span>
                        )}
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full shrink-0 ${
                      item.role === 'servant'
                        ? 'bg-maroon-100 text-maroon-900 border border-maroon-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {item.role === 'servant' ? 'طلب رتبة خادم ✝️' : 'طلب رتبة مخدوم 🎓'}
                    </span>
                  </div>

                  <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">الرتبة المطلوبة:</span>
                      <select
                        defaultValue={item.role || 'student'}
                        id={`role-select-${item.id}`}
                        className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800"
                      >
                        <option value="student">مخدوم 🎓</option>
                        <option value="servant">خادم ✝️</option>
                        {isAppAdmin && <option value="servant_leader">أمين خدمة 🛡️</option>}
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">المرحلة الدراسية:</span>
                      <select
                        defaultValue={item.grade || 'first'}
                        id={`grade-select-${item.id}`}
                        className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800"
                      >
                        <option value="first">سنة أولى إعداد خدام</option>
                        <option value="second">سنة ثانية إعداد خدام</option>
                        <option value="third">سنة ثالثة إعداد خدام</option>
                        <option value="elisha">فصل أليشع</option>
                      </select>
                    </div>

                    {item.job && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">المهنة / الكلية:</span>
                        <span className="font-bold">{item.job}</span>
                      </div>
                    )}
                    {(item.confessionFather || item.confessionChurch) && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">أب الاعتراف:</span>
                        <span className="font-bold">
                          {item.confessionFather || ''}
                          {item.confessionChurch ? ` (${item.confessionChurch})` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Service Join Date Selector for Admin */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-700 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-maroon-800" />
                        <span>تاريخ بدء الحضور بالخدمة:</span>
                      </span>
                      <input
                        type="date"
                        id={`joindate-input-${item.id}`}
                        defaultValue={item.serviceJoinDate || '2026-10-02'}
                        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-maroon-800"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          const inp = document.getElementById(`joindate-input-${item.id}`);
                          if (inp) inp.value = '2026-10-02';
                        }}
                        className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100"
                      >
                        2 أكتوبر (بداية العام)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const inp = document.getElementById(`joindate-input-${item.id}`);
                          if (inp) inp.value = new Date().toISOString().split('T')[0];
                        }}
                        className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100"
                      >
                        اليوم
                      </button>
                    </div>
                  </div>

                  {/* Approve / WhatsApp / Reject buttons */}
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={roleUpdatingId === item.id}
                        onClick={() => {
                          const roleSel = document.getElementById(`role-select-${item.id}`)?.value || item.role;
                          const gradeSel = document.getElementById(`grade-select-${item.id}`)?.value || item.grade;
                          const joinDateSel = document.getElementById(`joindate-input-${item.id}`)?.value || '2026-10-02';
                          handleApproveUser(item.id, roleSel, gradeSel, joinDateSel);
                        }}
                        className="min-h-[42px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-2.5 py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{roleUpdatingId === item.id ? 'جاري الاعتماد...' : 'اعتماد فقط ✓'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={roleUpdatingId === item.id}
                        onClick={() => handleOpenWhatsAppModal(item)}
                        className="min-h-[42px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-2.5 py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <MessageCircle className="w-4 h-4 shrink-0 text-emerald-100" />
                        <span>اعتماد + واتساب 💬</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={roleUpdatingId === item.id}
                      onClick={() => handleRejectUser(item.id)}
                      className="w-full min-h-[36px] bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs px-3 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <UserX className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                      <span>رفض الطلب ✕</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {userHubSubTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">إدارة حسابات المستخدمين والموافقة على الأدوار</h3>
                <span className="text-[11px] bg-maroon-100 text-maroon-900 font-bold px-2 py-0.5 rounded-full">
                  صلاحيات مدير المنظومة
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                التحكم الكامل في حسابات المنظومة: الموافقة على رتبة المستخدم أو تعديلها (تحويل من خادم إلى مخدوم أو العكس، وتغيير المرحلة الدراسية).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 text-slate-700"
              >
                <option value="all">عرض المعتمدين النشطين ({activeApprovedUsers.length})</option>
                <option value="student">المخدومين فقط ({activeApprovedUsers.filter(u => u.role === 'student').length})</option>
                <option value="servant">الخدام فقط ({activeApprovedUsers.filter(u => u.role === 'servant').length})</option>
                <option value="servant_leader">أمناء الخدمة فقط ({activeApprovedUsers.filter(u => u.role === 'servant_leader').length})</option>
              </select>

              <button
                onClick={fetchAllUsers}
                disabled={usersLoading}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                title="تحديث القائمة"
              >
                <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin text-maroon-800' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
              <span className="text-[11px] text-slate-500 font-bold block">إجمالي النشطين</span>
              <span className="text-xl font-extrabold text-slate-900">{activeApprovedUsers.length}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-center">
              <span className="text-[11px] text-amber-800 font-bold block">المخدومين</span>
              <span className="text-xl font-extrabold text-amber-700">{activeApprovedUsers.filter(u => u.role === 'student').length}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center">
              <span className="text-[11px] text-emerald-800 font-bold block">الخدام المعتمدين</span>
              <span className="text-xl font-extrabold text-emerald-700">{activeApprovedUsers.filter(u => u.role === 'servant').length}</span>
            </div>
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl text-center">
              <span className="text-[11px] text-purple-800 font-bold block">أمناء الخدمة</span>
              <span className="text-xl font-extrabold text-purple-700">{activeApprovedUsers.filter(u => u.role === 'servant_leader').length}</span>
            </div>
          </div>

          {/* Users Table */}
          {usersLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-maroon-800" />
              <span>جاري تحميل قائمة المستخدمين من قاعدة البيانات...</span>
            </div>
          ) : activeApprovedUsers.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">لم يسجل أي مستخدم جديد حتى الآن.</p>
              <p className="text-[11px] text-slate-400 mt-1">عند تسجيل أي مستخدم برقم هاتفه ستظهر بياناته هنا للاعتماد أو التعديل.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mobile Responsive Cards (Visible on screens < md) */}
              <div className="md:hidden space-y-3">
                {activeApprovedUsers
                  .filter(u => {
                    if (userRoleFilter === 'all') return true;
                    return u.role === userRoleFilter;
                  })
                  .map((item) => (
                    <div key={`m-${item.id}`} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                      {/* User Info Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            item.status === 'pending_approval'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : item.status === 'suspended'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : (item.status === 'inactive' || item.status === 'rejected')
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : item.role === 'servant' ? 'bg-maroon-800 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {item.fullName ? item.fullName[0] : '؟'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-slate-900 text-sm">{item.fullName || 'بدون اسم'}</span>
                              {item.id === user.id && (
                                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">حسابك</span>
                              )}
                              {item.status === 'pending_approval' && (
                                <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-extrabold">
                                  قيد الاعتماد ⏳
                                </span>
                              )}
                              {item.status === 'suspended' && (
                                <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-extrabold">
                                  معلق مؤقتاً ⏸️
                                </span>
                              )}
                              {(item.status === 'inactive' || item.status === 'rejected') && (
                                <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full font-extrabold">
                                  معطل 🚫
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500 font-mono block mt-0.5" dir="ltr">{item.phone}</span>
                            {item.email && (
                              <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[200px]" dir="ltr">{item.email}</span>
                            )}
                            {isAppAdmin && (() => {
                              const act = getRelativeActivityInfo(item);
                              return (
                                <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[11px]">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${
                                    act.isOnline
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {act.isOnline && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />}
                                    {act.text}
                                  </span>
                                  {item.lastDevice && (
                                    <span className="text-slate-500 font-medium">
                                      {item.lastDevice}
                                    </span>
                                  )}
                                  {(item.loginCount || 0) > 0 && (
                                    <span className="text-slate-400 font-mono text-[10px]">
                                      ({item.loginCount} زيارة)
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Role Badge */}
                        <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full shrink-0 ${
                          checkIsAppAdmin(item)
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : item.role === 'servant_leader'
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : item.role === 'servant'
                            ? 'bg-maroon-100 text-maroon-900 border border-maroon-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {checkIsAppAdmin(item)
                            ? 'مشرف النظام 👑'
                            : item.role === 'servant_leader'
                            ? 'أمين خدمة 🛡️'
                            : item.role === 'servant'
                            ? 'خادم ✝️'
                            : 'مخدوم 🎓'}
                        </span>
                      </div>

                      {/* Stage / Role Detail */}
                      <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">الصفة / الدور:</span>
                        <div className="font-bold text-slate-800">
                          {item.role === 'servant_leader' ? (
                            <span className="text-purple-800 font-bold">أمين خدمة (متابعة نوتة الخدام)</span>
                          ) : item.role === 'servant' ? (
                            <span className="text-maroon-800 font-bold">خادم عام (جميع المراحل)</span>
                          ) : (
                            <select
                              value={item.grade || 'first'}
                              onChange={(e) => {
                                const newStage = e.target.value;
                                handleUpdateUserRole(item.id, 'student', newStage);
                              }}
                              disabled={roleUpdatingId === item.id}
                              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-maroon-800"
                            >
                              <option value="first">سنة أولى إعداد خدام</option>
                              <option value="second">سنة ثانية إعداد خدام</option>
                              <option value="third">سنة ثالثة إعداد خدام</option>
                              <option value="elisha">فصل أليشع</option>
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons with 44px+ touch targets */}
                      <div className="space-y-2 pt-1 border-t border-slate-100">

                        {/* Role Selector Controls */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-slate-600">تغيير الرتبة:</span>
                            <select
                              value={item.role || 'student'}
                              disabled={roleUpdatingId === item.id || checkIsAppAdmin(item)}
                              onChange={(e) => handleUpdateUserRole(item.id, e.target.value, item.grade || 'first')}
                              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800"
                            >
                              <option value="student">مخدوم 🎓</option>
                              <option value="servant">خادم ✝️</option>
                              <option value="servant_leader">أمين خدمة 🛡️</option>
                              {checkIsAppAdmin(item) && <option value="admin">مشرف النظام 👑</option>}
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setResettingUser(item);
                              setNewPassInput('123456');
                              setResetPassSuccess(false);
                            }}
                            className="min-h-[44px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <Key className="w-4 h-4 text-amber-700" />
                            <span>تغيير السر 🔑</span>
                          </button>
                        </div>

                        {/* Status Management Actions (اعتماد / تعليق / تعطيل / تنشيط) */}
                        {!checkIsAppAdmin(item) && item.id !== user.id && (
                          <div className="pt-2 border-t border-slate-100">
                            {item.status === 'pending_approval' ? (
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  disabled={roleUpdatingId === item.id}
                                  onClick={() => handleApproveUser(item.id, item.role, item.grade)}
                                  className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>{roleUpdatingId === item.id ? 'جاري الاعتماد...' : 'اعتماد وتفعيل ✓'}</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={roleUpdatingId === item.id}
                                  onClick={() => handleRejectUser(item.id)}
                                  className="min-h-[44px] bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                                >
                                  <UserX className="w-4 h-4 text-rose-700" />
                                  <span>رفض الطلب ✕</span>
                                </button>
                              </div>
                            ) : item.status === 'suspended' ? (
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  disabled={roleUpdatingId === item.id}
                                  onClick={() => handleUpdateUserStatus(item.id, 'active')}
                                  className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                  <span>{roleUpdatingId === item.id ? 'جاري التفعيل...' : 'إلغاء التعليق وتفعيل ✓'}</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={roleUpdatingId === item.id}
                                  onClick={() => {
                                    if (window.confirm('هل أنت متأكد من تعطيل هذا الحساب نهائياً؟')) {
                                      handleUpdateUserStatus(item.id, 'inactive');
                                    }
                                  }}
                                  className="min-h-[44px] bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                                >
                                  <Ban className="w-4 h-4 text-rose-700" />
                                  <span>تعطيل الحساب 🚫</span>
                                </button>
                              </div>
                            ) : (item.status === 'inactive' || item.status === 'rejected') ? (
                              <button
                                type="button"
                                disabled={roleUpdatingId === item.id}
                                onClick={() => handleUpdateUserStatus(item.id, 'active')}
                                className="w-full min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                              >
                                <RotateCcw className="w-4 h-4" />
                                <span>{roleUpdatingId === item.id ? 'جاري إعادة التفعيل...' : 'إعادة تفعيل الحساب 🔄'}</span>
                              </button>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  disabled={roleUpdatingId === item.id}
                                  onClick={() => {
                                    if (window.confirm(`هل أنت متأكد من تعليق حساب ${item.fullName || 'المستخدم'} مؤقتاً؟`)) {
                                      handleUpdateUserStatus(item.id, 'suspended');
                                    }
                                  }}
                                  className="min-h-[44px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                                >
                                  <PauseCircle className="w-4 h-4 text-amber-700" />
                                  <span>تعليق مؤقت ⏸️</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={roleUpdatingId === item.id}
                                  onClick={() => {
                                    if (window.confirm(`هل أنت متأكد من تعطيل حساب ${item.fullName || 'المستخدم'}؟`)) {
                                      handleUpdateUserStatus(item.id, 'inactive');
                                    }
                                  }}
                                  className="min-h-[44px] bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                                >
                                  <Ban className="w-4 h-4 text-rose-700" />
                                  <span>تعطيل الحساب 🚫</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {item.role === 'student' && onSelectStudent && (
                          <button
                            type="button"
                            onClick={() => onSelectStudent(item)}
                            className="w-full min-h-[44px] bg-gradient-to-r from-maroon-900 via-maroon-800 to-maroon-900 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 ring-1 ring-gold-400/40"
                          >
                            <Eye className="w-4 h-4 text-gold-300" />
                            <span>عرض الملف الشامل للمخدوم (360°) 🔍</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Desktop Table View (Visible on screens >= md) */}
              <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-3 px-3">الاسم والبيانات</th>
                      <th className="py-3 px-2 text-center">الملف 360°</th>
                      <th className="py-3 px-3">رقم الهاتف</th>
                      <th className="py-3 px-3">الصفة الحالية</th>
                      <th className="py-3 px-3">المرحلة / النطاق</th>
                      <th className="py-3 px-3">تعديل الصفة (خادم / مخدوم)</th>
                      <th className="py-3 px-3">تعديل المرحلة</th>
                      <th className="py-3 px-3">إعادة تعيين السر 🔑</th>
                      <th className="py-3 px-3 text-center">حالة الحساب والإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeApprovedUsers
                      .filter(u => {
                        if (userRoleFilter === 'all') return true;
                        return u.role === userRoleFilter;
                      })
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-3 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                item.status === 'pending_approval'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : item.status === 'suspended'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : (item.status === 'inactive' || item.status === 'rejected')
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : item.role === 'servant' ? 'bg-maroon-800 text-white' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {item.fullName ? item.fullName[0] : '؟'}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{item.fullName || 'بدون اسم'}</span>
                                  {item.id === user.id && (
                                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded mr-1.5">حسابك</span>
                                  )}
                                  {item.status === 'pending_approval' && (
                                    <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-extrabold mr-1">
                                      قيد الاعتماد ⏳
                                    </span>
                                  )}
                                  {item.status === 'suspended' && (
                                    <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-extrabold mr-1">
                                      معلق مؤقتاً ⏸️
                                    </span>
                                  )}
                                  {(item.status === 'inactive' || item.status === 'rejected') && (
                                    <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.2 rounded font-extrabold mr-1">
                                      معطل 🚫
                                    </span>
                                  )}
                                </div>
                                {item.email && (
                                  <span className="text-[10px] text-slate-400 block font-normal font-mono" dir="ltr">{item.email}</span>
                                )}
                                {isAppAdmin && (() => {
                                  const act = getRelativeActivityInfo(item);
                                  return (
                                    <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[11px]">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${
                                        act.isOnline
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        {act.isOnline && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />}
                                        {act.text}
                                      </span>
                                      {item.lastDevice && (
                                        <span className="text-slate-500 font-medium">
                                          {item.lastDevice}
                                        </span>
                                      )}
                                      {(item.loginCount || 0) > 0 && (
                                        <span className="text-slate-400 font-mono text-[10px]">
                                          ({item.loginCount} زيارة)
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-2 text-center">
                            {item.role === 'student' && onSelectStudent ? (
                              <button
                                type="button"
                                onClick={() => onSelectStudent(item)}
                                className="px-2.5 py-1.5 bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white rounded-xl font-bold text-[11px] shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer ring-1 ring-gold-400/30 active:scale-95"
                                title="عرض الملف الشامل للمخدوم"
                              >
                                <Eye className="w-3.5 h-3.5 text-gold-300" />
                                <span>الملف 360°</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 text-[10px]">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 font-mono text-slate-600" dir="ltr">{item.phone}</td>
                          <td className="py-3.5 px-3">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full ${
                              checkIsAppAdmin(item)
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : item.role === 'servant_leader'
                                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                : item.role === 'servant'
                                ? 'bg-maroon-100 text-maroon-900 border border-maroon-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              {checkIsAppAdmin(item)
                                ? 'مشرف النظام 👑'
                                : item.role === 'servant_leader'
                                ? 'أمين خدمة 🛡️'
                                : item.role === 'servant'
                                ? 'خادم ✝️'
                                : 'مخدوم 🎓'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-bold text-slate-700">
                            {checkIsAppAdmin(item)
                              ? <span className="text-amber-700 font-extrabold">مشرف التطبيق 👑</span>
                              : item.role === 'servant_leader'
                              ? <span className="text-purple-800 font-bold">أمين خدمة (متابعة نوتة الخدام)</span>
                              : item.role === 'servant'
                              ? <span className="text-maroon-800 font-bold">خادم عام (جميع المراحل)</span>
                              : (getGradeTitle ? getGradeTitle(item.grade || 'first') : (item.grade || 'الأولى'))}
                          </td>
                          <td className="py-3.5 px-3">
                            <select
                              value={item.role || 'student'}
                              disabled={roleUpdatingId === item.id || checkIsAppAdmin(item)}
                              onChange={(e) => handleUpdateUserRole(item.id, e.target.value, item.grade || 'first')}
                              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800 cursor-pointer shadow-2xs"
                            >
                              <option value="student">مخدوم 🎓</option>
                              <option value="servant">خادم ✝️</option>
                              <option value="servant_leader">أمين خدمة 🛡️</option>
                              {checkIsAppAdmin(item) && <option value="admin">مشرف النظام 👑</option>}
                            </select>
                          </td>
                          <td className="py-3.5 px-3">
                            {item.role === 'servant' ? (
                              <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2 py-1 rounded-lg">
                                خادم عام (كافة المراحل)
                              </span>
                            ) : (
                              <select
                                value={item.grade || 'first'}
                                onChange={(e) => {
                                  const newStage = e.target.value;
                                  handleUpdateUserRole(item.id, 'student', newStage);
                                }}
                                disabled={roleUpdatingId === item.id}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-maroon-800"
                              >
                                <option value="first">سنة أولى إعداد خدام</option>
                                <option value="second">سنة ثانية إعداد خدام</option>
                                <option value="third">سنة ثالثة إعداد خدام</option>
                                <option value="elisha">فصل أليشع</option>
                              </select>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            <button
                              type="button"
                              onClick={() => {
                                setResettingUser(item);
                                setNewPassInput('123456');
                                setResetPassSuccess(false);
                              }}
                              className="min-h-[38px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] px-3 py-1.5 rounded-xl transition-all shadow-2xs flex items-center gap-1 shrink-0 cursor-pointer active:scale-95"
                              title="تغيير أو إعادة تعيين كلمة المرور لهذا المستخدم فوراً"
                            >
                              <Key className="w-3.5 h-3.5 text-amber-700" />
                              <span>تغيير السر 🔑</span>
                            </button>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            {checkIsAppAdmin(item) || item.id === user.id ? (
                              <span className="text-[11px] font-bold text-slate-400">حساب محمي 🛡️</span>
                            ) : item.status === 'pending_approval' ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={roleUpdatingId === item.id}
                                  onClick={() => handleApproveUser(item.id, item.role, item.grade)}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] shadow-2xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                                  title="اعتماد وتفعيل الحساب فوراً"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{roleUpdatingId === item.id ? 'جاري الاعتماد...' : 'اعتماد ✓'}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={roleUpdatingId === item.id}
                                  onClick={() => handleRejectUser(item.id)}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl font-bold text-[11px] shadow-2xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                                  title="رفض الطلب"
                                >
                                  <UserX className="w-3.5 h-3.5 text-rose-700" />
                                  <span>رفض ✕</span>
                                </button>
                              </div>
                            ) : item.status === 'suspended' ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={roleUpdatingId === item.id}
                                  onClick={() => handleUpdateUserStatus(item.id, 'active')}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] shadow-2xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                                  title="إلغاء التعليق وتفعيل الحساب"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>تفعيل ✓</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={roleUpdatingId === item.id}
                                  onClick={() => {
                                    if (window.confirm('هل أنت متأكد من تعطيل هذا الحساب نهائياً؟')) {
                                      handleUpdateUserStatus(item.id, 'inactive');
                                    }
                                  }}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl font-bold text-[11px] shadow-2xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                                  title="تعطيل نهائي"
                                >
                                  <Ban className="w-3.5 h-3.5 text-rose-700" />
                                  <span>تعطيل 🚫</span>
                                </button>
                              </div>
                            ) : (item.status === 'inactive' || item.status === 'rejected') ? (
                              <button
                                type="button"
                                disabled={roleUpdatingId === item.id}
                                onClick={() => handleUpdateUserStatus(item.id, 'active')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                                title="إعادة تنشيط وتفعيل الحساب"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>إعادة تفعيل 🔄</span>
                              </button>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={roleUpdatingId === item.id}
                                  onClick={() => {
                                    if (window.confirm(`هل أنت متأكد من تعليق حساب ${item.fullName || 'المستخدم'} مؤقتاً؟`)) {
                                      handleUpdateUserStatus(item.id, 'suspended');
                                    }
                                  }}
                                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-[11px] shadow-2xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                                  title="تعليق مؤقت للحساب"
                                >
                                  <PauseCircle className="w-3.5 h-3.5 text-amber-700" />
                                  <span>تعليق ⏸️</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={roleUpdatingId === item.id}
                                  onClick={() => {
                                    if (window.confirm(`هل أنت متأكد من تعطيل حساب ${item.fullName || 'المستخدم'}؟`)) {
                                      handleUpdateUserStatus(item.id, 'inactive');
                                    }
                                  }}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl font-bold text-[11px] shadow-2xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                                  title="تعطيل الحساب"
                                >
                                  <Ban className="w-3.5 h-3.5 text-rose-700" />
                                  <span>تعطيل 🚫</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUSPENDED & INACTIVE ACCOUNTS TAB VIEW (تاب منفصلة للحسابات المعلقة والمعطلة) */}
      {userHubSubTab === 'suspended_accounts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">الحسابات المعلقة والمعطلة</h3>
                <span className="text-[11px] bg-rose-100 text-rose-900 font-bold px-2 py-0.5 rounded-full border border-rose-300">
                  {inactiveOrSuspendedUsers.length} حسابات موقوفة
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                قائمة الحسابات التي تم تعليقها مؤقتاً أو تعطيلها، مع إمكانية إعادة تفعيلها فوراً أو مسحها نهائياً من قاعدة البيانات.
              </p>
            </div>

            <button
              onClick={fetchAllUsers}
              disabled={usersLoading}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors self-start sm:self-auto"
              title="تحديث القائمة"
            >
              <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin text-maroon-800' : ''}`} />
            </button>
          </div>

          {usersLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-maroon-800" />
              <span>جاري تحميل البيانات من قاعدة البيانات...</span>
            </div>
          ) : inactiveOrSuspendedUsers.length === 0 ? (
            <div className="text-center py-12 bg-emerald-50/50 border border-dashed border-emerald-200 rounded-2xl p-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">لا توجد أي حسابات معلقة أو معطلة حالياً ✓</p>
              <p className="text-[11px] text-slate-500 mt-1">كافة حسابات المنظومة تعمل بنشاط وبشكل معتمد.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mobile Cards (Visible on screens < md) */}
              <div className="md:hidden space-y-3">
                {inactiveOrSuspendedUsers.map((item) => (
                  <div key={`susp-m-${item.id}`} className="bg-white border border-rose-100 rounded-2xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 border border-rose-300 flex items-center justify-center font-bold text-sm shrink-0">
                          {item.fullName ? item.fullName[0] : '؟'}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm">{item.fullName || 'بدون اسم'}</div>
                          <div className="text-xs text-slate-500 dir-ltr text-right">{item.phone}</div>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                        item.status === 'suspended'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {item.status === 'suspended' ? 'معلق مؤقتاً ⏸️' : 'معطل 🚫'}
                      </span>
                    </div>

                    <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">الصفة / المرحلة:</span>
                      <span className="font-bold text-slate-800">
                        {item.role === 'student' ? 'مخدوم' : item.role === 'servant' ? 'خادم' : 'أمين خدمة'}
                        {item.role === 'student' && item.grade && ` (${getGradeTitle ? getGradeTitle(item.grade) : item.grade})`}
                      </span>
                    </div>

                    {item.statusUpdatedBy && (
                      <div className="text-[11px] text-slate-400">
                        تم الإيقاف بواسطة: <span className="font-bold text-slate-600">{item.statusUpdatedBy}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        disabled={roleUpdatingId === item.id}
                        onClick={() => handleUpdateUserStatus(item.id, 'active')}
                        className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>إعادة تفعيل 🔄</span>
                      </button>

                      <button
                        type="button"
                        disabled={roleUpdatingId === item.id}
                        onClick={() => handleDeleteUserPermanently(item.id, item.fullName)}
                        className="min-h-[44px] bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4 text-rose-700" />
                        <span>حذف نهائي 🗑️</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table (Visible on screens >= md) */}
              <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-3 px-3">المستخدم</th>
                      <th className="py-3 px-3">الهاتف</th>
                      <th className="py-3 px-3">الصفة والمرحلة</th>
                      <th className="py-3 px-3">حالة الإيقاف</th>
                      <th className="py-3 px-3">مسؤول الإيقاف</th>
                      <th className="py-3 px-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inactiveOrSuspendedUsers.map((item) => (
                      <tr key={`susp-d-${item.id}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 flex items-center justify-center font-bold text-xs">
                              {item.fullName ? item.fullName[0] : '؟'}
                            </div>
                            <span>{item.fullName || 'بدون اسم'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dir-ltr text-right font-mono">{item.phone}</td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-700">
                            {item.role === 'student' ? 'مخدوم' : item.role === 'servant' ? 'خادم' : 'أمين خدمة'}
                            {item.role === 'student' && item.grade && ` (${getGradeTitle ? getGradeTitle(item.grade) : item.grade})`}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                            item.status === 'suspended'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {item.status === 'suspended' ? 'معلق مؤقتاً ⏸️' : 'معطل 🚫'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-[11px]">
                          {item.statusUpdatedBy || '—'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              disabled={roleUpdatingId === item.id}
                              onClick={() => handleUpdateUserStatus(item.id, 'active')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                              title="إعادة تنشيط الحساب"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>إعادة تفعيل 🔄</span>
                            </button>

                            <button
                              type="button"
                              disabled={roleUpdatingId === item.id}
                              onClick={() => handleDeleteUserPermanently(item.id, item.fullName)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                              title="حذف الحساب نهائياً من قاعدة البيانات"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-700" />
                              <span>حذف نهائي 🗑️</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {isAppAdmin && userHubSubTab === 'login_history' && (
        /* Login History View (سجل دخول المستخدمين - مخصص للمشرف فقط) */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">سجل النشاط وعمليات الدخول</h3>
                <span className="text-[11px] bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full">
                  إدارة المشرف 👑
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                رصد دقيق لكافة الجلسات التلقائية والدخول اليدوي ونوع الأجهزة المستخدمة.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchLoginLogs}
              disabled={logsLoading}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold self-start sm:self-auto cursor-pointer"
              title="تحديث السجل"
            >
              <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin text-maroon-800' : ''}`} />
              <span>تحديث السجل</span>
            </button>
          </div>

          {/* Activity Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-emerald-800 font-bold block">متواجدون الآن 🟢</span>
                <span className="text-lg font-extrabold text-emerald-900">
                  {allUsers.filter(u => getRelativeActivityInfo(u).isOnline).length}
                </span>
              </div>
              <Activity className="w-5 h-5 text-emerald-600 shrink-0" />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-600 font-bold block">إجمالي السجلات</span>
                <span className="text-lg font-extrabold text-slate-800">{loginLogs.length}</span>
              </div>
              <History className="w-5 h-5 text-slate-500 shrink-0" />
            </div>

            <div className="bg-maroon-50 border border-maroon-200 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-maroon-800 font-bold block">سجلات الخدام</span>
                <span className="text-lg font-extrabold text-maroon-900">
                  {loginLogs.filter(l => l.role === 'servant' || l.role === 'servant_leader' || l.role === 'admin').length}
                </span>
              </div>
              <Users className="w-5 h-5 text-maroon-600 shrink-0" />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-blue-800 font-bold block">سجلات المخدومين</span>
                <span className="text-lg font-extrabold text-blue-900">
                  {loginLogs.filter(l => l.role === 'student').length}
                </span>
              </div>
              <Users className="w-5 h-5 text-blue-600 shrink-0" />
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder="بحث بالاسم، رقم الهاتف، أو نوع الجهاز..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-maroon-800 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shrink-0 self-center">
              <button
                type="button"
                onClick={() => setLogFilterRole('all')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  logFilterRole === 'all'
                    ? 'bg-maroon-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الكل ({loginLogs.length})
              </button>
              <button
                type="button"
                onClick={() => setLogFilterRole('servant')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  logFilterRole === 'servant'
                    ? 'bg-maroon-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الخدام فقط
              </button>
              <button
                type="button"
                onClick={() => setLogFilterRole('student')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  logFilterRole === 'student'
                    ? 'bg-maroon-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                المخدومين فقط
              </button>
            </div>
          </div>

          {logsLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-maroon-800" />
              <span>جاري تحميل سجل النشاط من قاعدة البيانات...</span>
            </div>
          ) : (() => {
            const filteredLogs = loginLogs.filter((log) => {
              if (logFilterRole === 'servant' && log.role === 'student') return false;
              if (logFilterRole === 'student' && log.role !== 'student') return false;
              if (!logSearchQuery.trim()) return true;
              const q = logSearchQuery.trim().toLowerCase();
              const mName = (log.userName || '').toLowerCase().includes(q);
              const mPhone = (log.phone || '').toLowerCase().includes(q);
              const mDevice = (log.device || '').toLowerCase().includes(q);
              return mName || mPhone || mDevice;
            });

            if (filteredLogs.length === 0) {
              return (
                <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
                  <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">لا توجد سجلات تطابق البحث أو الفلتر المحدد.</p>
                  <p className="text-[11px] text-slate-400 mt-1">تأكد من كتابة الاسم أو الرقم بشكل صحيح أو قم بمسح نص البحث.</p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {/* Mobile View: Clean Cards */}
                <div className="md:hidden space-y-2.5">
                  {filteredLogs.map((log) => (
                    <div key={`ml-${log.id}`} className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            log.role === 'servant' || log.role === 'servant_leader' || log.role === 'admin'
                              ? 'bg-maroon-800 text-white'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}>
                            {log.userName ? log.userName[0] : '؟'}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 text-xs block">{log.userName}</span>
                            <span className="text-[11px] text-slate-500 font-mono" dir="ltr">{log.phone}</span>
                          </div>
                        </div>

                        <span className={`inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                          log.role === 'servant' || log.role === 'servant_leader' || log.role === 'admin'
                            ? 'bg-maroon-100 text-maroon-900'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {log.role === 'servant' || log.role === 'servant_leader' || log.role === 'admin' ? 'خادم' : 'مخدوم'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 flex-wrap gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            log.action === 'register_pending_approval'
                              ? 'bg-purple-100 text-purple-800'
                              : log.action === 'session_open'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            <Activity className="w-3 h-3" />
                            <span>
                              {log.action === 'register_pending_approval'
                                ? 'إنشاء حساب جديد ⏳'
                                : log.action === 'session_open'
                                ? 'فتح التطبيق 📱'
                                : 'تسجيل دخول 🔑'}
                            </span>
                          </span>

                          {log.device ? (
                            <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[10px] font-medium">
                              {log.device}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[10px]">—</span>
                          )}
                        </div>

                        <span className="text-slate-500 font-mono text-[11px]" dir="ltr">
                          {formatLogTimestamp(log)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View: Full Table */}
                <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-3 px-3">المستخدم</th>
                        <th className="py-3 px-3">رقم الهاتف</th>
                        <th className="py-3 px-3">الصفة</th>
                        <th className="py-3 px-3">الجهاز</th>
                        <th className="py-3 px-3">نوع الحركة</th>
                        <th className="py-3 px-3">الوقت والتاريخ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                                log.role === 'servant' || log.role === 'servant_leader' || log.role === 'admin'
                                  ? 'bg-maroon-800 text-white'
                                  : 'bg-emerald-100 text-emerald-900'
                              }`}>
                                {log.userName ? log.userName[0] : '؟'}
                              </div>
                              <span>{log.userName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600" dir="ltr">{log.phone}</td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              log.role === 'servant' || log.role === 'servant_leader' || log.role === 'admin'
                                ? 'bg-maroon-100 text-maroon-900'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {log.role === 'servant' || log.role === 'servant_leader' || log.role === 'admin' ? 'خادم' : 'مخدوم'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {log.device ? (
                              <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] font-medium">
                                {log.device}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              log.action === 'register_pending_approval'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : log.action === 'session_open'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              <Activity className="w-3 h-3" />
                              <span>
                                {log.action === 'register_pending_approval'
                                  ? 'إنشاء حساب جديد ⏳'
                                  : log.action === 'session_open'
                                  ? 'فتح التطبيق 📱'
                                  : 'تسجيل دخول 🔑'}
                              </span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-mono text-[11px]" dir="ltr">
                            {formatLogTimestamp(log)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Load More Logs Button */}
                {typeof handleLoadMoreLogs === 'function' && (
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={handleLoadMoreLogs}
                      disabled={logsLoading}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin text-maroon-800' : ''}`} />
                      <span>تحميل المزيد من السجلات السابقة ⏬</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* 3. AI Studio Configuration View (إعدادات مفتاح الذكاء الاصطناعي للمنظومة) */}
      {isAppAdmin && userHubSubTab === 'ai_settings' && (
        <div className="space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-base">إعدادات الذكاء الاصطناعي (Google Gemini AI)</h3>
              <span className="text-[11px] bg-purple-100 text-purple-900 font-bold px-2.5 py-0.5 rounded-full">
                إعدادات مركزية لجميع الخدام
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              المفتاح الموحد المسجل هنا يُمكّن جميع الخدام تلقائياً من استخدام "الاستوديو الذكي" لتحويل كتب المسابقات والمذكرات لامتحانات وشرائح تفاعلية وملخصات كنسية.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-maroon-800 text-gold-400 flex items-center justify-center font-bold shadow-xs">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">مفتاح Google AI Studio (Gemini API Key)</h4>
                <span className="text-[11px] text-slate-500">حساب الخدمة الموحد (مجاني تماماً حتى 1500 طلب يومياً)</span>
              </div>
            </div>

            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">أدخل أو حدث مفتاح الـ API:</label>
                <div className="relative flex items-center">
                  <input
                    type={showKeyText ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    dir="ltr"
                    className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-3 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-maroon-800 pr-12 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeyText(!showKeyText)}
                    className="absolute left-3 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                    title={showKeyText ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
                  >
                    {showKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <button
                  type="submit"
                  disabled={apiKeyLoading || !apiKeyInput.trim()}
                  className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  <span>{apiKeyLoading ? 'جاري الحفظ...' : 'حفظ وتفعيل المفتاح لجميع الخدام'}</span>
                </button>

                {apiKeySaved && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>تم حفظ وتفعيل مفتاح الـ API بنجاح في قاعدة البيانات! ✓</span>
                  </div>
                )}
              </div>
            </form>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2 text-slate-600">
              <span className="font-extrabold text-slate-800 block">💡 كيف تحصل على المفتاح المجاني لحساب الخدمة؟</span>
              <p className="leading-relaxed text-[11px]">
                ادخل على منصة Google AI Studio وسجل بحساب جوجل المخصص للخدمة، ثم اضغط على "Get API Key" وأنشئ مفتاحاً جديداً وضعه هنا.
              </p>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-maroon-800 hover:text-maroon-900 font-bold inline-flex items-center gap-1.5 pt-1 text-xs"
              >
                <span>فتح Google AI Studio لإنشاء المفتاح</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Admin Password Reset */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-slate-200 text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">إعادة تعيين كلمة المرور</h4>
                  <p className="text-[11px] text-slate-500 font-mono" dir="ltr">{resettingUser.phone}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResettingUser(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 block">المستخدم:</span>
              <p className="text-sm font-extrabold text-maroon-900">{resettingUser.fullName || 'بدون اسم'}</p>
              <span className="text-[10px] text-slate-400 block font-mono" dir="ltr">{resettingUser.phone}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور الجديدة:</label>
              <input
                type="text"
                value={newPassInput}
                onChange={(e) => setNewPassInput(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold font-mono focus:outline-none focus:border-maroon-800"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">يمكنك كتابة كلمة مرور سهلة (مثل 123456) وإعطاؤها للخادم.</span>
            </div>

            {resetPassSuccess && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs p-2.5 rounded-xl font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>تم تحديث كلمة المرور بنجاح ✓</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResettingUser(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleAdminSavePassword}
                disabled={resetPassLoading || !newPassInput.trim()}
                className="bg-maroon-800 hover:bg-maroon-700 text-white px-5 py-2 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {resetPassLoading ? 'جاري الحفظ...' : 'حفظ كلمة المرور 💾'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: WhatsApp Custom Message Approval */}
      {waModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200 text-right animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">اعتماد وإرسال رسالة واتساب</h4>
                  <p className="text-[11px] text-slate-500 font-mono" dir="ltr">{waModalUser.user.phone}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWaModalUser(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-500">صاحب الحساب:</span>
                <span className="font-extrabold text-maroon-900">{waModalUser.user.fullName || 'بدون اسم'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-500">رقم الهاتف:</span>
                <span className="font-mono font-bold text-slate-800" dir="ltr">{waModalUser.user.phone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-500">الرتبة المعتمدة:</span>
                <span className="font-bold text-slate-700">
                  {waModalUser.roleSel === 'servant' ? 'خادم ✝️' : waModalUser.roleSel === 'servant_leader' ? 'أمين خدمة 🛡️' : 'مخدوم 🎓'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">نص الرسالة (يمكنك تعديلها كما تحب):</label>
                <button
                  type="button"
                  onClick={() => setWaMessageText(getDefaultWhatsAppMessage(waModalUser.user))}
                  className="text-[11px] text-maroon-800 hover:underline font-bold"
                >
                  استعادة النص الأصلي
                </button>
              </div>
              <textarea
                rows={7}
                value={waMessageText}
                onChange={(e) => setWaMessageText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-2xl p-3 text-xs text-slate-800 leading-relaxed font-sans focus:outline-none resize-none transition-all"
                placeholder="اكتب أو عدل نص رسالة الواتساب هنا..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={waSending}
                onClick={() => setWaModalUser(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmApproveAndSendWhatsApp}
                disabled={waSending || !waMessageText.trim()}
                className="min-h-[42px] bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Send className="w-4 h-4 shrink-0" />
                <span>{waSending ? 'جاري الاعتماد...' : 'تأكيد الاعتماد وفتح واتساب 💬'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
