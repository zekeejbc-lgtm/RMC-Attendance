
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import Button from '../components/ui/Button';
import { 
  ShieldAlert, 
  UserPlus, 
  LogIn, 
  Database, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check,
  Eye,
  EyeOff,
  Loader2,
  Sparkles
} from 'lucide-react';
import { TEST_ACCOUNTS } from '../lib/seed';
import { mockAuth, mockSeed, getDB } from '../lib/mockBackend';
import ThemeToggle from '../components/ui/ThemeToggle';
import { Collapsible } from '../components/ui/Collapsible';

const Login: React.FC = () => {
  const { isMock, user } = useAuth();
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  useEffect(() => {
    if (isMock) {
      const currentDB = getDB();
      if (Object.keys(currentDB.users).length === 0) {
        mockSeed();
      }
      setShowTestPanel(true);
    }
  }, [isMock]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      if (isMock) {
        await mockAuth.signIn(identifier, password);
        navigate('/dashboard');
      } else {
        let email = identifier;
        if (!identifier.includes('@')) {
          const usernameRef = ref(db, `usernames/${identifier.toLowerCase()}`);
          const snapshot = await get(usernameRef);
          if (snapshot.exists()) {
            email = snapshot.val();
          } else {
            throw new Error("Username not found.");
          }
        }
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in.');
      setLoading(false);
    }
  };

  const quickLogin = (user: string) => {
    setIdentifier(user);
    setPassword('password123');
    setError('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="relative flex min-h-dvh items-start justify-center overflow-x-hidden bg-brand-950 px-4 py-6 pt-20 sm:items-center sm:px-6 sm:py-10">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <div className="pointer-events-none absolute left-0 top-0 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-600/10 blur-3xl"></div>
      <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 translate-x-1/2 translate-y-1/2 rounded-full bg-gold-400/10 blur-3xl"></div>

      <div className="w-full max-w-sm space-y-4 relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          <div className="bg-brand-gradient p-6 text-center border-b-2 border-emerald-500/20">
            <img 
              src="https://i.imgur.com/K3T5yIT.jpeg" 
              alt="IARS Academic Seal" 
              className="w-20 h-20 rounded-full object-cover mx-auto shadow-xl mb-3 ring-4 ring-gold-400/40" 
            />
            <h2 className="text-base font-black text-white uppercase tracking-wide leading-tight">Institution Attendance & Records System</h2>
            <p className="text-gold-300 text-[9px] font-black mt-2 uppercase tracking-[0.3em]">Identity Verification</p>
          </div>

          <div className="bg-white p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
            {error && (
              <div aria-live="polite" role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-[10px] font-bold uppercase text-red-600 dark:border-red-900/70 dark:bg-red-950/50 dark:text-red-300">
                <ShieldAlert size={14} /> {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="login-identifier" className="ml-1 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Asset Identifier / Email</label>
                <input
                  id="login-identifier"
                  aria-label="Asset Identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIdentifier(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-base font-bold text-brand-900 transition-all placeholder:text-slate-400 focus:border-gold-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                  placeholder="Email"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="login-password" className="ml-1 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Security Key</label>
                <div className="relative">
                  <input
                    id="login-password"
                    aria-label="Security Key"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3.5 pr-12 text-base font-bold text-brand-900 transition-all placeholder:text-slate-400 focus:border-gold-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                    placeholder="••••••••"
                  />
                  <button
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-900 dark:text-slate-400 dark:hover:text-gold-400"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="!rounded-lg text-[10px] font-black uppercase tracking-widest py-3.5 mt-2 shadow-lg">
                {loading ? <Loader2 className="animate-spin" size={16}/> : 'Log In'}
              </Button>
            </form>

            <div className="mt-6 space-y-4 border-t border-slate-200 pt-5 text-center dark:border-slate-800">
              <button onClick={() => navigate('/register')} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 text-[9px] font-black uppercase tracking-widest text-brand-900 transition-all hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                Register
              </button>
              
              <div className="flex flex-col gap-3 items-center">
                 <button onClick={() => alert("Administrative intervention required for key recovery. Contact SSG Unit.")} className="text-[8px] font-black text-slate-400 hover:text-brand-900 uppercase tracking-[0.3em] transition-colors dark:text-slate-400 dark:hover:text-gold-400">
                  Forgot?
                 </button>
                 <button 
                   aria-controls="login-test-accounts"
                   aria-expanded={showTestPanel}
                   onClick={() => setShowTestPanel(!showTestPanel)}
                   className="text-[8px] font-black text-gold-600 hover:text-gold-500 uppercase tracking-widest flex items-center gap-1.5"
                 >
                  Tests <ChevronDown className="app-disclosure-chevron" size={10}/>
                 </button>
              </div>
            </div>
          </div>
        </div>

        <Collapsible id="login-test-accounts" open={showTestPanel} innerClassName="rounded-2xl border border-white/10 bg-brand-900/90 p-4 shadow-2xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95">
            <h3 className="text-gold-400 text-[8px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
              <Sparkles size={10}/> Credential Vault
            </h3>
            <div className="space-y-1.5">
              {TEST_ACCOUNTS.map((acc) => (
                <div key={acc.user} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors group cursor-pointer" onClick={() => quickLogin(acc.user)}>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-white leading-none">{acc.name}</p>
                    <p className="text-[7px] text-gold-500 font-black uppercase mt-0.5 tracking-widest opacity-60">{acc.role}</p>
                  </div>
                  <button 
                    aria-label={`Copy username ${acc.user}`}
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); copyToClipboard(acc.user); }}
                    className="p-1.5 text-slate-500 hover:text-gold-400 transition-colors bg-brand-950 rounded-md border border-white/5"
                  >
                    {copied === acc.user ? <Check size={10} className="text-green-500"/> : <Copy size={10}/>}
                  </button>
                </div>
              ))}
            </div>
        </Collapsible>
      </div>
    </div>
  );
};

export default Login;
