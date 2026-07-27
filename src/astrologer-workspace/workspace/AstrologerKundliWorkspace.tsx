import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, FileText, ScrollText } from 'lucide-react';
import { getWorkspaceData, updatePrivateNotes, WorkspaceData } from './apiAstrologerWorkspace';

interface Props {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  profileId?: string | null;
}

export default function AstrologerKundliWorkspace({ sessionId, isOpen, onClose, profileId }: Props) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    let active = true;

    const fetchWorkspaceData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getWorkspaceData(sessionId);
        if (!active) return;
        setData(res);
        setNotes(res.notes || '');
      } catch (err: any) {
        if (!active) return;
        setError(err.message || 'Failed to load workspace data');
      } finally {
        if (active) setLoading(false);
      }
    };

    if (isOpen) {
      void fetchWorkspaceData();
    }

    return () => {
      active = false;
    };
  }, [isOpen, sessionId, profileId]);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    setSaveMessage('');
    try {
      await updatePrivateNotes(sessionId, notes);
      setSaveMessage('Saved successfully');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (err: any) {
      setSaveMessage('Error saving notes');
    } finally {
      setSavingNotes(false);
    }
  };

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
            className="absolute bottom-0 left-0 right-0 h-[85%] bg-white rounded-t-3xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <h2 className="text-lg font-[900] text-neutral-900 tracking-tight flex items-center space-x-2">
                <ScrollText size={20} className="text-[#FF8A00]" />
                <span>Consultation Workspace</span>
              </h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100 text-neutral-500">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-neutral-50 p-6 space-y-6">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-4 border-[#FF8A00] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold text-center">
                  {error}
                </div>
              ) : (
                <>
                  <section className="space-y-3">
                    <h3 className="text-sm font-black text-neutral-900 uppercase tracking-widest flex items-center space-x-2">
                      <FileText size={16} className="text-neutral-400" />
                      <span>Kundli Profile</span>
                    </h3>
                    {!data?.profile ? (
                      <div className="bg-white border border-neutral-200/60 rounded-xl p-5 text-center text-sm font-semibold text-neutral-500 shadow-sm">
                        No birth profile has been shared for this consultation.
                      </div>
                    ) : (
                      <div className="bg-white border border-neutral-200/60 rounded-xl p-5 shadow-sm space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-neutral-400">Name</span>
                            <p className="text-sm font-black text-neutral-900">{data.profile.name}</p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-neutral-400">Relation</span>
                            <p className="text-sm font-black text-neutral-900 capitalize">{data.profile.relation}</p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-neutral-400">DOB</span>
                            <p className="text-sm font-bold text-neutral-700">{data.profile.dob}</p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-neutral-400">Time</span>
                            <p className="text-sm font-bold text-neutral-700">{data.profile.tob}</p>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-neutral-100">
                          <span className="text-[10px] uppercase font-bold text-neutral-400">Location</span>
                          <p className="text-sm font-bold text-neutral-700 mt-0.5">
                            {data.profile.birth_city}, {data.profile.birth_state}
                          </p>
                        </div>
                      </div>
                    )}
                  </section>

                  {data?.report ? (
                    <section className="space-y-3">
                      <h3 className="text-sm font-black text-neutral-900 uppercase tracking-widest">Astrological Data</h3>
                      <div className="bg-white border border-neutral-200/60 rounded-xl p-5 shadow-sm text-sm font-medium text-neutral-700 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(data.report, null, 2)}
                      </div>
                    </section>
                  ) : (
                    <div className="bg-neutral-50 border border-neutral-200/60 rounded-xl p-4 text-center text-xs font-semibold text-neutral-500">
                      Calculated Kundli report not available yet.
                    </div>
                  )}

                  <section className="space-y-3 pb-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-neutral-900 uppercase tracking-widest">Private Notes</h3>
                      <button
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                        className="text-xs font-bold text-[#FF8A00] flex items-center space-x-1 hover:text-[#E07A00] disabled:opacity-50 transition-colors"
                      >
                        <Save size={14} />
                        <span>{savingNotes ? 'Saving...' : 'Save Notes'}</span>
                      </button>
                    </div>
                    {saveMessage && <p className="text-[10px] font-bold text-green-600 text-right -mt-2">{saveMessage}</p>}
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Type your private consultation observations here... The customer cannot see this."
                      className="w-full h-40 bg-white border border-neutral-200/60 rounded-xl p-4 text-sm font-medium text-neutral-700 focus:outline-none focus:border-[#FF8A00] focus:ring-1 focus:ring-[#FF8A00] resize-none shadow-sm placeholder:text-neutral-400"
                    />
                  </section>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
