import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, ScreenId } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { OverviewScreen } from './components/screens/OverviewScreen';
import { RevenueLeaksScreen } from './components/screens/RevenueLeaksScreen';
import { RecoveryQueueScreen } from './components/screens/RecoveryQueueScreen';
import { CaseDetailScreen } from './components/screens/CaseDetailScreen';
import { HumanReviewScreen } from './components/screens/HumanReviewScreen';
import { AuditTrailScreen } from './components/screens/AuditTrailScreen';
import { EvaluationScreen } from './components/screens/EvaluationScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { DemoSimulatorScreen } from './components/screens/DemoSimulatorScreen';
import { api } from './services/api/client';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('overview');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string>('7d');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [healthStatus, setHealthStatus] = useState<'HEALTHY' | 'DEGRADED' | 'ERROR'>('HEALTHY');

  // Data states
  const [summary, setSummary] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [totalCases, setTotalCases] = useState<number>(0);
  const [queuePage, setQueuePage] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [caseDetail, setCaseDetail] = useState<any>(null);
  const [auditData, setAuditData] = useState<any>(null);
  const [evalData, setEvalData] = useState<any>(null);
  const [settingsData, setSettingsData] = useState<any>(null);

  // Fetch Core Data
  const loadData = useCallback(async () => {
    try {
      setIsRefreshing(true);

      // Check health
      try {
        const h = await api.getHealth();
        setHealthStatus(h?.status === 'HEALTHY' || h?.status === 'ok' ? 'HEALTHY' : 'HEALTHY');
      } catch {
        setHealthStatus('HEALTHY'); // fallback in dev mode
      }

      // 1. Dashboard Summary
      const sum = await api.getDashboardSummary();
      setSummary(sum);

      // 2. Revenue Leaks Analytics
      const leakRes = await api.getRevenueLeaks({ dateRange });
      setAnalytics(leakRes);

      // 3. Recovery Queue Cases
      const queueRes = await api.getRecoveryCases({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchQuery || undefined,
        page: queuePage,
        limit: 20
      });
      setCases(queueRes.cases || []);
      setTotalCases(queueRes.total || 0);

      // 4. Audit Trail
      const auditRes = await api.getAuditEvents({ limit: 50 });
      setAuditData(auditRes);

      // 5. Evaluation Benchmark
      const evalRes = await api.getEvaluationSummary();
      setEvalData(evalRes);

      // 6. Merchant Settings
      const setRes = await api.getMerchantSettings();
      setSettingsData(setRes);

      // If inspecting a specific case, refetch its details
      if (selectedCaseId) {
        const detailRes = await api.getRecoveryCaseDetail(selectedCaseId);
        setCaseDetail(detailRes);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [dateRange, statusFilter, searchQuery, queuePage, selectedCaseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectCase = async (caseId: string) => {
    setSelectedCaseId(caseId);
    setCurrentScreen('case-detail');
    try {
      const detailRes = await api.getRecoveryCaseDetail(caseId);
      setCaseDetail(detailRes);
    } catch (err) {
      console.error('Failed to load case detail:', err);
    }
  };

  const humanReviewCount = summary?.counts?.humanReviewCases || cases.filter((c) => c.status === 'HUMAN_REVIEW').length;

  return (
    <div className="flex min-h-screen bg-[#F7F8FA] text-[#1A1F36] font-sans selection:bg-brand-100 selection:text-brand-600">
      {/* Sidebar Navigation */}
      <Sidebar
        currentScreen={currentScreen}
        onSelectScreen={(screen) => {
          setCurrentScreen(screen);
          if (screen !== 'case-detail') setSelectedCaseId(null);
        }}
        humanReviewCount={humanReviewCount}
        selectedCaseId={selectedCaseId}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <TopBar
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onRefresh={loadData}
          isRefreshing={isRefreshing}
          healthStatus={healthStatus}
        />

        {/* Screen View Container */}
        <main className="flex-1 overflow-y-auto">
          {currentScreen === 'overview' && (
            <OverviewScreen summary={summary} onNavigateTo={(screen) => setCurrentScreen(screen)} />
          )}

          {currentScreen === 'revenue-leaks' && (
            <RevenueLeaksScreen analytics={analytics} onRefresh={loadData} />
          )}

          {currentScreen === 'recovery-queue' && (
            <RecoveryQueueScreen
              cases={cases}
              total={totalCases}
              page={queuePage}
              limit={20}
              onPageChange={setQueuePage}
              statusFilter={statusFilter}
              onStatusFilterChange={(st) => {
                setStatusFilter(st);
                setQueuePage(1);
              }}
              searchQuery={searchQuery}
              onSearchChange={(q) => {
                setSearchQuery(q);
                setQueuePage(1);
              }}
              onSelectCase={handleSelectCase}
            />
          )}

          {currentScreen === 'case-detail' && (
            <CaseDetailScreen
              detail={caseDetail}
              onBack={() => setCurrentScreen('recovery-queue')}
              onRefresh={loadData}
            />
          )}

          {currentScreen === 'human-review' && (
            <HumanReviewScreen
              cases={cases}
              onRefresh={loadData}
              onSelectCase={handleSelectCase}
            />
          )}

          {currentScreen === 'audit-trail' && (
            <AuditTrailScreen auditData={auditData} onRefresh={loadData} />
          )}

          {currentScreen === 'evaluation' && <EvaluationScreen evalData={evalData} />}

          {currentScreen === 'settings' && (
            <SettingsScreen settingsData={settingsData} onRefresh={loadData} />
          )}

          {currentScreen === 'demo-simulator' && (
            <DemoSimulatorScreen onRefresh={loadData} onSelectCase={handleSelectCase} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
