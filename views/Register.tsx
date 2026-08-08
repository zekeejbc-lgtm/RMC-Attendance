
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import Button from '../components/ui/Button';
import { mockData } from '../lib/mockBackend';
import { SchoolNode } from '../types';
import CustomSelect from '../components/ui/CustomSelect';
import ThemeToggle from '../components/ui/ThemeToggle';
import { 
  User, School, Shield, ChevronRight, ChevronLeft, 
  Camera, CheckCircle2, AlertCircle, ImageIcon, Upload, CreditCard,
  UserCircle
} from 'lucide-react';

const Register: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [structure, setStructure] = useState<SchoolNode[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolNode | null>(null);
  const [selectedDept, setSelectedDept] = useState<SchoolNode | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<SchoolNode | null>(null);
  const [selectedStrand, setSelectedStrand] = useState<SchoolNode | null>(null);
  const [selectedLvl, setSelectedLvl] = useState<SchoolNode | null>(null);
  const [selectedSec, setSelectedSec] = useState<SchoolNode | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    student_id: '',
    guardianName: '',
    guardianPhone: '',
    profilePic: '',
    idFront: '',
    idBack: ''
  });

  useEffect(() => {
    setStructure(mockData.getSchoolStructure());
  }, []);

  const isSHS = selectedDept?.name.toLowerCase().includes('senior');

  const handleFileUpload = (field: string) => {
    // Mocking file capture for this environment
    setFormData(prev => ({ ...prev, [field]: `https://picsum.photos/400/400?sig=${field}_${Math.random()}` }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    const uid = `user_${Date.now()}`;
    const profile: any = {
      uid,
      name: formData.name,
      username: formData.username,
      email: formData.email,
      student_id: formData.student_id,
      role: 'student',
      photo_url: formData.profilePic || `https://i.pravatar.cc/150?u=${uid}`,
      school_data: {
        type: selectedDept?.name.toLowerCase().includes('high') ? 'High School' : 'College',
        department: selectedDept?.name,
        track: selectedTrack?.name,
        strand: selectedStrand?.name,
        level: selectedLvl?.name,
        section: selectedSec?.name,
        school_id: selectedSchool?.id
      }
    };

    mockData.submitApplication(profile);
    localStorage.setItem('rmc_mock_session', uid);
    window.dispatchEvent(new Event('rmc_auth_update'));
    navigate('/register/status');
  };

  return (
    <div className="min-h-screen bg-brand-950 flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-500 border border-white/10">
        <div className="bg-brand-gradient p-6 text-white flex justify-between items-center border-b-2 border-emerald-500">
          <div className="flex items-center gap-3">
            <img 
              src="https://i.imgur.com/K3T5yIT.jpeg" 
              alt="IARS Academic Seal" 
              className="w-11 h-11 rounded-full object-cover ring-2 ring-gold-400/50 shadow-md shrink-0" 
            />
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">System Enrollment</h2>
              <p className="text-emerald-300 text-[9px] font-bold tracking-widest uppercase mt-0.5">Stage {step} of 3 • Protocol</p>
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-8 space-y-6">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="flex flex-col items-center mb-4">
                <button 
                  onClick={() => handleFileUpload('profilePic')}
                  className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-gold-400 hover:bg-gold-50 transition-all overflow-hidden relative group"
                >
                  {formData.profilePic ? (
                    <img src={formData.profilePic} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <UserCircle size={28} />
                      <span className="text-[7px] font-black uppercase mt-1">Profile Photo</span>
                    </>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={20} className="text-white" />
                  </div>
                </button>
                <p className="text-[7px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Digital Identity Picture</p>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-400 ml-1 tracking-widest">Legal Full Name</label>
                <input placeholder="Ex. Juan Dela Cruz" className="w-full p-3.5 bg-slate-50 rounded-xl border border-slate-100 focus:border-gold-400 outline-none font-bold text-xs" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-slate-400 ml-1 tracking-widest">Username</label>
                  <input placeholder="Choose alias" className="w-full p-3.5 bg-slate-50 rounded-xl border border-slate-100 focus:border-gold-400 outline-none font-bold text-xs" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-slate-400 ml-1 tracking-widest">Email Address</label>
                  <input placeholder="name@email.com" type="email" className="w-full p-3.5 bg-slate-50 rounded-xl border border-slate-100 focus:border-gold-400 outline-none font-bold text-xs" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-400 ml-1 tracking-widest">Security Key</label>
                <input placeholder="••••••••" type="password" className="w-full p-3.5 bg-slate-50 rounded-xl border border-slate-100 focus:border-gold-400 outline-none font-bold text-xs" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-400 ml-1 tracking-widest">Official Student ID #</label>
                <input placeholder="2024-XXXXX" className="w-full p-3.5 bg-slate-50 rounded-xl border border-slate-100 focus:border-gold-400 outline-none font-bold text-xs" value={formData.student_id} onChange={e => setFormData({...formData, student_id: e.target.value})} />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <CustomSelect 
                  label="Campus Location"
                  options={structure.map(s => ({ value: s.id, label: s.name }))}
                  value={selectedSchool?.id || ''}
                  onChange={val => {
                    const s = structure.find(x => x.id === val);
                    setSelectedSchool(s || null);
                    setSelectedDept(null); setSelectedTrack(null); setSelectedStrand(null); setSelectedLvl(null); setSelectedSec(null);
                  }}
                  placeholder="Select Campus"
                />

                {selectedSchool && (
                  <CustomSelect 
                    label="Academic Department"
                    options={selectedSchool.children?.map(d => ({ value: d.id, label: d.name })) || []}
                    value={selectedDept?.id || ''}
                    onChange={val => {
                      const d = selectedSchool.children?.find(x => x.id === val);
                      setSelectedDept(d || null);
                      setSelectedTrack(null); setSelectedStrand(null); setSelectedLvl(null); setSelectedSec(null);
                    }}
                    placeholder="Select Department"
                  />
                )}

                {isSHS && selectedDept && (
                  <div className="grid grid-cols-2 gap-2">
                    <CustomSelect 
                      label="Track"
                      options={selectedDept.children?.map(t => ({ value: t.id, label: t.name })) || []}
                      value={selectedTrack?.id || ''}
                      onChange={val => {
                        const t = selectedDept.children?.find(x => x.id === val);
                        setSelectedTrack(t || null); setSelectedStrand(null); setSelectedLvl(null); setSelectedSec(null);
                      }}
                      placeholder="Select Track"
                    />
                    {selectedTrack && (
                      <CustomSelect 
                        label="Strand"
                        options={selectedTrack.children?.map(s => ({ value: s.id, label: s.name })) || []}
                        value={selectedStrand?.id || ''}
                        onChange={val => {
                          const s = selectedTrack.children?.find(x => x.id === val);
                          setSelectedStrand(s || null); setSelectedLvl(null); setSelectedSec(null);
                        }}
                        placeholder="Select Strand"
                      />
                    )}
                  </div>
                )}

                {((!isSHS && selectedDept) || (isSHS && selectedStrand)) && (
                  <div className="grid grid-cols-2 gap-2">
                    <CustomSelect 
                      label="Year Level"
                      options={(isSHS ? selectedStrand : selectedDept)?.children?.map(l => ({ value: l.id, label: l.name })) || []}
                      value={selectedLvl?.id || ''}
                      onChange={val => {
                        const parent = isSHS ? selectedStrand : selectedDept;
                        const l = parent?.children?.find(x => x.id === val);
                        setSelectedLvl(l || null); setSelectedSec(null);
                      }}
                      placeholder="Select Level"
                    />
                    {selectedLvl && (
                      <CustomSelect 
                        label="Class Section"
                        options={selectedLvl.children?.map(s => ({ value: s.id, label: s.name })) || []}
                        value={selectedSec?.id || ''}
                        onChange={val => {
                          const s = selectedLvl.children?.find(x => x.id === val);
                          setSelectedSec(s || null);
                        }}
                        placeholder="Select Section"
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <button onClick={() => handleFileUpload('idFront')} className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-gold-400 hover:bg-gold-50 transition-all aspect-video">
                   {formData.idFront ? <img src={formData.idFront} className="w-full h-full object-cover rounded-lg" /> : <><CreditCard size={20} /><span className="text-[7px] font-black uppercase mt-1">ID Front Capture</span></>}
                </button>
                <button onClick={() => handleFileUpload('idBack')} className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-gold-400 hover:bg-gold-50 transition-all aspect-video">
                   {formData.idBack ? <img src={formData.idBack} className="w-full h-full object-cover rounded-lg" /> : <><CreditCard size={20} /><span className="text-[7px] font-black uppercase mt-1">ID Back Capture</span></>}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
               <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center gap-4">
                  <Shield size={32} className="text-brand-900" />
                  <div>
                    <h4 className="text-[10px] font-black text-brand-900 uppercase">Guardian Protocol</h4>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Institutional Safety Directive</p>
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-400 ml-1 tracking-widest">Guardian Name</label>
                    <input placeholder="Legal Full Name" className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 font-bold text-xs" value={formData.guardianName} onChange={e => setFormData({...formData, guardianName: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-400 ml-1 tracking-widest">Emergency Contact #</label>
                    <input placeholder="+63 9XX XXX XXXX" className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 font-bold text-xs" value={formData.guardianPhone} onChange={e => setFormData({...formData, guardianPhone: e.target.value})} />
                  </div>
               </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            {step > 1 && (
              <Button variant="secondary" className="!w-16 !p-0 !rounded-xl" onClick={() => setStep(step - 1)}>
                <ChevronLeft size={20} />
              </Button>
            )}
            {step < 3 ? (
              <Button className="!rounded-xl text-[10px] uppercase font-black tracking-widest" onClick={() => setStep(step + 1)} disabled={step === 2 && (!selectedSec || !formData.idFront || !formData.idBack)}>
                Proceed to Phase {step === 1 ? 'II' : 'III'}
              </Button>
            ) : (
              <Button variant="gold" className="!rounded-xl text-[10px] uppercase font-black tracking-widest" onClick={handleSubmit} disabled={loading || !formData.guardianName || !formData.guardianPhone}>
                {loading ? 'Submitting...' : 'Establish Registry'}
              </Button>
            )}
          </div>

          <div className="text-center pt-2">
            <button onClick={() => navigate('/login')} className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] hover:text-brand-900 transition-colors">
              Already have an account? <span className="text-gold-500 underline decoration-2">Log in here!</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
