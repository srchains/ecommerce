import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, User, AlertCircle, ArrowLeft } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const { login, navigateTo } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Incorrect email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-6 relative overflow-hidden select-none">
      {/* Dynamic Background Blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md backdrop-blur-xl bg-white/70 border border-white/80 shadow-2xl rounded-2xl p-8 relative z-10 transition-all duration-300 hover:shadow-emerald-500/5">
        
        {/* Back Button */}
        <button 
          onClick={() => navigateTo('/')}
          className="absolute top-6 left-6 flex items-center space-x-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Store</span>
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mt-6 mb-8">
          <div className="h-12 w-12 rounded-xl border border-gray-200 bg-white shadow-sm flex items-center justify-center overflow-hidden mb-3">
            <img src="/logo.jpg" alt="SR Chains Logo" className="h-full w-full object-cover" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-widest text-gray-900 uppercase">SR CHAINS</h2>
          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-1">Wholesale ERP Portal</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50/80 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2.5 animate-pulse">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Authentication Failed</span>
              <p className="text-red-600/90 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
          {/* Email field */}
          <div className="space-y-1.5">
            <label className="field-label">Admin Email</label>
            <div className="relative">
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="srchains19@gmail.com" 
                className="input pl-10"
                autoComplete="off"
              />
              <User className="h-4 w-4 text-gray-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="field-label">Password</label>
            </div>
            <div className="relative">
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="srchains195757" 
                className="input pl-10"
                autoComplete="new-password"
              />
              <Lock className="h-4 w-4 text-gray-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 mt-2 tracking-wider uppercase font-bold text-xs cursor-pointer select-none transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>Enter Admin Panel</span>
            )}
          </button>
        </form>

        <div className="text-center mt-6 text-[11px] text-gray-400 font-medium">
          Authorized staff only. Session access is encrypted and logged.
        </div>
      </div>
    </div>
  );
};
