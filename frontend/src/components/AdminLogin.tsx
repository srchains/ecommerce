import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, User, AlertCircle, ArrowLeft, ShieldCheck, RotateCcw } from 'lucide-react';

type Step = 'credentials' | 'otp';

export const AdminLogin: React.FC = () => {
  const { login, verifyAdminOtp, resendAdminOtp, navigateTo } = useApp();
  const [step, setStep] = useState<Step>('credentials');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus();
  }, [step]);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError('Please fill in all fields.');
    try {
      setLoading(true);
      setError(null);
      setInfo(null);
      const res = await login(email, password);
      if (res.otpRequired) {
        setMaskedEmail(res.email);
        setStep('otp');
        setResendIn(30);
        setInfo(res.devOtp ? `Dev mode code: ${res.devOtp}` : `We sent a 6-digit code to ${res.email}.`);
      }
    } catch (err: any) {
      setError(err.message || 'Incorrect email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) return setError('Enter the 6-digit code from your email.');
    try {
      setLoading(true);
      setError(null);
      await verifyAdminOtp(email, otp);
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    try {
      setLoading(true);
      setError(null);
      setInfo(await resendAdminOtp(email));
      setResendIn(30);
      setOtp('');
    } catch (err: any) {
      setError(err.message || 'Could not resend the code.');
    } finally {
      setLoading(false);
    }
  };

  const back = () => {
    setStep('credentials');
    setOtp('');
    setError(null);
    setInfo(null);
    setPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-6 relative overflow-hidden select-none">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md backdrop-blur-xl bg-white/70 border border-white/80 shadow-2xl rounded-2xl p-8 relative z-10">
        <button
          onClick={() => (step === 'otp' ? back() : navigateTo('/'))}
          className="absolute top-6 left-6 flex items-center space-x-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{step === 'otp' ? 'Back' : 'Store'}</span>
        </button>

        <div className="flex flex-col items-center text-center mt-6 mb-8">
          <div className="h-12 w-12 rounded-xl border border-gray-200 bg-white shadow-sm flex items-center justify-center overflow-hidden mb-3">
            <img src="/logo.jpg" alt="SR Chains Logo" className="h-full w-full object-cover" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-widest text-gray-900 uppercase">SR CHAINS</h2>
          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-1">Wholesale ERP Portal</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50/80 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2.5">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Authentication Failed</span>
              <p className="text-red-600/90 mt-0.5">{error}</p>
            </div>
          </div>
        )}
        {info && !error && (
          <div className="mb-5 p-3.5 bg-emerald-50/80 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-start gap-2.5">
            <ShieldCheck className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <p className="mt-0.5">{info}</p>
          </div>
        )}

        {step === 'credentials' && (
          <form onSubmit={handleCredentials} className="space-y-5" autoComplete="off">
            <div className="space-y-1.5">
              <label className="field-label">Staff Email</label>
              <div className="relative">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter Email" className="input pl-10" autoComplete="off" />
                <User className="h-4 w-4 text-gray-400 absolute left-3.5 top-3.5" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="field-label">Password</label>
              <div className="relative">
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password" className="input pl-10" autoComplete="new-password" />
                <Lock className="h-4 w-4 text-gray-400 absolute left-3.5 top-3.5" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 mt-2 tracking-wider uppercase font-bold text-xs cursor-pointer flex items-center justify-center gap-2">
              {loading ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>Continue</span>}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerify} className="space-y-5" autoComplete="off">
            <div className="space-y-1.5">
              <label className="field-label">Verification Code</label>
              <div className="relative">
                <input ref={otpRef} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} required
                  value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" className="input pl-10 tracking-[0.5em] font-bold text-center text-lg"
                  autoComplete="one-time-code" />
                <ShieldCheck className="h-4 w-4 text-gray-400 absolute left-3.5 top-4" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Enter the 6-digit code sent to {maskedEmail || 'your email'}.</p>
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 mt-2 tracking-wider uppercase font-bold text-xs cursor-pointer flex items-center justify-center gap-2">
              {loading ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>Verify &amp; Enter Panel</span>}
            </button>
            <button type="button" onClick={handleResend} disabled={loading || resendIn > 0}
              className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider cursor-pointer">
              <RotateCcw className="h-3.5 w-3.5" />
              {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
            </button>
          </form>
        )}

        <div className="text-center mt-6 text-[11px] text-gray-400 font-medium">
          Authorized staff only. Session access is encrypted and logged.
        </div>
      </div>
    </div>
  );
};
