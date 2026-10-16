import React, { useState, useEffect, useRef } from 'react';
import { Church, BookOpen, QrCode, ShieldCheck, HeartHandshake, LogOut, CheckCircle2, User, Bell, ChevronLeft, Sparkles, RefreshCw, AlertCircle, ArrowLeftRight, Eye, Menu, Check, CheckCheck, Trash2 } from 'lucide-react';
import { db } from './firebase';
import AuthModal from './components/AuthModal';
import StudentDashboard from './components/StudentDashboard';
import ServantDashboard from './components/ServantDashboard';
import AutoUpdateWatcher from './components/common/AutoUpdateWatcher';
import ErrorBoundary from './components/common/ErrorBoundary';

import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { checkIsAppAdmin } from './utils/security';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState('student');
  const [targetMode, setTargetMode] = useState('login');
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuTrigger, setMobileMenuTrigger] = useState(0); // Trigger to open navigation drawer from header
  const notificationRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [deletedNotificationIds, setDeletedNotificationIds] = useState([]);
  // Multi-Role Live Preview State (null = original role, or 'student' | 'servant' | 'servant_leader' | 'admin')
  const [previewRole, setPreviewRole] = useState(null);
  // Full-Screen Image Lightbox Preview State (for church logo or user profile photos)
  const [previewModalImage, setPreviewModalImage] = useState(null);
  const [adminNavTarget, setAdminNavTarget] = useState(null);

  // Real-time Firestore Notifications for Current User
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    const notifRef = collection(db, 'notifications');
    const targetIds = ['ALL', currentUser.id];
    if (currentUser.grade) {
      targetIds.push(currentUser.grade);
      if (currentUser.grade === 'first' || currentUser.grade === 'second') {
        targetIds.push('common_hall');
        targetIds.push('cycle_1');
      }
    }
    const isUserAdminRole = checkIsAppAdmin(currentUser);

    if (isUserAdminRole || currentUser.role === 'servant_leader') {
      targetIds.push('ADMIN');
    }

    const q = query(
      notifRef,
      where('targetUserId', 'in', targetIds)
    );

    let usersUnsub = () => {};

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // If current user is a servant or admin, compute 3-day advance birthday alerts
      const isServantOrAdmin = currentUser.role !== 'student';
      if (isServantOrAdmin) {
        // Fetch/listen to all users to detect birthdays
        const usersQ = query(collection(db, 'users'));
        usersUnsub = onSnapshot(usersQ, (uSnap) => {
          const today = new Date();
          const currentYear = today.getFullYear();
          const todayMonth = today.getMonth();
          const todayDate = today.getDate();

          const bdayAlerts = [];
          uSnap.docs.forEach(docSnap => {
            const u = docSnap.data();
            if (!u.birthDate || typeof u.birthDate !== 'string' || !u.birthDate.includes('-')) return;

            const [bYearStr, bMonthStr, bDayStr] = u.birthDate.split('-');
            const bYear = parseInt(bYearStr, 10);
            const bMonth = parseInt(bMonthStr, 10) - 1;
            const bDay = parseInt(bDayStr, 10);

            if (isNaN(bMonth) || isNaN(bDay)) return;

            let nextBday = new Date(currentYear, bMonth, bDay);
            if (bMonth < todayMonth || (bMonth === todayMonth && bDay < todayDate)) {
              nextBday = new Date(currentYear + 1, bMonth, bDay);
            }

            const diffTime = nextBday.getTime() - new Date(currentYear, todayMonth, todayDate).getTime();
            const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (daysRemaining >= 0 && daysRemaining <= 3) {
              const roleTitle = u.role === 'student' ? 'المخدوم' : 'الخادم';
              const timeDesc = daysRemaining === 0 
                ? 'اليوم! 🎂🎉' 
                : daysRemaining === 1 
                ? 'غداً بمشيئة ربنا' 
                : daysRemaining === 2 
                ? 'بعد يومين' 
                : 'بعد ٣ أيام';

              bdayAlerts.push({
                id: `bday_${docSnap.id}_${nextBday.getFullYear()}`,
                title: `تنبيه عيد ميلاد 🎂: ${u.fullName}`,
                desc: `عيد ميلاد ${roleTitle} ${u.fullName} ${timeDesc} (${bDay}/${bMonth + 1})، لا تنسوا تهنئته!`,
                time: daysRemaining === 0 ? 'اليوم' : `خلال ${daysRemaining} أيام`,
                isBirthday: true
              });
            }
          });

          // Combine manual Firestore notifications with birthday alerts
          setNotifications([...bdayAlerts, ...list]);
        }, (uErr) => {
          console.log('Error listening to users for birthdays:', uErr);
          setNotifications(list);
        });
      } else {
        setNotifications(list);
      }
    }, (err) => {
      console.log('Notifications listen error:', err);
    });

    return () => {
      unsubscribe();
      usersUnsub();
    };
  }, [currentUser]);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Load read & deleted notifications for current user from localStorage
  useEffect(() => {
    if (currentUser?.id) {
      try {
        const savedRead = JSON.parse(localStorage.getItem(`read_notifs_${currentUser.id}`) || '[]');
        const savedDeleted = JSON.parse(localStorage.getItem(`deleted_notifs_${currentUser.id}`) || '[]');
        setReadNotificationIds(Array.isArray(savedRead) ? savedRead : []);
        setDeletedNotificationIds(Array.isArray(savedDeleted) ? savedDeleted : []);
      } catch (e) {
        setReadNotificationIds([]);
        setDeletedNotificationIds([]);
      }
    } else {
      setReadNotificationIds([]);
      setDeletedNotificationIds([]);
    }
  }, [currentUser?.id]);

  const markAsRead = (id) => {
    if (!id) return;
    setReadNotificationIds(prev => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      if (currentUser?.id) {
        localStorage.setItem(`read_notifs_${currentUser.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const markAllAsRead = () => {
    const visibleIds = visibleNotifications.map(n => n.id);
    setReadNotificationIds(prev => {
      const updated = Array.from(new Set([...prev, ...visibleIds]));
      if (currentUser?.id) {
        localStorage.setItem(`read_notifs_${currentUser.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const deleteNotification = (id, e) => {
    if (e) e.stopPropagation();
    if (!id) return;
    setDeletedNotificationIds(prev => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      if (currentUser?.id) {
        localStorage.setItem(`deleted_notifs_${currentUser.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const deleteAllNotifications = () => {
    const visibleIds = visibleNotifications.map(n => n.id);
    setDeletedNotificationIds(prev => {
      const updated = Array.from(new Set([...prev, ...visibleIds]));
      if (currentUser?.id) {
        localStorage.setItem(`deleted_notifs_${currentUser.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const visibleNotifications = notifications.filter(n => !deletedNotificationIds.includes(n.id));
  const unreadCount = visibleNotifications.filter(n => !readNotificationIds.includes(n.id)).length;



  useEffect(() => {
    const saved = localStorage.getItem('church_user');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('church_user');
      }
    }
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('church_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('church_user');
  };

  const openAuth = (role = 'student', mode = 'login') => {
    setTargetRole(role);
    setTargetMode(mode);
    setAuthModalOpen(true);
  };

  const getGradeName = (grade) => {
    const map = {
      first: 'سنة أولى',
      second: 'سنة ثانية',
      third: 'سنة ثالثة',
      elisha: 'فصل أليشع (إعداد خدام)'
    };
    return map[grade] || grade || 'عام';
  };

  // 5-Second Splash Screen State (with Hold-to-Pause for reading verse)
  const [showSplash, setShowSplash] = useState(true);
  const [splashProgress, setSplashProgress] = useState(0);
  const [isSplashPaused, setIsSplashPaused] = useState(false);
  const isSplashPausedRef = useRef(false);

  useEffect(() => {
    isSplashPausedRef.current = isSplashPaused;
  }, [isSplashPaused]);

  useEffect(() => {
    const duration = 5000; // 5 seconds total active
    let elapsed = 0;
    const intervalTime = 50;

    const timer = setInterval(() => {
      if (isSplashPausedRef.current) return;

      elapsed += intervalTime;
      const progress = Math.min(Math.round((elapsed / duration) * 100), 100);
      setSplashProgress(progress);

      if (elapsed >= duration) {
        clearInterval(timer);
        setShowSplash(false);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      window.deferredPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Lock body scroll while splash is active to prevent any background layout bleed
  useEffect(() => {
    if (showSplash) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSplash]);

  return (
    <>
      {/* 5-Second Full Screen Splash Screen (Hold to Pause) */}
      {showSplash && (
        <div 
          onTouchStart={() => setIsSplashPaused(true)}
          onTouchEnd={() => setIsSplashPaused(false)}
          onMouseDown={() => setIsSplashPaused(true)}
          onMouseUp={() => setIsSplashPaused(false)}
          onContextMenu={(e) => e.preventDefault()}
          style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 99999 }}
          className="fixed inset-0 w-screen h-screen z-[99999] bg-gradient-to-b from-slate-900 via-maroon-950 to-slate-950 text-white flex flex-col items-center justify-between p-6 sm:p-8 font-cairo select-none animate-in fade-in duration-300 cursor-pointer overflow-hidden"
        >
          {/* Top Floating Skip Button (تخطي شاشة البداية) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowSplash(false);
            }}
            className="absolute top-[max(1rem,env(safe-area-inset-top,1rem))] left-4 sm:top-6 sm:left-6 z-30 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 border border-white/30 text-white text-xs font-bold backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer shadow-lg group"
            title="تخطي شاشة البداية"
          >
            <span>تخطي</span>
            <ChevronLeft className="w-3.5 h-3.5 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
          </button>

          {/* Center Logo & Titles & Prominent Verse */}
          <div className="flex flex-col items-center text-center space-y-4 sm:space-y-5 max-w-md px-4 my-auto">
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-gold-500/30 to-amber-600/30 rounded-full blur-xl animate-pulse"></div>
              <img 
                src="/church_logo.jpg" 
                alt="شعار كنيسة القديس ماريوحنا المعمدان" 
                className="w-32 h-32 sm:w-44 sm:h-44 rounded-full border-4 border-gold-400 object-cover shadow-2xl relative z-10 ring-4 ring-gold-400/20"
              />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xs sm:text-base font-bold text-slate-200">
                كنيسة القديس ماريوحنا المعمدان بالمعراج - مطرانية المعادي
              </h2>
              <div className="h-0.5 w-16 bg-gold-400/60 mx-auto rounded-full"></div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gold-200 via-gold-400 to-amber-200">
                أسرة إعداد خدام بولس الرسول وأليشع النبي
              </h1>
            </div>

            {/* Prominent Bible Verse Placed Up with Larger Font */}
            <div className="bg-slate-900/85 border border-gold-400/50 px-5 py-3.5 rounded-2xl shadow-xl backdrop-blur-md max-w-sm sm:max-w-md mx-auto">
              <p className="text-base sm:text-lg font-extrabold text-amber-200 leading-relaxed font-cairo">
                «لَيْسَ أَنْتُمُ اخْتَرْتُمُونِي بَلْ أَنَا اخْتَرْتُكُمْ وَأَقَمْتُكُمْ لِتَذْهَبُوا وَتَأْتُوا بِثَمَرٍ»
              </p>
              <span className="block text-xs sm:text-sm font-bold text-gold-400 mt-1.5 font-cairo">
                (يوحنا 15: 16)
              </span>
            </div>
          </div>

          {/* Bottom Progress Bar & Loading */}
          <div className="w-full max-w-sm space-y-2 pb-6">
            <div className="flex items-center justify-between text-xs text-gold-200/90 font-bold px-1">
              <span>جاري التحميل...</span>
              <span className="font-mono">{splashProgress}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-gold-500/30 shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-gold-400 via-amber-400 to-gold-300 rounded-full transition-all duration-75 ease-out shadow-sm"
                style={{ width: `${splashProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-gold-500 selection:text-maroon-950 font-cairo">
      {/* Light Mode Royal Header */}
      <header className="py-2.5 sm:py-3.5 px-3 sm:px-4 border-b border-slate-200/80 bg-white shadow-sm sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2.5">
          {/* Right Side: Menu Button & Notification Bell (RTL First) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Main Menu Button */}
            {currentUser && (
              <button
                type="button"
                onClick={() => setMobileMenuTrigger(prev => prev + 1)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-maroon-900 to-maroon-800 text-white rounded-xl text-xs font-bold shadow-xs hover:from-maroon-950 hover:to-maroon-900 active:scale-95 transition-all ring-1 ring-gold-400/40 cursor-pointer"
                title="فتح القائمة الرئيسية للأقسام"
              >
                <Menu className="w-4 h-4 text-gold-300 shrink-0" />
                <span className="hidden xs:inline">القائمة</span>
              </button>
            )}

            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                onClick={() => setShowNotifications(prev => !prev)}
                className="p-1.5 sm:p-2 text-slate-600 hover:text-maroon-900 hover:bg-slate-100 rounded-xl transition-colors relative cursor-pointer"
                title="التنبيهات"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <span className="min-w-3.5 h-3.5 sm:min-w-4 sm:h-4 px-1 bg-amber-500 text-maroon-950 font-black text-[9px] sm:text-[10px] rounded-full absolute -top-1 -right-1 ring-2 ring-white flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 sm:right-auto sm:left-0 mt-2 w-[calc(100vw-2rem)] max-w-xs sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 sm:p-4 z-50 text-right space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-maroon-900">
                      <span>التنبيهات والإشعارات</span>
                      {unreadCount > 0 && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {visibleNotifications.length > 0 && (
                      <div className="flex items-center gap-1 text-[11px]">
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={markAllAsRead}
                            className="px-2 py-0.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            title="تحديد الكل كمقروء"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>قراءة الكل</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={deleteAllNotifications}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="مسح كافة الإشعارات"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {visibleNotifications.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs font-bold">
                      لا توجد إشعارات حالياً
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
                      {visibleNotifications.map((n) => {
                        const isRead = readNotificationIds.includes(n.id);
                        return (
                          <div 
                            key={n.id} 
                            onClick={() => {
                              markAsRead(n.id);
                              if (n.type === 'pending_registration') {
                                setAdminNavTarget({ mainTab: 'users_hub', subTab: 'pending_approvals', ts: Date.now() });
                                setShowNotifications(false);
                              }
                            }}
                            className={`p-2.5 rounded-xl border text-xs transition-colors relative cursor-pointer ${
                              !isRead
                                ? 'bg-amber-50/70 border-amber-200/90 shadow-2xs'
                                : 'bg-slate-50/80 border-slate-100 text-slate-500 hover:bg-slate-100/70'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                {!isRead && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                )}
                                <span className={`font-bold truncate ${!isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                                  {n.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                {!isRead && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(n.id);
                                    }}
                                    className="p-1 text-amber-600 hover:bg-amber-100 rounded-md transition-colors cursor-pointer"
                                    title="تحديد كمقروء"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => deleteNotification(n.id, e)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                  title="حذف هذا التنبيه"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className={`text-[11px] mt-1 ${!isRead ? 'text-slate-700' : 'text-slate-400'}`}>
                              {(n.desc || '').replace(/،?\s*وتمت إضافة.*نقطة لرصيدك\.?/g, '').trim()}
                            </div>
                            <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                              <span>{n.time}</span>
                              {n.type === 'pending_registration' && (
                                <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.2 rounded font-bold">
                                  مراجعة 👈
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center Identity Text */}
          <div className="min-w-0 text-center flex-1 px-1">
            <h1 className="text-xs sm:text-base md:text-lg font-black text-maroon-900 leading-tight truncate">
              أسرة إعداد خدام بولس الرسول وأليشع النبي
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate hidden sm:block">
              كنيسة ماريوحنا المعمدان بالمعراج - مطرانية المعادي
            </p>
          </div>

          {/* Left Side: St. John Church Logo (Click to zoom/expand) */}
          <div className="shrink-0 flex items-center">
            <button
              type="button"
              onClick={() => setPreviewModalImage({ url: '/church_logo.jpg' })}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-gold-400 group cursor-pointer"
              title="أيقونة شفيع الكنيسة"
            >
              <img 
                src="/church_logo.jpg" 
                alt="شعار كنيسة القديس ماريوحنا المعمدان" 
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-gold-400 object-cover shadow-sm ring-1 ring-gold-400/20 group-hover:scale-105 active:scale-95 transition-all"
              />
            </button>
          </div>
        </div>
      </header>

      {/* Sub-Header Bar: Multi-Role Preview Switcher */}
      {currentUser && currentUser.role !== 'student' && (() => {
        const isAppAdmin = checkIsAppAdmin(currentUser);
        const activeEffectiveRole = previewRole || currentUser.role;

        return (
          <div className="bg-amber-50/90 border-b border-amber-200/80 px-3 sm:px-4 py-2 text-xs max-w-5xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-[11px] sm:text-xs">
                <Eye className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  {previewRole 
                    ? `أنت الآن في وضع تجربة: ${
                        previewRole === 'student' ? 'مخدوم 🎓' 
                        : previewRole === 'servant' ? 'خادم عادي ✝️' 
                        : previewRole === 'servant_leader' ? 'أمين خدمة 🛡️' 
                        : 'مشرف التطبيق 👑'
                      }`
                    : isAppAdmin 
                    ? 'لوحة المشرف العام (اختر وضع المعاينة):' 
                    : 'لوحة تحكم الخادم'}
                </span>
              </div>

              {/* Multi-Role Switcher Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                {isAppAdmin ? (
                  <>
                    {/* Admin original button */}
                    <button
                      type="button"
                      onClick={() => setPreviewRole(null)}
                      className={`text-[11px] font-bold py-1 px-2.5 rounded-xl transition-all cursor-pointer border ${
                        !previewRole
                          ? 'bg-amber-500 text-maroon-950 border-amber-600 shadow-2xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      👑 المشرف
                    </button>

                    {/* Servant Leader preview */}
                    <button
                      type="button"
                      onClick={() => setPreviewRole('servant_leader')}
                      className={`text-[11px] font-bold py-1 px-2.5 rounded-xl transition-all cursor-pointer border ${
                        previewRole === 'servant_leader'
                          ? 'bg-purple-800 text-white border-purple-900 shadow-2xs animate-pulse'
                          : 'bg-white hover:bg-slate-100 text-purple-900 border-purple-300'
                      }`}
                    >
                      🛡️ أمين الخدمة
                    </button>

                    {/* Regular Servant preview */}
                    <button
                      type="button"
                      onClick={() => setPreviewRole('servant')}
                      className={`text-[11px] font-bold py-1 px-2.5 rounded-xl transition-all cursor-pointer border ${
                        previewRole === 'servant'
                          ? 'bg-maroon-800 text-white border-maroon-900 shadow-2xs animate-pulse'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      ✝️ خادم
                    </button>

                    {/* Student preview */}
                    <button
                      type="button"
                      onClick={() => setPreviewRole('student')}
                      className={`text-[11px] font-bold py-1 px-2.5 rounded-xl transition-all cursor-pointer border ${
                        previewRole === 'student'
                          ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs animate-pulse'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      🎓 مخدوم
                    </button>
                  </>
                ) : (
                  /* Normal servant toggle */
                  <button
                    type="button"
                    onClick={() => setPreviewRole(prev => prev === 'student' ? null : 'student')}
                    className={`text-[11px] sm:text-xs font-bold py-1 px-3 rounded-xl transition-all flex items-center gap-1.5 border cursor-pointer active:scale-95 ${
                      previewRole === 'student'
                        ? 'bg-amber-500 hover:bg-amber-600 text-maroon-950 border-amber-600 shadow-xs animate-pulse'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-2xs'
                    }`}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-maroon-800 shrink-0" />
                    <span>{previewRole === 'student' ? 'العودة لحساب الخادم ↩' : 'التبديل لتجربة كـ مخدوم 🎓'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-6 w-full flex flex-col justify-center">
        <ErrorBoundary currentUser={currentUser}>
          {currentUser ? (() => {
            const isUserAdminRole = checkIsAppAdmin(currentUser);
            const baseRole = isUserAdminRole ? 'admin' : currentUser.role;
            const effectiveRole = previewRole || baseRole;
            const isPreviewing = Boolean(previewRole && previewRole !== baseRole);

            if (effectiveRole === 'student') {
              const emulatedStudent = {
                ...currentUser,
                role: 'student',
                grade: currentUser.grade || 'first',
                isPreviewMode: isPreviewing,
              };

              return (
                <StudentDashboard 
                  key={`student_${effectiveRole}`}
                  user={emulatedStudent} 
                  onLogout={handleLogout}
                  onUpdateUser={(updated) => setCurrentUser(prev => ({ ...prev, ...updated }))}
                  externalMenuTrigger={mobileMenuTrigger}
                />
              );
            }

            // Emulated user for Servant or Servant Leader mode
            const emulatedUser = {
              ...currentUser,
              role: effectiveRole,
              isPreviewMode: isPreviewing,
            };

            return (
              <ServantDashboard 
                key={`servant_${effectiveRole}`}
                user={emulatedUser} 
                onLogout={handleLogout}
                onUpdateUser={(updated) => setCurrentUser(prev => ({ ...prev, ...updated }))}
                externalMenuTrigger={mobileMenuTrigger}
                navTarget={adminNavTarget}
              />
            );
          })() : (
          /* Landing Screen: Clean, Direct Entry */
          <div className="w-full max-w-xl mx-auto text-center space-y-8 py-8">
            <div>
              <span className="inline-block bg-maroon-50 border border-maroon-200 text-maroon-900 px-4 py-1 rounded-full text-xs font-bold mb-3 shadow-xs">
                كنيسة القديس ماريوحنا المعمدان بالمعراج
              </span>
              <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
                أسرة إعداد خدام بولس الرسول وأليشع النبي
              </h2>
            </div>

            {/* Direct 2 Action Cards: تسجيل الدخول & مستخدم جديد */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
              {/* Login Card */}
              <button
                type="button"
                onClick={() => openAuth('student', 'login')}
                className="bg-maroon-800 hover:bg-maroon-900 text-white p-6 rounded-3xl transition-all hover:shadow-xl group flex flex-col items-center justify-center gap-3 border border-maroon-700"
              >
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <User className="w-7 h-7 text-gold-300" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold">تسجيل الدخول</h3>
                  <p className="text-xs text-slate-200 mt-1">لديك حساب مسجل بالفعل؟ ادخل برقم هاتفك</p>
                </div>
              </button>

              {/* Register Card */}
              <button
                type="button"
                onClick={() => openAuth('student', 'register')}
                className="bg-white hover:bg-slate-50 text-slate-800 p-6 rounded-3xl border-2 border-slate-200 hover:border-maroon-800 transition-all hover:shadow-xl group flex flex-col items-center justify-center gap-3"
              >
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center font-bold group-hover:scale-110 transition-transform border border-amber-200">
                  <Sparkles className="w-7 h-7 text-maroon-800" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-maroon-800 transition-colors">مستخدم جديد</h3>
                  <p className="text-xs text-slate-500 mt-1">إنشاء حساب جديد كخادم أو مخدوم</p>
                </div>
              </button>
            </div>
          </div>
        )}
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="py-4 px-4 border-t border-slate-200 text-center text-xs text-slate-400 bg-white">
        <p>كنيسة القديس ماريوحنا المعمدان بالمعراج - إيبارشية المعادي © {new Date().getFullYear()}</p>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialRole={targetRole}
        initialMode={targetMode}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Auto Update Watcher for all users */}
      <AutoUpdateWatcher />

      {/* Full-Screen Image Lightbox Preview Modal */}
      {previewModalImage && (
        <div 
          onClick={() => setPreviewModalImage(null)}
          className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200 select-none"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-sm sm:max-w-md w-full bg-white rounded-3xl overflow-hidden shadow-2xl border-2 border-gold-400 p-3 sm:p-4 text-center space-y-3 cursor-default animate-in zoom-in-95 duration-200"
          >
            <div className="relative rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center max-h-[70vh]">
              <img 
                src={previewModalImage.url} 
                alt={previewModalImage.title || 'صورة مكبرة'} 
                className="w-full h-auto max-h-[68vh] object-contain rounded-2xl"
              />
            </div>
            {previewModalImage.title && (
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-800">
                {previewModalImage.title}
              </h4>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
