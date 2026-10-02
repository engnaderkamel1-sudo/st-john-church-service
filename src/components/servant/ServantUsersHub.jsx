import React, { useState, useEffect } from 'react';
import { Users, History, RefreshCw, Activity, UserPlus, UserX, Check, Sparkles, Key, ExternalLink, Save, Eye, EyeOff } from 'lucide-react';
import { getGeminiApiKey, saveGeminiApiKey } from '../../services/geminiService';

export default function ServantUsersHub({
  user,
  userHubSubTab,
  setUserHubSubTab,
  allUsers,
  loginLogs,
  userRoleFilter,
  setUserRoleFilter,
  fetchAllUsers,
  fetchLoginLogs,
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
  roleUpdatingId
}) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [showKeyText, setShowKeyText] = useState(false);

  useEffect(() => {
    getGeminiApiKey().then(k => {
      if (k) setApiKeyInput(k);
    });
  }, []);

  const handleSaveApiKey = async (e) => {
    e?.preventDefault();
    if (!apiKeyInput.trim()) return;
    setApiKeyLoading(true);
    try {
      await saveGeminiApiKey(apiKeyInput);
      setApiKeySaved(true);
      setTimeout(() => setApiKeySaved(false), 3000);
    } catch (err) {
      console.error('Error saving API Key:', err);
    } finally {
      setApiKeyLoading(false);
    }
  };
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
      {/* Subtabs Switcher: الحسابات والأدوار vs سجل دخول المستخدمين vs إعدادات الذكاء الاصطناعي */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
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
          <span>الحسابات والأدوار ({allUsers.length})</span>
        </button>

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
      </div>

      {userHubSubTab === 'accounts' && (
        <>
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
                <option value="all">عرض الكل ({allUsers.length})</option>
                <option value="student">المخدومين فقط ({allUsers.filter(u => u.role === 'student').length})</option>
                <option value="servant">الخدام فقط ({allUsers.filter(u => u.role === 'servant').length})</option>
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
              <span className="text-[11px] text-slate-500 font-bold block">إجمالي المسجلين</span>
              <span className="text-xl font-extrabold text-slate-900">{allUsers.length}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-center">
              <span className="text-[11px] text-amber-800 font-bold block">المخدومين</span>
              <span className="text-xl font-extrabold text-amber-700">{allUsers.filter(u => u.role === 'student').length}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center">
              <span className="text-[11px] text-emerald-800 font-bold block">الخدام المعتمدين</span>
              <span className="text-xl font-extrabold text-emerald-700">{allUsers.filter(u => u.role === 'servant').length}</span>
            </div>
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl text-center">
              <span className="text-[11px] text-purple-800 font-bold block">فصل أليشع (إعداد خدام)</span>
              <span className="text-xl font-extrabold text-purple-700">{allUsers.filter(u => u.grade === 'elisha').length}</span>
            </div>
          </div>

          {/* Users Table */}
          {usersLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-maroon-800" />
              <span>جاري تحميل قائمة المستخدمين من قاعدة البيانات...</span>
            </div>
          ) : allUsers.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">لم يسجل أي مستخدم جديد حتى الآن.</p>
              <p className="text-[11px] text-slate-400 mt-1">عند تسجيل أي مستخدم برقم هاتفه ستظهر بياناته هنا للاعتماد أو التعديل.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-3">الاسم والبيانات</th>
                    <th className="py-3 px-3">رقم الهاتف</th>
                    <th className="py-3 px-3">الصفة الحالية</th>
                    <th className="py-3 px-3">المرحلة / النطاق</th>
                    <th className="py-3 px-3">تسجيل الحضور / الغياب اليدوي</th>
                    <th className="py-3 px-3">تعديل الصفة (خادم / مخدوم)</th>
                    <th className="py-3 px-3">تعديل المرحلة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allUsers
                    .filter(u => userRoleFilter === 'all' || u.role === userRoleFilter)
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                              item.role === 'servant' ? 'bg-maroon-800 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {item.fullName ? item.fullName[0] : '؟'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span>{item.fullName || 'بدون اسم'}</span>
                                {item.id === user.id && (
                                  <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded mr-1.5">حسابك</span>
                                )}
                              </div>
                              {item.email && (
                                <span className="text-[10px] text-slate-400 block font-normal font-mono" dir="ltr">{item.email}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600" dir="ltr">{item.phone}</td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                            item.role === 'servant'
                              ? 'bg-maroon-100 text-maroon-900 border border-maroon-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {item.role === 'servant' ? 'خادم' : 'مخدوم'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-700">
                          {(item.role === 'admin' || item.phone === '01275571569' || (item.email && item.email.includes('nader.kamel')))
                            ? <span className="text-amber-700 font-extrabold">مشرف التطبيق 👑</span>
                            : item.role === 'servant'
                            ? <span className="text-maroon-800 font-bold">خادم عام (جميع المراحل)</span>
                            : getGradeTitle(item.grade || 'first')}
                        </td>
                        <td className="py-3 px-3">
                          {item.role === 'student' ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleManualAttendance(item)}
                                disabled={manualAttendLoadingId === item.id || manualAbsenceLoadingId === item.id}
                                className={`font-bold text-[11px] px-2.5 py-1.5 rounded-xl transition-all shadow-2xs flex items-center gap-1 ${
                                  manualAttendSuccessId === item.id
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                                }`}
                                title="تسجيل حضور هذا المخدوم فوراً وإضافة 10 نقاط لحسابه"
                              >
                                {manualAttendSuccessId === item.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>تم الحضور ✓</span>
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>{manualAttendLoadingId === item.id ? '...' : 'حاضر'}</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => handleManualAbsence(item)}
                                disabled={manualAbsenceLoadingId === item.id || manualAttendLoadingId === item.id}
                                className={`font-bold text-[11px] px-2.5 py-1.5 rounded-xl transition-all shadow-2xs flex items-center gap-1 ${
                                  manualAbsenceSuccessId === item.id
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                                title="تسجيل هذا المخدوم غائباً لليوم وإرسال تنبيه"
                              >
                                {manualAbsenceSuccessId === item.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>تم الغياب ✓</span>
                                  </>
                                ) : (
                                  <>
                                    <UserX className="w-3.5 h-3.5 text-rose-700" />
                                    <span>{manualAbsenceLoadingId === item.id ? '...' : 'غائب'}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {item.role === 'student' ? (
                              <button
                                onClick={() => handleUpdateUserRole(item.id, 'servant')}
                                disabled={roleUpdatingId === item.id}
                                className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-[11px] px-3 py-1 rounded-xl transition-all shadow-2xs flex items-center gap-1"
                              >
                                {roleUpdatingId === item.id ? 'جاري...' : 'ترقية إلى خادم ⬆️'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateUserRole(item.id, 'student', item.grade || 'first')}
                                disabled={roleUpdatingId === item.id || item.phone === '01275571569'}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-[11px] px-3 py-1 rounded-xl transition-all flex items-center gap-1"
                              >
                                {roleUpdatingId === item.id ? 'جاري...' : 'تحويل إلى مخدوم ⬇️'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
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
                              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs focus:outline-none focus:border-maroon-800"
                            >
                              <option value="first">سنة أولى</option>
                              <option value="second">سنة ثانية</option>
                              <option value="third">سنة ثالثة</option>
                              <option value="elisha">فصل أليشع (إعداد خدام)</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
        </>
      )}

      {userHubSubTab === 'login_history' && (
        /* Login History View (سجل دخول المستخدمين) */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">سجل النشاط وعمليات دخول المستخدمين</h3>
                <span className="text-[11px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                  متابعة حية
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                رصد كامل لكافة عمليات الدخول وإنشاء الحسابات الجديدة بالوقت والتاريخ والصفة للمنظومة.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchLoginLogs}
              disabled={logsLoading}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="تحديث السجل"
            >
              <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin text-maroon-800' : ''}`} />
              <span>تحديث السجل</span>
            </button>
          </div>

          {logsLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-maroon-800" />
              <span>جاري تحميل سجل الدخول من قاعدة البيانات...</span>
            </div>
          ) : loginLogs.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
              <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">لا توجد عمليات دخول مسجلة بعد في السجل.</p>
              <p className="text-[11px] text-slate-400 mt-1">عند تسجيل دخول أي مستخدم أو إنشاء حساب جديد سيتم تدوينها هنا فوراً.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-3">المستخدم</th>
                    <th className="py-3 px-3">رقم الهاتف</th>
                    <th className="py-3 px-3">الصفة</th>
                    <th className="py-3 px-3">العملية</th>
                    <th className="py-3 px-3">الوقت</th>
                    <th className="py-3 px-3">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loginLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            log.role === 'servant' ? 'bg-maroon-800 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {log.userName ? log.userName[0] : '؟'}
                          </div>
                          <span>{log.userName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600" dir="ltr">{log.phone}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          log.role === 'servant'
                            ? 'bg-maroon-100 text-maroon-900'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {log.role === 'servant' ? 'خادم' : 'مخدوم'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          log.action === 'register'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          <Activity className="w-3 h-3" />
                          <span>{log.action === 'register' ? 'إنشاء حساب جديد' : 'تسجيل دخول'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-700" dir="ltr">{log.timeStr || 'الآن'}</td>
                      <td className="py-3 px-3 text-slate-500">{log.dateStr || 'اليوم'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. AI Studio Configuration View (إعدادات مفتاح الذكاء الاصطناعي للمنظومة) */}
      {userHubSubTab === 'ai_settings' && (
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
    </div>
  );
}
