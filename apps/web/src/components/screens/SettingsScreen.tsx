import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api/client';

interface SettingsScreenProps {
  settingsData: any;
  onRefresh: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ settingsData, onRefresh }) => {
  const [formData, setFormData] = useState<any>({
    recoveryWindowHours: 72,
    maxRetryAttempts: 3,
    maxNotifications: 2,
    highValueThresholdINR: 100000,
    minAIConfidence: 70,
    contactOptInRequired: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (settingsData) {
      setFormData({
        recoveryWindowHours: settingsData.recoveryWindowHours ?? 72,
        maxRetryAttempts: settingsData.maxRetryAttempts ?? 3,
        maxNotifications: settingsData.maxNotifications ?? 2,
        highValueThresholdINR: settingsData.highValueThresholdINR ? settingsData.highValueThresholdINR / 100 : 100000,
        minAIConfidence: settingsData.minAIConfidence ? settingsData.minAIConfidence * 100 : 70,
        contactOptInRequired: settingsData.contactOptInRequired ?? true
      });
    }
  }, [settingsData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setToastMessage(null);

      const payload = {
        recoveryWindowHours: Number(formData.recoveryWindowHours),
        maxRetryAttempts: Number(formData.maxRetryAttempts),
        maxNotifications: Number(formData.maxNotifications),
        highValueThresholdINR: Number(formData.highValueThresholdINR) * 100, // convert INR to paise
        minAIConfidence: Number(formData.minAIConfidence) / 100, // convert percentage to fraction
        contactOptInRequired: Boolean(formData.contactOptInRequired)
      };

      await api.updateMerchantSettings(payload);
      setToastMessage('Merchant policy settings updated successfully!');
      onRefresh();
    } catch (err: any) {
      setToastMessage(`Error updating settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center space-x-2.5">
          <SettingsIcon className="w-6 h-6 text-cyan-400" />
          <span>Merchant Policy & Guardrails Configuration</span>
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Customize high-value approval limits, retry windows, and policy guardrail thresholds for your merchant account.
        </p>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* High Value Threshold */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">High-Value Threshold (INR ₹)</label>
            <input
              type="number"
              value={formData.highValueThresholdINR}
              onChange={(e) => setFormData({ ...formData, highValueThresholdINR: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-slate-500">Transactions equal or above this amount require human approval.</p>
          </div>

          {/* Min AI Confidence */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Min AI Confidence Threshold (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.minAIConfidence}
              onChange={(e) => setFormData({ ...formData, minAIConfidence: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-slate-500">AI decisions below this confidence escalate to human review.</p>
          </div>

          {/* Max Retry Attempts */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Max Automatic Retry Attempts</label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.maxRetryAttempts}
              onChange={(e) => setFormData({ ...formData, maxRetryAttempts: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-slate-500">Maximum retry attempts allowed per payment failure.</p>
          </div>

          {/* Recovery Window */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Recovery Time Window (Hours)</label>
            <input
              type="number"
              min="1"
              max="168"
              value={formData.recoveryWindowHours}
              onChange={(e) => setFormData({ ...formData, recoveryWindowHours: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-slate-500">Maximum hours before a case is automatically expired.</p>
          </div>
        </div>

        {/* Contact Opt In */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-200">Enforce Customer Contact Opt-In Check</div>
            <div className="text-[11px] text-slate-500">Never send notification emails to opted-out customers.</div>
          </div>
          <input
            type="checkbox"
            checked={formData.contactOptInRequired}
            onChange={(e) => setFormData({ ...formData, contactOptInRequired: e.target.checked })}
            className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
          />
        </div>

        {/* Submit */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 flex items-center space-x-2 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Merchant Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
