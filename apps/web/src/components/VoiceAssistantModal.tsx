import React, { useState } from 'react';
import { PhoneCall, PhoneOff, Mic, Send, Volume2, ShieldCheck, AlertCircle } from 'lucide-react';
import { VoiceSession, VoiceLanguage, VoiceUtterance } from '@razorrecover/shared-types';

interface VoiceAssistantModalProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({ caseId, isOpen, onClose }) => {
  const [language, setLanguage] = useState<VoiceLanguage>('HINGLISH');
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [utterance, setUtterance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const startCall = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/voice/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-merchant-id': 'mch_test_01',
          'x-user-role': 'ADMIN',
        },
        body: JSON.stringify({ recoveryCaseId: caseId, language }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        setSession(json.data);
      } else {
        setError(json.error?.message || 'Failed to initiate voice call');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendUtterance = async () => {
    if (!session || !utterance.trim()) return;
    setLoading(true);
    setError(null);
    const input = utterance;
    setUtterance('');

    try {
      const res = await fetch(`/api/voice/calls/${session.id}/interact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-merchant-id': 'mch_test_01',
          'x-user-role': 'ADMIN',
        },
        body: JSON.stringify({ userUtterance: input }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        setSession(json.data.session);
      } else {
        setError(json.error?.message || 'Failed to send utterance');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
              <PhoneCall className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">Voice Recovery Assistant</h3>
              <p className="text-xs text-slate-400 font-mono">Case #{caseId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm px-2 py-1 rounded bg-slate-800"
          >
            Close
          </button>
        </div>

        {/* Call Controls & Transcript */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {!session ? (
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                <Volume2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Start Customer Voice Call Simulation</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Simulate interactive Hinglish/English voice recovery conversation for case #{caseId}.
                </p>
              </div>

              <div className="flex items-center justify-center space-x-3 pt-2">
                <label className="text-xs text-slate-400">Language:</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as VoiceLanguage)}
                  className="bg-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700"
                >
                  <option value="HINGLISH">Hinglish (Recommended)</option>
                  <option value="ENGLISH">English</option>
                  <option value="HINDI">Hindi</option>
                </select>
              </div>

              <button
                onClick={startCall}
                disabled={loading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 mx-auto disabled:opacity-50"
              >
                <PhoneCall className="w-4 h-4" />
                <span>{loading ? 'Initiating Call...' : 'Initiate Call'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Call Status Badge */}
              <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-mono text-slate-300">Status: {session.status}</span>
                </div>
                {session.detectedIntent && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    Intent: {session.detectedIntent}
                  </span>
                )}
              </div>

              {/* Action Banner if triggered */}
              {session.executedAction && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-emerald-200">Executed Action: {session.executedAction}</span>
                    <p className="text-[11px] text-emerald-400/90 mt-0.5">{session.actionResult}</p>
                  </div>
                </div>
              )}

              {/* Transcript Chat Bubbles */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {session.transcript.map((msg: VoiceUtterance, i: number) => (

                  <div
                    key={i}
                    className={`flex flex-col ${msg.speaker === 'ASSISTANT' ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.speaker === 'ASSISTANT'
                          ? 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/60'
                          : 'bg-cyan-900/80 text-cyan-100 rounded-tr-none border border-cyan-700/60'
                      }`}
                    >
                      <div className="text-[10px] text-slate-400 font-mono mb-1">
                        {msg.speaker === 'ASSISTANT' ? '🤖 AI Voice Assistant' : '👤 Customer'}
                      </div>
                      <p>{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Utterance Input Bar */}
              {session.status !== 'OPTED_OUT' && session.status !== 'COMPLETED' && (
                <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
                  <input
                    type="text"
                    value={utterance}
                    onChange={(e) => setUtterance(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendUtterance()}
                    placeholder="Speak / type customer response (e.g. 'Send link on WhatsApp' or 'Retry payment')"
                    className="flex-1 bg-slate-950 text-slate-200 text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={sendUtterance}
                    disabled={loading || !utterance.trim()}
                    className="p-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl disabled:opacity-50 transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
