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
        <h2 className="text-2xl font-extrabold text-[#1A1F36] tracking-tight flex items-center space-x-2.5">
          <SettingsIcon className="w-6 h-6 text-brand-500" />
          <span>Merchant Policy & Guardrails Configuration</span>
        </h2>
        <p className="text-[#697386] text-sm mt-1">
          Customize high-value approval limits, retry windows, and policy guardrail thresholds for your merchant account.
        </p>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 border border-[#E6E8EC] bg-white space-y-6 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* High Value Threshold */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-[#1A1F36]">High-Value Threshold (INR ₹)</label>
            <input
              type="number"
              value={formData.highValueThresholdINR}
              onChange={(e) => setFormData({ ...formData, highValueThresholdINR: e.target.value })}
              className="w-full bg-[#F9FAFB] border border-[#E6E8EC] rounded-xl px-4 py-2.5 text-sm text-[#1A1F36] font-mono focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
            />
            <p className="text-[11px] text-[#697386] font-medium">Transactions equal or above this amount require human approval.</p>
          </div>

          {/* Min AI Confidence */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-[#1A1F36]">Min AI Confidence Threshold (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.minAIConfidence}
              onChange={(e) => setFormData({ ...formData, minAIConfidence: e.target.value })}
              className="w-full bg-[#F9FAFB] border border-[#E6E8EC] rounded-xl px-4 py-2.5 text-sm text-[#1A1F36] font-mono focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
            />
            <p className="text-[11px] text-[#697386] font-medium">AI decisions below this confidence escalate to human review.</p>
          </div>

          {/* Max Retry Attempts */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-[#1A1F36]">Max Automatic Retry Attempts</label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.maxRetryAttempts}
              onChange={(e) => setFormData({ ...formData, maxRetryAttempts: e.target.value })}
              className="w-full bg-[#F9FAFB] border border-[#E6E8EC] rounded-xl px-4 py-2.5 text-sm text-[#1A1F36] font-mono focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
            />
            <p className="text-[11px] text-[#697386] font-medium">Maximum retry attempts allowed per payment failure.</p>
          </div>

          {/* Recovery Window */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-[#1A1F36]">Recovery Time Window (Hours)</label>
            <input
              type="number"
              min="1"
              max="168"
              value={formData.recoveryWindowHours}
              onChange={(e) => setFormData({ ...formData, recoveryWindowHours: e.target.value })}
              className="w-full bg-[#F9FAFB] border border-[#E6E8EC] rounded-xl px-4 py-2.5 text-sm text-[#1A1F36] font-mono focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
            />
            <p className="text-[11px] text-[#697386] font-medium">Maximum hours before a case is automatically expired.</p>
          </div>
        </div>

        {/* Contact Opt In */}
        <div className="pt-4 border-t border-[#E6E8EC] flex items-center justify-between">
          <div>
            <div className="text-xs font-extrabold text-[#1A1F36]">Enforce Customer Contact Opt-In Check</div>
            <div className="text-[11px] text-[#697386] font-medium">Never send notification emails to opted-out customers.</div>
          </div>
          <input
            type="checkbox"
            checked={formData.contactOptInRequired}
            onChange={(e) => setFormData({ ...formData, contactOptInRequired: e.target.checked })}
            className="w-5 h-5 accent-brand-500 rounded cursor-pointer"
          />
        </div>

        {/* Submit */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-md shadow-brand-500/20 flex items-center space-x-2 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Merchant Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
