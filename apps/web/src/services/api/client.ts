/**
 * Typed API Client for RazorRecover AI Dashboard Backend Endpoints
 */

const API_BASE = '/api';

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer mch:mch_test_01|role:OWNER|user:usr_01',
      ...(options?.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errBody = await res.json();
      if (errBody?.error?.message) {
        errorMsg = errBody.error.message;
      } else if (errBody?.message) {
        errorMsg = errBody.message;
      }
    } catch {}
    throw new Error(errorMsg);
  }

  const payload = await res.json();
  return payload?.data !== undefined ? payload.data : payload;
}

export const api = {
  // Health
  getHealth: () => fetchJSON<any>('/health'),

  // Dashboard Overview Summary
  getDashboardSummary: () => fetchJSON<any>('/dashboard/summary'),

  // Revenue Leaks Analytics
  getRevenueLeaks: (params?: { dateRange?: string; category?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return fetchJSON<any>(`/analytics/revenue-leaks${q ? `?${q}` : ''}`);
  },

  // Recovery Queue & Cases
  getRecoveryCases: (params?: { status?: string; search?: string; page?: number; limit?: number; sortBy?: string }) => {
    const queryObj: Record<string, string> = {};
    if (params?.status) queryObj.status = params.status;
    if (params?.search) queryObj.search = params.search;
    if (params?.page) queryObj.page = params.page.toString();
    if (params?.limit) queryObj.limit = params.limit.toString();
    if (params?.sortBy) queryObj.sortBy = params.sortBy;
    const q = new URLSearchParams(queryObj).toString();
    return fetchJSON<any>(`/recovery-cases${q ? `?${q}` : ''}`);
  },

  getRecoveryCaseDetail: (id: string) => fetchJSON<any>(`/recovery-cases/${id}`),

  // Operational Actions (Phase 6 & 8)
  approveCase: (id: string) => fetchJSON<any>(`/recovery-cases/${id}/approve`, { method: 'POST' }),
  rejectCase: (id: string, reason?: string) => fetchJSON<any>(`/recovery-cases/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  stopCase: (id: string, reason?: string) => fetchJSON<any>(`/recovery-cases/${id}/stop`, { method: 'POST', body: JSON.stringify({ reason }) }),
  triggerAIDecision: (id: string) => fetchJSON<any>(`/recovery-cases/${id}/ai-decision`, { method: 'POST' }),

  // Evaluation Artifacts
  getEvaluationSummary: () => fetchJSON<any>('/evaluation/summary'),

  // Demo Simulator
  runSimulation: (scenario: 'SCENARIO_A' | 'SCENARIO_B' | 'SCENARIO_C' | 'SCENARIO_D') =>
    fetchJSON<any>('/simulations/run', { method: 'POST', body: JSON.stringify({ scenario }) }),

  // Audit Trail
  getAuditEvents: (params?: { caseId?: string; eventType?: string; actorType?: string; page?: number; limit?: number }) => {
    const queryObj: Record<string, string> = {};
    if (params?.caseId) queryObj.caseId = params.caseId;
    if (params?.eventType) queryObj.eventType = params.eventType;
    if (params?.actorType) queryObj.actorType = params.actorType;
    if (params?.page) queryObj.page = params.page.toString();
    if (params?.limit) queryObj.limit = params.limit.toString();
    const q = new URLSearchParams(queryObj).toString();
    return fetchJSON<any>(`/audit${q ? `?${q}` : ''}`);
  },

  // Merchant Settings
  getMerchantSettings: () => fetchJSON<any>('/merchant/settings'),
  updateMerchantSettings: (settings: any) => fetchJSON<any>('/merchant/settings', { method: 'PUT', body: JSON.stringify(settings) })
};
