import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Maximize2, Minimize2, Copy, Check, BookOpen, Sparkles, MessageCircle, X } from 'lucide-react';

export default function AiPresentationViewer({ presentation, onClose }) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!presentation || !presentation.slides || presentation.slides.length === 0) {
    return null;
  }

  const slides = presentation.slides;
  const currentSlide = slides[currentSlideIndex];

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const handleCopyAll = () => {
    let text = `📊 ${presentation.title || 'عرض تقديمي'}\n\n`;
    slides.forEach((s, idx) => {
      text += `--- الشريحة ${idx + 1}: ${s.title} ---\n`;
      if (s.keyScripture) text += `📖 الآية: ${s.keyScripture}\n`;
      if (s.bullets) s.bullets.forEach(b => text += `• ${b}\n`);
      if (s.speakerNotes) text += `💡 ملاحظة الخادم: ${s.speakerNotes}\n`;
      text += '\n';
    });
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col justify-between ${isFullscreen ? 'p-2' : 'p-4 sm:p-6'} text-right transition-all`}>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-maroon-800 flex items-center justify-center text-gold-400 font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-100">{presentation.title || 'العرض التقديمي للدرس'}</h3>
            <span className="text-[11px] text-slate-400">الشريحة {currentSlideIndex + 1} من {slides.length}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSpeakerNotes(!showSpeakerNotes)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              showSpeakerNotes ? 'bg-maroon-900/60 border-maroon-700 text-gold-300' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <span>ملاحظات الخادم</span>
          </button>

          <button
            onClick={handleCopyAll}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700 text-xs font-bold flex items-center gap-1"
            title="نسخ محتوى العرض"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700"
            title="ملء الشاشة للـ Data Show"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 transition-all"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Slide Card Area */}
      <div className="flex-1 my-3 flex flex-col justify-center items-center overflow-y-auto px-2">
        <div className="w-full max-w-4xl bg-gradient-to-br from-slate-900 via-slate-900 to-maroon-950/70 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl flex flex-col justify-between min-h-[50vh] sm:min-h-[60vh]">
          {/* Slide Title & Scripture */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-xs font-extrabold text-gold-400 bg-gold-400/10 border border-gold-400/20 px-3 py-1 rounded-full">
                نقطة {currentSlide.slideNumber || currentSlideIndex + 1}
              </span>
              <span className="text-xs text-slate-500 font-mono">{currentSlideIndex + 1} / {slides.length}</span>
            </div>

            <h2 className="text-xl sm:text-3xl font-extrabold text-white leading-tight">
              {currentSlide.title}
            </h2>

            {currentSlide.keyScripture && (
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-3.5 flex items-start gap-2.5 text-amber-200 text-xs sm:text-sm">
                <BookOpen className="w-5 h-5 text-gold-400 shrink-0 mt-0.5" />
                <span className="font-medium italic leading-relaxed">«{currentSlide.keyScripture}»</span>
              </div>
            )}

            {/* Bullets */}
            <div className="space-y-3 pt-2">
              {currentSlide.bullets?.map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-3 text-slate-200 text-sm sm:text-base leading-relaxed bg-slate-800/40 p-3.5 rounded-2xl border border-slate-800/60">
                  <span className="w-2 h-2 rounded-full bg-gold-400 mt-2 shrink-0"></span>
                  <p className="font-medium">{bullet}</p>
                </div>
              ))}
            </div>

            {/* Interactive Group Question */}
            {currentSlide.groupQuestion && (
              <div className="mt-3 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-3 flex items-center gap-2 text-emerald-300 text-xs sm:text-sm">
                <MessageCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                <span><strong>سؤال تفاعلي للمجموعات:</strong> {currentSlide.groupQuestion}</span>
              </div>
            )}
          </div>

          {/* Speaker Notes Drawer (For Servant Only) */}
          {showSpeakerNotes && currentSlide.speakerNotes && (
            <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-gold-300/90 bg-slate-950/60 p-3.5 rounded-2xl border border-gold-500/20">
              <strong className="text-gold-400 block mb-1">💡 تأمل وتوجيه للخادم أثناء الشرح:</strong>
              <p className="leading-relaxed">{currentSlide.speakerNotes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl px-5 py-3">
        <button
          onClick={handleNext}
          disabled={currentSlideIndex >= slides.length - 1}
          className="bg-maroon-800 hover:bg-maroon-700 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all disabled:cursor-not-allowed shadow-md"
        >
          <ChevronRight className="w-4 h-4" />
          <span>الشريحة التالية</span>
        </button>

        {/* Slide Dots / Indicator */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-[200px] sm:max-w-md py-1">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlideIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentSlideIndex ? 'w-6 bg-gold-400' : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handlePrev}
          disabled={currentSlideIndex === 0}
          className="bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/50 disabled:text-slate-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all disabled:cursor-not-allowed"
        >
          <span>الشريحة السابقة</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
