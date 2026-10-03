import React from 'react';
import { AlertTriangle, RefreshCw, Send, CheckCircle2, ShieldAlert } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      reportSent: false,
      sendingReport: false,
      sendErrorMsg: ''
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('App Caught Error via ErrorBoundary:', error, errorInfo);
  }

  handleSendReport = async () => {
    this.setState({ sendingReport: true, sendErrorMsg: '' });
    try {
      const { error, errorInfo } = this.state;
      const currentUser = this.props.currentUser || null;

      const payload = {
        errorMessage: error?.message || 'Unknown Error',
        errorName: error?.name || 'Error',
        errorStack: error?.stack || '',
        componentStack: errorInfo?.componentStack || '',
        userAgent: navigator?.userAgent || 'Unknown Device',
        screenWidth: window?.innerWidth || 0,
        screenHeight: window?.innerHeight || 0,
        platform: navigator?.platform || '',
        user: currentUser ? {
          id: currentUser.id || '',
          fullName: currentUser.fullName || 'غير معروف',
          phone: currentUser.phone || '',
          role: currentUser.role || ''
        } : { guest: true },
        url: window.location.href,
        status: 'unresolved',
        createdAt: serverTimestamp(),
        timestampFormatted: new Date().toLocaleString('ar-EG')
      };

      await addDoc(collection(db, 'app_errors'), payload);
      this.setState({ reportSent: true, sendingReport: false });
    } catch (err) {
      console.error('Failed to log error to Firestore:', err);
      this.setState({ 
        sendingReport: false, 
        sendErrorMsg: 'تعذر الاتصال بقاعدة البيانات، يمكنك نسخ تفاصيل الخطأ يدوياً.' 
      });
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, reportSent, sendingReport, sendErrorMsg } = this.state;

      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-cairo text-right" dir="rtl">
          <div className="w-full max-w-md bg-slate-800/90 border border-gold-400/30 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-6">
            {/* Header Icon */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white">
                عفواً، حدث خطأ غير متوقع!
              </h2>
              <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                أسرة إعداد خدام بولس الرسول وأليشع النبي تسعى دائماً لراحتكم. يمكنك إرسال تقرير الخطأ لنقوم بحله فوراً.
              </p>
            </div>

            {/* Error Message Box */}
            <div className="bg-slate-950/70 border border-slate-700/60 rounded-2xl p-3 text-xs font-mono text-red-300 break-all select-all max-h-32 overflow-y-auto">
              <span className="text-gold-400 font-bold block mb-1 font-cairo">نص الخطأ:</span>
              {error?.message || 'حدث استثناء غير معروف في النظام.'}
            </div>

            {/* Status Messages */}
            {reportSent ? (
              <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 p-3.5 rounded-2xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="font-bold">
                  تم إرسال تقرير الخطأ بنجاح إلى المشرف! سيتم مراجعته وإصلاحه قريباً. 🙏
                </span>
              </div>
            ) : sendErrorMsg ? (
              <div className="bg-red-950/60 border border-red-500/40 text-red-300 p-3 rounded-2xl text-xs">
                {sendErrorMsg}
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {!reportSent ? (
                <button
                  type="button"
                  onClick={this.handleSendReport}
                  disabled={sendingReport}
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-gold-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-maroon-950 font-black rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Send className={`w-4 h-4 ${sendingReport ? 'animate-spin' : ''}`} />
                  <span>{sendingReport ? 'جاري إرسال التقرير...' : 'إرسال تقرير الخطأ (Send Error)'}</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer border border-slate-600"
              >
                <RefreshCw className="w-4 h-4 text-gold-300" />
                <span>إعادة تحميل التطبيق (Reload App)</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
