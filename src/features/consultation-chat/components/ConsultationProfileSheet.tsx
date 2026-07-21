import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Users, RefreshCw, Loader2, ArrowLeft } from 'lucide-react';
import { KundliProfile } from '../../../types';
import { KundliProfileForm } from './KundliProfileForm';
import { ApiKundliProfileRepository } from '../../../repositories/api/apiKundliProfileRepository';
import { ApiConsultationRepository } from '../../../repositories/api/apiConsultationRepository';

const kundliRepo = new ApiKundliProfileRepository();
const consultationRepo = new ApiConsultationRepository();

interface ConsultationProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  currentProfileId: string | null;
  onProfileSwitched: (newProfileId: string) => void;
}

export default function ConsultationProfileSheet({ isOpen, onClose, sessionId, currentProfileId, onProfileSwitched }: ConsultationProfileSheetProps) {
  const [view, setView] = useState<'info' | 'switch' | 'add'>('info');
  const [profiles, setProfiles] = useState<KundliProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState('');

  const currentProfile = profiles.find(p => p.id === currentProfileId);

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
      setView('info');
      setError('');
    }
  }, [isOpen]);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const allProfiles = await kundliRepo.getAllProfiles();
      setProfiles(allProfiles);
    } catch (err) {
      console.error('Failed to load profiles', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchProfile = async (profileId: string) => {
    if (profileId === currentProfileId) return;
    setSwitching(profileId);
    setError('');
    try {
      await consultationRepo.updateKundliProfile(sessionId, profileId);
      onProfileSwitched(profileId);
      setView('info');
    } catch (err: any) {
      setError(err?.message || 'Failed to switch profile. Session may be ended.');
    } finally {
      setSwitching(null);
    }
  };

  const renderInfoView = () => (
    <div className="flex flex-col h-full px-5 py-6 space-y-6">
      {currentProfile ? (
        <div className="space-y-6">
          <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-100">
            <h3 className="text-[17px] font-black text-neutral-900">{currentProfile.name}</h3>
            <p className="text-neutral-500 text-[12px] font-bold uppercase tracking-wider mt-1">{currentProfile.relation} • {currentProfile.gender}</p>
            
            <div className="mt-5 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-neutral-200/50">
                <span className="text-neutral-500 text-[13px] font-medium">Date of Birth</span>
                <span className="text-neutral-900 text-[14px] font-bold">{currentProfile.dob}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-neutral-200/50">
                <span className="text-neutral-500 text-[13px] font-medium">Time of Birth</span>
                <span className="text-neutral-900 text-[14px] font-bold">{currentProfile.tob}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-neutral-500 text-[13px] font-medium">Birth Place</span>
                <span className="text-neutral-900 text-[14px] font-bold text-right">{currentProfile.birthCity}, {currentProfile.birthState}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setView('switch')}
              className="flex-1 h-12 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-neutral-700 text-[14px] font-bold flex items-center justify-center gap-2 transition-all border-none"
            >
              <RefreshCw size={16} />
              Switch Profile
            </button>
            <button
              onClick={() => setView('add')}
              className="flex-1 h-12 bg-[#FFF5ED] text-[#FF8A00] hover:bg-[#FFE8D6] rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 transition-all border-none"
            >
              <Users size={16} />
              Add Person
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 text-center space-y-4">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400">
            <User size={24} />
          </div>
          <div>
            <p className="text-neutral-900 font-bold">No birth profile is currently shared.</p>
            <p className="text-neutral-500 text-[12.5px] mt-1">Astrologer cannot view birth charts for this session.</p>
          </div>
          <button
            onClick={() => setView('add')}
            className="h-11 px-6 bg-[#FF8A00] rounded-xl text-white text-[13px] font-bold flex items-center gap-2 border-none"
          >
            <Users size={16} />
            Add Birth Profile
          </button>
        </div>
      )}
    </div>
  );

  const renderSwitchView = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center space-x-3 px-5 py-4 border-b border-neutral-100">
        <button onClick={() => setView('info')} className="p-1 -ml-1 text-neutral-700">
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>
        <h3 className="text-[16px] font-black text-neutral-900">Switch Profile</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {error && (
          <div className="text-red-600 text-[12px] font-bold bg-red-50 p-3 rounded-xl border border-red-100 mb-2">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#FF8A00]" /></div>
        ) : (
          profiles.map(p => (
            <button
              key={p.id}
              onClick={() => handleSwitchProfile(p.id)}
              disabled={switching !== null}
              className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                p.id === currentProfileId 
                  ? 'border-[#FF8A00] bg-[#FF8A00]/5' 
                  : 'border-neutral-200 hover:border-[#FF8A00]/40 bg-white'
              }`}
            >
              <div>
                <h4 className="text-[15px] font-bold text-neutral-900">{p.name}</h4>
                <p className="text-[12px] text-neutral-500 font-medium mt-0.5">{p.relation} • {p.dob}</p>
              </div>
              {switching === p.id ? (
                <Loader2 size={18} className="animate-spin text-[#FF8A00]" />
              ) : p.id === currentProfileId ? (
                <div className="text-[10px] font-bold text-[#FF8A00] bg-[#FF8A00]/10 px-2 py-1 rounded">ACTIVE</div>
              ) : null}
            </button>
          ))
        )}
        
        <button
          onClick={() => setView('add')}
          className="w-full mt-2 h-12 bg-neutral-50 hover:bg-neutral-100 rounded-xl border border-neutral-200 border-dashed text-neutral-700 text-[14px] font-bold flex items-center justify-center gap-2 transition-all"
        >
          <Users size={16} />
          Add Another Person
        </button>
      </div>
    </div>
  );

  const renderAddView = () => (
    <div className="flex flex-col h-full bg-[#FCFBF8]">
      <div className="flex items-center space-x-3 px-5 py-4 bg-white border-b border-[#F1EFE9]">
        <button onClick={() => setView(currentProfile ? 'info' : 'switch')} className="p-1 -ml-1 text-neutral-700">
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>
        <h3 className="text-[16px] font-black text-neutral-900">Add Another Person</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto relative">
        <KundliProfileForm 
          onSuccess={async (newProfile) => {
            await loadProfiles();
            await handleSwitchProfile(newProfile.id);
          }}
        />
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-neutral-900/60 z-40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 h-[85vh] bg-white rounded-t-3xl z-50 flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="absolute top-4 right-4 z-50">
              <button onClick={onClose} className="p-2 bg-neutral-100/80 hover:bg-neutral-200 rounded-full text-neutral-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            {view === 'info' && renderInfoView()}
            {view === 'switch' && renderSwitchView()}
            {view === 'add' && renderAddView()}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
