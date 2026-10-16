import React, { useState } from 'react';
import { X, Rocket, RefreshCw, CheckCircle2, Search, ExternalLink, Calendar, GitCommit } from 'lucide-react';

export default function UpdatesChangelogModal({ isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState('');

  if (!isOpen) return null;

  // Recent system updates list (Curated changelog of major enhancements)
  const updatesList = [
    {
      version: 'v2.6.0',
      date: '2026-10-16 23:15',
      title: 'شيت إجماليات وتاسكات المخدومين الشامل وتعديل المسابقات',
      details: 'إضافة جدول متابعة وتاسكات المخدومين الشامل (ServantTasksTotals)، إمكانية تعديل وحفظ مسودات الامتحانات والمسابقات المنشورة مسبقاً، وإظهار تفاصيل ورصد تسليمات كل مخدوم.'
    },
    {
      version: 'v2.5.5',
      date: '2026-10-16 23:09',
      title: 'تكبير صور المخدومين (Lightbox)، تواريخ الالتحاق، وتنبيه الافتقاد',
      details: 'إضافة نافذة تكبير صور المخدومين عالية الدقة بنقرة واحدة، تحديد تاريخ بدء الحضور بالخدمة عند الاعتماد وداخل ملف المخدوم، احتساب نسبة الحضور الفعلية بعدد الجمعات المنقضية، وتنبيه افتقاد فوري لمن تغيب جمعتين متتاليتين مع أزرار اتصال وواتساب.'
    },
    {
      version: 'v2.5.2',
      date: '2026-10-16 22:59',
      title: 'تطوير استمارة التسجيل: فحص التكرار اللحظي، إلزامية الصورة، وفصل كنيسة الاعتراف',
      details: 'فحص فوري استباقي في الخطوة الأولى للتأكد من عدم تكرار الهاتف أو الاسم، إلزامية التقاط الصورة الشخصية، وفصل خانة كنيسة الاعتراف عن اسم أب الاعتراف لتسهيل الرصد.'
    },
    {
      version: 'v2.5.0',
      date: '2026-10-16 22:24',
      title: 'تطبيق سياسة Zero Fake Data وتجميد النقاط الوهمية',
      details: 'تصفير كافة الدرجات والنقاط الوهمية في كروت التقييم، وتجميد ظهور النجوم والدرجات عبر كافة واجهات التطبيق لحين إطلاق منظومة الربط المركزي المتكاملة.'
    },
    {
      version: 'v2.4.8',
      date: '2026-10-16 21:54',
      title: 'إدارة الإشعارات الفورية وأدوات التحكم المباشر في حالات الحسابات',
      details: 'إمكانية تحديد الإشعارات كمقروءة وحذفها، وإضافة أزرار التحكم الفوري في الحسابات (اعتماد، إيقاف مؤقت، تنشيط، وتجميد) من بطاقات الموبايل وجدول الديسكتوب.'
    },
    {
      version: 'v2.4.5',
      date: '2026-10-16 21:43',
      title: 'كشف الحضور والإجماليات العام (Master Attendance Totals)',
      details: 'إضافة كشف الحضور العام لأسرة إعداد خدام بولس الرسول وأليشع النبي، استخراج إحصائيات نسب الحضور القيادية لكل مرحلة، ودعم الفرز والبحث السريع.'
    },
    {
      version: 'v2.4.2',
      date: '2026-10-16 21:19',
      title: 'نظام الحضور اليدوي المنفصل والقائمة الذكية لجمعات العام',
      details: 'فصل شاشة تسجيل الحضور اليدوي في واجهة مستقلة متجاوبة، توليد جمعات العام الدراسي تلقائياً بدءاً من 2 أكتوبر، وإتاحة رصد الحضور الجماعي بضغطة زر واحدة.'
    },
    {
      version: 'v2.4.1',
      date: '2026-10-16 20:54',
      title: 'هيكلة مركز إدارة المستخدمين وشارة طلبات الاعتماد اللحظية',
      details: 'إعادة تنظيم تبويبات إدارة الحسابات والأدوار، إضافة الشارة النابضة لطلبات الاعتماد المعلقة، وتوجيه تنبيهات فورية للمشرف العام عند تسجيل أي حساب جديد.'
    },
    {
      version: 'v2.4.0',
      date: '2026-10-13 19:30',
      title: 'إضافة أدوات سهولة الاستخدام، زر تخطي البداية، وبلاغات الأعطال',
      details: 'إضافة زر التخطي الزجاجي لشاشة البداية، زر تثبيت PWA الذكي، نافذة اقترح ميزة جديدة، نافذة إبلاغ عن عطل فني، وبطاقة الحساب السريعة مع حصر سجلات الإدارة بالمشرف العام.'
    },
    {
      version: 'v2.3.5',
      date: '2026-10-12 18:20',
      title: 'استوديو الذكاء الاصطناعي وتوليد الشرائح التفاعلية للـ Data Show',
      details: 'دعم تلخيص مذكرات المسابقات واستخراج بنك الأسئلة بالـ AI مع تشغيل العرض التقديمي التفاعلي ملء الشاشة لقاعة الخدمة.'
    },
    {
      version: 'v2.3.0',
      date: '2026-10-10 16:45',
      title: 'إدارة وتتبع أعياد ميلاد الخدام والمخدومين مع تنبيهات استباقية',
      details: 'إضافة تبويب أعياد الميلاد القادمة، واحتساب الفارق الزمني وإرسال تنبيهات تلقائية قبل الموعد بـ ٣ أيام.'
    },
    {
      version: 'v2.2.0',
      date: '2026-10-07 14:15',
      title: 'أرشيف النوتة الروحية لـ ١٢ شهراً وشريط مقارنة الالتزام الشهري',
      details: 'إمكانية الرجوع للنوتة الروحية لكامل السنة وحساب الفرق الإحصائي للصلوات مقارنة بالشهر السابق.'
    },
    {
      version: 'v2.1.0',
      date: '2026-10-03 11:30',
      title: 'نظام الحضور الذكي المزدوج (QR Code & PIN السريع)',
      details: 'تفعيل كود الحضور المؤقت وتوليد PIN رقمي سريع من ٤ أرقام، مع دعم المزامنة دون اتصال بالإنترنت (Offline Mode).'
    },
    {
      version: 'v2.0.0',
      date: '2026-09-28 20:00',
      title: 'معمارية المناهج المزدوجة وفصل مراجع الخدام عن المخدومين',
      details: 'فصل تام لمناهج الطلبة عن مذكرات الخدام الخاصة، مع أزرار الإتاحة الفورية والربط الشامل بـ Google Drive.'
    }
  ];

  // Calculate relative time
  const formatRelativeTime = (dateStr) => {
    try {
      const d = new Date(dateStr.replace(' ', 'T'));
      if (isNaN(d.getTime())) return dateStr;
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSec < 60 && diffSec >= -30) return 'الآن';
      if (diffMin === 1) return 'منذ دقيقة';
      if (diffMin <= 10) return `منذ ${diffMin} دقائق`;
      if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
      if (diffHours === 1) return 'منذ ساعة';
      if (diffHours <= 10) return `منذ ${diffHours} ساعات`;
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      if (diffDays === 1) return 'منذ يوم';
      if (diffDays === 2) return 'منذ يومين';
      if (diffDays <= 10) return `منذ ${diffDays} أيام`;
      return `منذ ${diffDays} يوم`;
    } catch {
      return dateStr;
    }
  };

  const handleCheckServer = async () => {
    setIsChecking(true);
    setCheckResult('');
    try {
      const res = await fetch(`/?_chk=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });
      if (res.ok) {
        setCheckResult('✓ اتصالك بالسيرفر سليم ونسخة متصفحك محدثة بالكامل.');
      } else {
        setCheckResult('تعذر التحقق من استجابة السيرفر.');
      }
    } catch (err) {
      setCheckResult('تعذر الوصول للسيرفر: تحقق من اتصال الإنترنت.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleHardRefresh = () => {
    if ('caches' in window) {
      caches.keys().then((names) => {
        Promise.all(names.map((name) => caches.delete(name))).then(() => {
          window.location.reload(true);
        });
      }).catch(() => {
        window.location.reload(true);
      });
    } else {
      window.location.reload(true);
    }
  };

  const filteredUpdates = updatesList.filter(item => 
    !searchTerm || 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.version.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 font-cairo text-right">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center text-xl shrink-0">
              <Rocket className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">سجل تحديثات المنظومة (خاص بالمشرف)</h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  Changelog
                </span>
              </div>
              <p className="text-[11px] text-slate-500">تتبع حي لكافة التعديلات، الإصلاحات والميزات المضافة</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Server Actions Bar */}
        <div className="py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCheckServer}
              disabled={isChecking}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'جاري الفحص...' : 'فحص السيرفر'}</span>
            </button>
            <button
              type="button"
              onClick={handleHardRefresh}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إفراغ الكاش وإعادة التحميل</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[140px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث في التحديثات..."
              className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2" />
          </div>
        </div>

        {checkResult && (
          <div className="mt-2.5 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{checkResult}</span>
          </div>
        )}

        {/* Updates List */}
        <div className="overflow-y-auto space-y-3 pt-3 flex-1 pr-1">
          {filteredUpdates.map((item, idx) => (
            <div 
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-200 transition-colors space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                    {item.version}
                  </span>
                  <h4 className="text-xs font-extrabold text-slate-900">{item.title}</h4>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0 bg-white/80 px-2 py-0.5 rounded-lg border border-slate-200/60 font-mono" title={item.date}>
                  <Calendar className="w-3 h-3 text-indigo-600" />
                  <span className="font-bold">{formatRelativeTime(item.date)}</span>
                  <span className="text-[10px] text-slate-400">({item.date.split(' ')[1] || item.date})</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                {item.details}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
