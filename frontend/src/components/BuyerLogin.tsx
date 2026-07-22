import React, { useState } from 'react';
import { Lock, User, Mail, Phone, Store, AlertCircle, X, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { API_BASE_URL } from '../context/AppContext';

interface BuyerLoginProps {
  onClose: () => void;
  onLoginSuccess: (token: string, name: string, email: string, mobile: string) => void;
}

type TabType = 'signin' | 'signup';

export const BuyerLogin: React.FC<BuyerLoginProps> = ({ onClose, onLoginSuccess }) => {
  const [tab, setTab] = useState<TabType>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Sign In fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up fields
  const [regName, setRegName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setError('Please fill in all fields.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/api/customers/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      onLoginSuccess(data.token, data.name, data.email, data.mobile_number);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regMobile || !regEmail || !regPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!/^\d{10}$/.test(regMobile.replace(/\s/g, ''))) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/api/customers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          mobile_number: regMobile,
          email: regEmail,
          password: regPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registration failed');
      onLoginSuccess(data.token, data.name, data.email, data.mobile_number);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
      {/* Backdrop click closes */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Decorative blurs */}
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />

        <div className="relative rounded-2xl border border-white/60 shadow-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px)' }}>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all cursor-pointer z-10"
          >
            <X className="h-4.5 w-4.5" />
          </button>

          {/* Brand Header */}
          <div className="px-8 pt-8 pb-6 text-center">
            <div className="h-12 w-12 rounded-xl border border-gray-200 bg-white shadow-sm flex items-center justify-center overflow-hidden mx-auto mb-3">
              <img src="/logo.jpg" alt="SR Chains Logo" className="h-full w-full object-cover" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-widest text-gray-900 uppercase">SR CHAINS</h2>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-1">Customer Portal</p>
          </div>

          {/* Tab Switcher */}
          <div className="mx-8 mb-6 flex rounded-xl border border-gray-200 p-1 bg-gray-50">
            <button
              onClick={() => { setTab('signin'); setError(null); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                tab === 'signin'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab('signup'); setError(null); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                tab === 'signup'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="px-8 pb-8">
            {/* Error Banner */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Error</span>
                  <p className="text-red-600/90 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* ── SIGN IN FORM ── */}
            {tab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4" autoComplete="off">
                <div className="space-y-1.5">
                  <label className="field-label">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="input pl-10"
                      autoComplete="off"
                    />
                    <Mail className="h-4 w-4 text-gray-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="field-label">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="input pl-10 pr-10"
                      autoComplete="new-password"
                    />
                    <Lock className="h-4 w-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 mt-2 tracking-wider uppercase font-bold text-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Sign In to My Account</span>
                  )}
                </button>

                <p className="text-center text-xs text-gray-500 mt-3">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setTab('signup'); setError(null); }}
                    className="text-gray-900 font-bold hover:underline cursor-pointer"
                  >
                    Sign Up
                  </button>
                </p>
              </form>
            )}

            {/* ── SIGN UP FORM ── */}
            {tab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3.5" autoComplete="off">
                <div className="space-y-1.5">
                  <label className="field-label">Full Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Your full name"
                      className="input pl-10"
                    />
                    <User className="h-4 w-4 text-gray-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="field-label">Mobile Number</label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={regMobile}
                      onChange={(e) => setRegMobile(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="input pl-10"
                      maxLength={10}
                    />
                    <Phone className="h-4 w-4 text-gray-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="field-label">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="input pl-10"
                    />
                    <Mail className="h-4 w-4 text-gray-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="field-label">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="input pl-10 pr-10"
                      autoComplete="new-password"
                    />
                    <Lock className="h-4 w-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="field-label">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      className="input pl-10"
                      autoComplete="new-password"
                    />
                    <Lock className="h-4 w-4 text-gray-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 mt-2 tracking-wider uppercase font-bold text-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Create My Account</span>
                  )}
                </button>

                <p className="text-center text-xs text-gray-500 mt-3">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setTab('signin'); setError(null); }}
                    className="text-gray-900 font-bold hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              </form>
            )}

            <div className="text-center mt-5 text-[11px] text-gray-400 font-medium border-t border-gray-100 pt-4">
              Your data is secure and encrypted. SR Chains respects your privacy.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
