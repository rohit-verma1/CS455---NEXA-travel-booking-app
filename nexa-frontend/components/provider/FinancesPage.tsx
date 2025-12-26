"use client";

import React, { useCallback, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, PieLabelRenderProps } from 'recharts';
import { Clock, TrendingDown, Wallet, Download, Loader2 } from 'lucide-react';

const RupeeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = "" }) => (
  <span className={`font-bold ${className}`} style={{ fontSize: size }}>₹</span>
);

interface ProviderTheme {
  bg: string;
  card: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  [key: string]: string;
}

interface FinanceSummary {
  total_earnings: number;
  pending_settlement: number;
  refunds_issued: number;
  platform_fees: number;
}

interface RevenueBreakdownEntry {
  label: string;
  value: number;
  percentage: number;
}

interface TransactionRecord {
  txn_id: string;
  type: string;
  booking_id: string;
  formatted_amount: string;
  date: string;
}

interface FinancesPageProps {
  theme: ProviderTheme;
  isDarkMode: boolean;
  summary: FinanceSummary | null;
  revenueBreakdown: RevenueBreakdownEntry[];
  transactions: TransactionRecord[];
  COLORS: string[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}

interface StatCardConfig {
  key: keyof FinanceSummary;
  title: string;
  icon: React.FC<{ size?: number; className?: string }>;
  gradient: string;
}

const STAT_CARDS: StatCardConfig[] = [
  { key: 'total_earnings', title: 'Total Earnings', icon: RupeeIcon, gradient: 'from-emerald-600 to-emerald-700' },
  { key: 'pending_settlement', title: 'Pending Settlement', icon: Clock, gradient: 'from-cyan-600 to-cyan-700' },
  { key: 'refunds_issued', title: 'Refunds Issued', icon: TrendingDown, gradient: 'from-rose-600 to-rose-700' },
  { key: 'platform_fees', title: 'Platform Fees', icon: Wallet, gradient: 'from-blue-600 to-blue-700' },
];

const formatCurrency = (value: number | null | undefined, loading: boolean) => {
  if (loading) return '₹...';
  if (value === null || value === undefined || Number.isNaN(value)) return '₹--';
  return `₹${Number(value).toLocaleString()}`;
};

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value || '--';
  return parsed.toLocaleDateString();
};

const StatCard = ({
  icon: Icon,
  title,
  value,
  gradient,
  theme,
}: {
  icon: React.FC<{ size?: number; className?: string }>;
  title: string;
  value: string;
  gradient: string;
  theme: ProviderTheme;
}) => (
  <div className={`${theme.card} rounded-xl p-6 border ${theme.cardBorder} hover:border-sky-500 transition-all duration-300 hover:shadow-lg`}>
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg bg-gradient-to-br ${gradient}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    <div className={`${theme.textSecondary} text-sm mb-1`}>{title}</div>
    <div className={`text-3xl font-bold ${theme.text}`}>{value}</div>
  </div>
);

const TransactionRow = ({
  transaction,
  theme,
  isDarkMode,
}: {
  transaction: TransactionRecord;
  theme: ProviderTheme;
  isDarkMode: boolean;
}) => {
  const isPositive = transaction.formatted_amount.trim().startsWith('+');
  const chipBg = isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400';

  return (
    <div className={`flex items-start justify-between gap-4 p-4 ${isDarkMode ? 'bg-gray-800/50 hover:bg-gray-700/50' : 'bg-gray-50 hover:bg-gray-100'} rounded-lg transition-colors`}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${chipBg}`}>
          <RupeeIcon className="w-5 h-5" size={20} />
        </div>
        <div className="space-y-1">
          <div className={`${theme.text} font-semibold`}>{transaction.type}</div>
          <div className={`text-sm ${theme.textSecondary}`}>Transaction ID: {transaction.txn_id}</div>
          <div className={`text-sm ${theme.textSecondary}`}>Booking ID: {transaction.booking_id}</div>
        </div>
      </div>
      <div className="text-right space-y-1">
        <div className={`text-lg font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {transaction.formatted_amount}
        </div>
        <div className={`text-sm ${theme.textSecondary}`}>{formatDate(transaction.date)}</div>
      </div>
    </div>
  );
};

const PageLoader = ({
  theme,
  isDarkMode,
  message,
}: {
  theme: ProviderTheme;
  isDarkMode: boolean;
  message: string;
}) => (
  <div className="flex items-center justify-center min-h-[360px]">
    <div className={`${theme.card} rounded-2xl border ${theme.cardBorder} p-10 flex flex-col items-center gap-4 shadow-lg`}>
      <div className="relative">
        <div className={`w-20 h-20 rounded-full border-4 ${isDarkMode ? 'border-white/10' : 'border-sky-100'} animate-pulse`} />
        <Loader2 className="w-8 h-8 absolute inset-0 m-auto text-sky-500 animate-spin" />
      </div>
      <p className={`${theme.text} text-lg font-semibold`}>Reconciling your finances…</p>
      <p className={`${theme.textSecondary} text-sm`}>{message}</p>
    </div>
  </div>
);

const FinancesPage = ({
  theme,
  isDarkMode,
  summary,
  revenueBreakdown,
  transactions,
  COLORS,
  loading,
  error,
  onRetry,
}: FinancesPageProps) => {
  const pieData = useMemo(() => {
    if (!Array.isArray(revenueBreakdown)) return [];
    return revenueBreakdown.map((entry) => ({
      name: entry.label,
      value: entry.value,
      percentage: entry.percentage,
    }));
  }, [revenueBreakdown]);

  const breakdownColors = useMemo(() => {
    const palette = COLORS.length ? COLORS : ['#0EA5E9', '#8B5CF6', '#F59E0B', '#10B981'];
    if (!pieData.length) return palette;
    return pieData.map((_, index) => palette[index % palette.length]);
  }, [pieData, COLORS]);

  const handleExport = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (transactions.length === 0) return;
    const headers = ['Transaction ID', 'Type', 'Booking ID', 'Amount', 'Date'];
    const rows = transactions.map((txn) => [
      txn.txn_id,
      txn.type,
      txn.booking_id,
      txn.formatted_amount,
      txn.date,
    ]);

    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [
      headers.map(escape).join(','),
      ...rows.map((row) => row.map((cell) => escape(String(cell ?? ''))).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nexa-transactions-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [transactions]);

  const renderPieLabel = (props: PieLabelRenderProps) => {
    // payload can contain the original data entry; guard and cast conservatively
    const payload = (props.payload as unknown) as { percentage?: number; value?: number } | undefined;
    if (!payload || !payload.value) return '';
    const percentage = payload.percentage ?? 0;
    if (percentage <= 0) return '';
    return `${Math.round(percentage)}%`;
  };

  const totalEarnings = summary?.total_earnings ?? 0;
  const pendingSettlement = summary?.pending_settlement ?? 0;
  const refundsIssued = summary?.refunds_issued ?? 0;
  const platformFees = summary?.platform_fees ?? 0;
  const netSettlement = summary ? totalEarnings - platformFees - refundsIssued : null;
  const settledAmount = Math.max(0, totalEarnings - pendingSettlement);
  const settlementCompletion = summary && totalEarnings > 0
    ? Math.max(0, Math.min(100, Math.round((settledAmount / totalEarnings) * 100)))
    : 0;
  const settlementPeriodLabel = useMemo(() => {
    const now = new Date();
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(now);
  }, []);
  const formatDeduction = (value: number | null | undefined) => {
    if (loading) return '₹...';
    if (value === null || value === undefined) return '₹--';
    const absolute = Math.abs(Number(value));
    return `-₹${absolute.toLocaleString()}`;
  };
  const completionLabel = loading ? '...' : `${settlementCompletion}% Complete`;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className={`text-3xl font-bold ${theme.text}`}>Financial Dashboard</h1>
        <PageLoader
          theme={theme}
          isDarkMode={isDarkMode}
          message="We’re syncing your earnings, settlements, and breakdowns."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className={`text-3xl font-bold ${theme.text}`}>Financial Dashboard</h1>

      {error && (
        <div className={`rounded-lg border p-4 text-sm flex items-center justify-between gap-3 ${isDarkMode ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-600'}`}>
          <span>{error}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className={`px-3 py-1 rounded-md border ${isDarkMode ? 'border-red-400 text-red-200 hover:bg-red-500/20' : 'border-red-400 text-red-600 hover:bg-red-100'}`}
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STAT_CARDS.map((card) => (
          <StatCard
            key={card.key}
            icon={card.icon}
            title={card.title}
            value={formatCurrency(summary ? summary[card.key] : null, loading)}
            gradient={card.gradient}
            theme={theme}
          />
        ))}
      </div>

      <div className={`${theme.card} rounded-xl p-6 border ${theme.cardBorder}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-bold ${theme.text}`}>Transaction History</h2>
          <button
            onClick={handleExport}
            disabled={transactions.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-sm ${transactions.length === 0 ? 'opacity-60 cursor-not-allowed' : isDarkMode ? 'bg-sky-600 text-white hover:bg-sky-500' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {transactions.length === 0 ? (
            <div className={`text-sm ${theme.textSecondary}`}>{loading ? 'Loading transactions…' : 'No transactions available yet.'}</div>
          ) : (
            transactions.map((txn) => (
              <TransactionRow key={txn.txn_id} transaction={txn} theme={theme} isDarkMode={isDarkMode} />
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${theme.card} rounded-xl p-6 border ${theme.cardBorder}`}>
          <h3 className={`text-xl font-bold ${theme.text} mb-4`}>Monthly Settlement</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className={`${theme.textSecondary}`}>{`${settlementPeriodLabel} Settlement`}</span>
                <span className={`${theme.text} font-medium`}>{completionLabel}</span>
              </div>
              <div className={`w-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-3`}>
                <div
                  className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 h-3 rounded-full"
                  style={{ width: `${loading ? 0 : settlementCompletion}%` }}
                />
              </div>
            </div>
            <div className={`${isDarkMode ? 'bg-gray-800/50 hover:bg-gray-700/50' : 'bg-gray-50 hover:bg-gray-100'} rounded-lg p-4 space-y-2`}>
              <div className="flex justify-between">
                <span className={`${theme.textSecondary}`}>Gross Revenue</span>
                <span className={`${theme.text} font-semibold`}>{formatCurrency(summary ? summary.total_earnings : null, loading)}</span>
              </div>
              <div className="flex justify-between">
                <span className={`${theme.textSecondary}`}>Platform Fees</span>
                <span className="text-rose-400">{formatDeduction(summary ? summary.platform_fees : null)}</span>
              </div>
              <div className="flex justify-between">
                <span className={`${theme.textSecondary}`}>Refunds Issued</span>
                <span className="text-rose-400">{formatDeduction(summary ? summary.refunds_issued : null)}</span>
              </div>
              <div className={`border-t ${theme.cardBorder} pt-2 mt-2 flex justify-between`}>
                <span className={`${theme.text} font-semibold`}>Net Settlement</span>
                <span className="text-emerald-400 font-bold text-lg">{formatCurrency(netSettlement, loading)}</span>
              </div>
            </div>
            <div className={`text-sm ${theme.textSecondary}`}>
              Pending settlement: <span className={`${theme.text}`}>{formatCurrency(summary ? summary.pending_settlement : null, loading)}</span>
            </div>
          </div>
        </div>

        <div className={`${theme.card} rounded-xl p-6 border ${theme.cardBorder}`}>
          <h3 className={`text-xl font-bold ${theme.text} mb-4`}>Revenue Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                label={renderPieLabel}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={entry.name} fill={breakdownColors[index % breakdownColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                  border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                  borderRadius: '8px',
                  color: isDarkMode ? '#FFFFFF' : '#111827',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-6 space-y-3">
            {pieData.length === 0 ? (
              <div className={`text-sm ${theme.textSecondary}`}>{loading ? 'Loading breakdown…' : 'No revenue breakdown available.'}</div>
            ) : (
              pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: breakdownColors[index % breakdownColors.length] }} />
                    <span className={`${theme.text}`}>{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`${theme.textSecondary}`}>{formatCurrency(entry.value, false)}</span>
                    <span className={`${theme.textSecondary}`}>{Math.round(entry.percentage ?? 0)}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancesPage;
