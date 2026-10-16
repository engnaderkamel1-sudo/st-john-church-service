import React from 'react';
import { ShieldAlert, ArrowRight, ArrowLeft } from 'lucide-react';
import RegisterStepperBar from './RegisterStepperBar';
import RegisterStepAccount from './RegisterStepAccount';
import RegisterStepPersonal from './RegisterStepPersonal';
import RegisterStepSocial from './RegisterStepSocial';

export default function RegisterForm({
  currentStep,
  handleNextStep,
  handlePrevStep,
  role,
  setRole,
  fullName,
  setFullName,
  email,
  setEmail,
  phone,
  setPhone,
  password,
  setPassword,
  grade,
  setGrade,
  photoUrl,
  setPhotoUrl,
  gender,
  setGender,
  birthDate,
  setBirthDate,
  confessionFather,
  setConfessionFather,
  confessionChurch,
  setConfessionChurch,
  address,
  setAddress,
  education,
  setEducation,
  job,
  setJob,
  maritalStatus,
  setMaritalStatus,
  childrenCount,
  setChildrenCount,
  loading,
  checkingStep1,
  error,
  handleSubmit,
  onSwitchToLogin
}) {
  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Stepper indicator */}
      <RegisterStepperBar currentStep={currentStep} />

      {/* Step 1: Account & Credentials */}
      {currentStep === 1 && (
        <RegisterStepAccount
          role={role}
          setRole={setRole}
          fullName={fullName}
          setFullName={setFullName}
          email={email}
          setEmail={setEmail}
          phone={phone}
          setPhone={setPhone}
          password={password}
          setPassword={setPassword}
          grade={grade}
          setGrade={setGrade}
        />
      )}

      {/* Step 2: Personal & Church Info */}
      {currentStep === 2 && (
        <RegisterStepPersonal
          photoUrl={photoUrl}
          setPhotoUrl={setPhotoUrl}
          gender={gender}
          setGender={setGender}
          birthDate={birthDate}
          setBirthDate={setBirthDate}
          confessionFather={confessionFather}
          setConfessionFather={setConfessionFather}
          confessionChurch={confessionChurch}
          setConfessionChurch={setConfessionChurch}
          address={address}
          setAddress={setAddress}
        />
      )}

      {/* Step 3: Work, Education & Social Status */}
      {currentStep === 3 && (
        <RegisterStepSocial
          education={education}
          setEducation={setEducation}
          job={job}
          setJob={setJob}
          maritalStatus={maritalStatus}
          setMaritalStatus={setMaritalStatus}
          childrenCount={childrenCount}
          setChildrenCount={setChildrenCount}
          role={role}
        />
      )}

      {/* Action buttons */}
      <div className="pt-2 space-y-2">
        {currentStep < 3 ? (
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                disabled={checkingStep1}
                onClick={handlePrevStep}
                className="w-1/3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>السابق</span>
              </button>
            )}
            <button
              type="button"
              disabled={checkingStep1}
              onClick={handleNextStep}
              className="flex-1 bg-maroon-800 hover:bg-maroon-700 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs"
            >
              {checkingStep1 ? (
                <span>جاري التحقق من البيانات... ⏳</span>
              ) : (
                <>
                  <span>{currentStep === 1 ? 'متابعة: البيانات الشخصية' : 'متابعة: الدراسة والعمل'}</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevStep}
              className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>السابق</span>
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-maroon-800 hover:bg-maroon-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs"
            >
              {loading ? <span>جاري تسجيل الحساب...</span> : <span>تأكيد إنشاء الحساب 🚀</span>}
            </button>
          </div>
        )}
      </div>

      {/* Toggle to Login */}
      <div className="text-center pt-1">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-xs text-maroon-800 hover:text-maroon-900 font-semibold underline"
        >
          لديك حساب بالفعل؟ تسجيل الدخول
        </button>
      </div>
    </form>
  );
}
