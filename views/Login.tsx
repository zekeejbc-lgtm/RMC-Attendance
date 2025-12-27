
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-brand-950 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold-600/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold-400/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-sm space-y-4 relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/10">
          <div className="bg-gold-gradient p-6 text-center border-b-2 border-brand-900/10">
            <div className="w-16 h-16 bg-brand-900 rounded-xl mx-auto flex items-center justify-center shadow-lg mb-3 border border-gold-400/20">
               <span className="text-gold-400 font-black text-3xl">R</span>
            </div>
            <h2 className="text-lg font-black text-brand-900 uppercase tracking-widest leading-none">Project Regalia</h2>
            <p className="text-brand-800 text-[9px] font-black mt-2 uppercase tracking-[0.3em] opacity-60">Identity Verification</p>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg border border-red-100 flex items-center gap-2 text-[10px] font-bold uppercase">
                <ShieldAlert size={14} /> {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Identifier</label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-lg focus:border-gold-400 focus:outline-none transition-all font-bold text-xs"
                  placeholder="Username / Email"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Key</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-lg focus:border-gold-400 focus:outline-none transition-all font-bold text-xs"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-brand-900"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="!rounded-lg text-[10px] font-black uppercase tracking-widest py-3.5 mt-2 shadow-lg">
                {loading ? <Loader2 className="animate-spin" size={16}/> : 'Connect to Hub'}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-50 space-y-4 text-center">
              <button onClick={() => navigate('/register')} className="w-full py-3 bg-slate-50 text-brand-900 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100">
                Register New Asset
              </button>
              
              <div className="flex flex-col gap-3 items-center">
                 <button onClick={() => alert("Administrative intervention required for key recovery. Contact SSG Unit.")} className="text-[8px] font-black text-slate-400 hover:text-brand-900 uppercase tracking-[0.3em] transition-colors">
                   Forgot Password?
                 </button>
                 <button 
                   onClick={() => setShowTestPanel(!showTestPanel)}
                   className="text-[8px] font-black text-gold-600 hover:text-gold-500 uppercase tracking-widest flex items-center gap-1.5"
                 >
                   Deployment Access {showTestPanel ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
                 </button>
              </div>
            </div>
          </div>
        </div>

        {showTestPanel && (
          <div className="bg-brand-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-2 duration-300">
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
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(acc.user); }}
                    className="p-1.5 text-slate-500 hover:text-gold-400 transition-colors bg-brand-950 rounded-md border border-white/5"
                  >
                    {copied === acc.user ? <Check size={10} className="text-green-500"/> : <Copy size={10}/>}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
