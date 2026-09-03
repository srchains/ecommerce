import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { UserPlus, ShieldCheck, User, Mail, Lock, Check, AlertCircle, Power } from 'lucide-react';
import { API_BASE_URL, useApp } from '../context/AppContext';

interface Staff {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  active: boolean;
  created_at: string;
}

export const AdminStaffManager: React.FC = () => {
  const { adminRole } = useApp();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/auth/staff`);
      setStaff(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not load staff accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const flash = (msg: string) => { setOk(msg); setTimeout(() => setOk(null), 3000); };

  const addEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError('Name, a valid email, and a password of at least 6 characters are required.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await axios.post(`${API_BASE_URL}/api/auth/staff`, { name: name.trim(), email: email.trim(), password });
      setName(''); setEmail(''); setPassword('');
      flash('Employee account created.');
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not create the employee account.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s: Staff) => {
    try {
      setError(null);
      if (s.active) {
        await axios.delete(`${API_BASE_URL}/api/auth/staff/${s.id}`);
        flash(`${s.name} deactivated.`);
      } else {
        await axios.patch(`${API_BASE_URL}/api/auth/staff/${s.id}`, { active: true });
        flash(`${s.name} reactivated.`);
      }
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not update the account.');
    }
  };

  if (adminRole !== 'admin') {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Only the primary admin can manage staff accounts.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8">
      <div className="border-b border-gray-200 pb-5">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-6 w-6 text-amber-600" />
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Staff Accounts</h1>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Add employees who can manage the store. Employees can do everything except manage staff.
          Deactivating keeps the record and blocks login.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
        </div>
      )}
      {ok && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" /><span>{ok}</span>
        </div>
      )}

      {/* Add employee */}
      <form onSubmit={addEmployee} className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
          <UserPlus className="h-4.5 w-4.5 text-amber-600" /><span>Add Employee</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name"
              className="input pl-9 text-sm" />
            <User className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
          </div>
          <div className="relative">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
              className="input pl-9 text-sm" autoComplete="off" />
            <Mail className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
          </div>
          <div className="relative">
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temp password (min 6)"
              className="input pl-9 text-sm" autoComplete="new-password" />
            <Lock className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer disabled:opacity-50">
          {saving ? 'Adding…' : 'Add Employee'}
        </button>
        <p className="text-[11px] text-gray-400">
          Share the email + temp password with the employee. They'll get an email code on first login and can change the password later.
        </p>
      </form>

      {/* Staff list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 text-sm font-extrabold text-gray-900">
          All Staff ({staff.length})
        </div>
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading…</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900 truncate">{s.name}</p>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      s.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
                    }`}>{s.role}</span>
                    {!s.active && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700">inactive</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{s.email}</p>
                </div>
                {s.role !== 'admin' && (
                  <button
                    onClick={() => toggleActive(s)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border transition-all ${
                      s.active
                        ? 'text-red-600 border-red-200 hover:bg-red-50'
                        : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {s.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
