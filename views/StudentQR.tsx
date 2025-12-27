
import React from 'react';
import QRCode from 'react-qr-code';
import { useAuth } from '../components/AuthContext';
import { ShieldCheck, Info } from 'lucide-react';

const StudentQR: React.FC = () => {
  const { profile } = useAuth();

  if (!profile) return null;

  return (
    <div className="p-6 flex flex-col items-center animate-in zoom-in duration-500">
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-brand-900 p-8 text-center border-b-4 border-gold-400">
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Digital Identity</h2>
          <p className="text-gold-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">Project Regalia • Verified</p>
        </div>

        <div className="p-10 flex flex-col items-center">
          <div className="p-6 bg-white border-2 border-gold-100 rounded-[2rem] shadow-inner mb-8">
            <QRCode 
              value={profile.uid} 
              size={200} 
              fgColor="#0E1B42" 
              level="H"
            />
          </div>

          <div className="text-center mb-8">
            <h3 className="text-xl font-bold text-brand-900">{profile.name}</h3>
            <p className="text-slate-400 font-medium text-sm mt-1">{profile.student_id}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="bg-brand-50 text-brand-900 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{profile.school_data.department}</span>
              <span className="bg-gold-50 text-gold-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{profile.school_data.section}</span>
            </div>
          </div>

          <div className="w-full p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center gap-3">
             <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white shrink-0">
                <ShieldCheck size={20} />
             </div>
             <div className="text-left">
                <p className="text-xs font-bold text-green-700">Tamper-Proof System</p>
                <p className="text-[10px] text-green-600 font-medium">This code is cryptographically linked to your RMC account.</p>
             </div>
          </div>
        </div>

        <div className="bg-slate-50 p-6 flex items-start gap-3 border-t border-slate-100">
          <Info size={16} className="text-slate-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-slate-500 italic leading-relaxed">
            Present this code to your Class Mayor or SSG Officer for event verification. Ensure your location permissions are active for the scanner to work.
          </p>
        </div>
      </div>

      <p className="mt-8 text-slate-400 text-xs text-center max-w-xs px-4">
        Rizal Memorial Colleges Student Government <br/>
        Official Attendance Protocol v1.0
      </p>
    </div>
  );
};

export default StudentQR;
