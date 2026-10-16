import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, AlertTriangle, RefreshCw, QrCode } from 'lucide-react';

export default function AttendanceCameraScanner({ onScanSuccess, isAccessAllowed, isVerifying, scanError }) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const scanLoop = async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const video = videoRef.current;
    let detected = null;

    // 1. Native BarcodeDetector (Chrome Android & Modern Mobile Browsers)
    if ('BarcodeDetector' in window) {
      try {
        const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const codes = await barcodeDetector.detect(video);
        if (codes && codes.length > 0 && codes[0].rawValue) {
          detected = codes[0].rawValue;
        }
      } catch (e) {
        // Fallback to jsQR
      }
    }

    // 2. Fallback to jsQR canvas decode
    if (!detected && window.jsQR) {
      try {
        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas');
        }
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = window.jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'dontInvert'
        });
        if (code && code.data) {
          detected = code.data;
        }
      } catch (canvasErr) {
        // Continue loop
      }
    }

    if (detected) {
      stopCamera();
      if (onScanSuccess) {
        onScanSuccess(detected);
      }
      return;
    }

    animFrameRef.current = requestAnimationFrame(scanLoop);
  };

  const startCamera = async () => {
    setCameraError('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('المتصفح لا يدعم الوصول للكاميرا، يرجى استخدام الكود الرقمي السريع بالأسفل.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      });
      streamRef.current = stream;
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        animFrameRef.current = requestAnimationFrame(scanLoop);
      }
    } catch (err) {
      console.warn('Camera start error:', err);
      setCameraError('تعذر فتح الكاميرا، يرجى التأكد من السماح بإذن الكاميرا أو استخدام الكود الرقمي.');
      setIsCameraActive(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Camera Viewfinder Box */}
      <div className="relative bg-slate-900 border-2 border-slate-200 rounded-2xl h-64 sm:h-72 flex flex-col items-center justify-center overflow-hidden shadow-inner">
        {isVerifying ? (
          <div className="flex flex-col items-center gap-3 text-white">
            <RefreshCw className="w-10 h-10 text-gold-400 animate-spin" />
            <span className="text-xs font-bold">جاري التحقق من الكود ورصد الحضور...</span>
          </div>
        ) : isCameraActive ? (
          <div className="relative w-full h-full bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover"
            />
            {/* Viewfinder Target Reticle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-gold-400/90 rounded-3xl relative shadow-2xl">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-gold-400 rounded-tl-xl" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-gold-400 rounded-tr-xl" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-gold-400 rounded-bl-xl" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-gold-400 rounded-br-xl" />
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-gold-400 to-transparent top-1/2 -translate-y-1/2 animate-pulse" />
              </div>
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={stopCamera}
              className="absolute top-3 left-3 bg-slate-950/80 hover:bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/20 backdrop-blur-md flex items-center gap-1 cursor-pointer shadow-lg"
            >
              <X className="w-3.5 h-3.5" />
              <span>إلغاء</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5 text-center px-4 bg-slate-50 w-full h-full justify-center">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-maroon-800 border border-slate-200 shadow-sm">
              <QrCode className="w-8 h-8" />
            </div>
            <p className="text-xs font-bold text-slate-700">
              اضغط على الزر بالأسفل لفتح الكاميرا ومسح كود القاعة
            </p>
            <p className="text-[11px] text-slate-400">
              وجه الكاميرا نحو شاشة هاتف الخادم أو الشيت المطبوع
            </p>
          </div>
        )}
      </div>

      {/* Errors */}
      {scanError && (
        <div className="p-2.5 rounded-xl text-xs font-bold text-red-700 bg-red-50 border border-red-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{scanError}</span>
        </div>
      )}

      {cameraError && (
        <div className="p-2.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Trigger Button */}
      {isCameraActive ? (
        <button
          type="button"
          onClick={stopCamera}
          className="w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-98"
        >
          <X className="w-4 h-4" />
          <span>إغلاق الكاميرا</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={startCamera}
          disabled={!isAccessAllowed || isVerifying}
          className={`w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
            isAccessAllowed
              ? 'bg-maroon-800 hover:bg-maroon-900 text-white shadow-md active:scale-98 cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Camera className="w-4 h-4 text-gold-300" />
          <span>فتح الكاميرا ومسح الباركود</span>
        </button>
      )}
    </div>
  );
}
