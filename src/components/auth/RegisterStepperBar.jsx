import React from 'react';

export default function RegisterStepperBar({ currentStep }) {
  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
        <div 
          className="absolute top-1/2 right-4 h-0.5 bg-maroon-700 -translate-y-1/2 z-0 transition-all duration-300"
          style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
        />

        {/* Step 1 Pill */}
        <div className="relative z-10 flex flex-col items-center">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            currentStep >= 1 ? 'bg-maroon-800 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
          }`}>
            1
          </div>
          <span className={`text-[10px] mt-1 font-bold ${currentStep === 1 ? 'text-maroon-900' : 'text-slate-500'}`}>
            الحساب
          </span>
        </div>

        {/* Step 2 Pill */}
        <div className="relative z-10 flex flex-col items-center">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            currentStep >= 2 ? 'bg-maroon-800 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
          }`}>
            2
          </div>
          <span className={`text-[10px] mt-1 font-bold ${currentStep === 2 ? 'text-maroon-900' : 'text-slate-500'}`}>
            الشخصية
          </span>
        </div>

        {/* Step 3 Pill */}
        <div className="relative z-10 flex flex-col items-center">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            currentStep === 3 ? 'bg-maroon-800 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
          }`}>
            3
          </div>
          <span className={`text-[10px] mt-1 font-bold ${currentStep === 3 ? 'text-maroon-900' : 'text-slate-500'}`}>
            الاجتماعية
          </span>
        </div>
      </div>
    </div>
  );
}
