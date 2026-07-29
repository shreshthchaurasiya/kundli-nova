import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  IndianRupee, 
  Wallet, 
  Building2, 
  Briefcase, 
  ArrowRightLeft,
  Calendar,
  Info
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';

export function RevenueScreen() {
  const [range, setRange] = useState('This Month');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [summaryData, setSummaryData] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    const now = new Date();
    let from = new Date();
    let to = new Date();
    let granularity = 'day';

    if (range === 'Today') {
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      granularity = 'day';
    } else if (range === 'Yesterday') {
      from.setDate(now.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to.setDate(now.getDate() - 1);
      to.setHours(23, 59, 59, 999);
      granularity = 'day';
    } else if (range === 'This Week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      from = new Date(now.setDate(diff));
      from.setHours(0, 0, 0, 0);
      to = new Date(from);
      to.setDate(from.getDate() + 6);
      to.setHours(23, 59, 59, 999);
      granularity = 'day';
    } else if (range === 'This Month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      granularity = 'day';
    } else if (range === 'This Year') {
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      granularity = 'month';
    } else {
      from = new Date('2020-01-01');
      to = new Date('2030-01-01');
      granularity = 'month';
    }

    try {
      const [summaryResult, timeseriesResult] = await Promise.all([
        supabase.rpc('get_admin_dashboard_summary', {
          p_from: from.toISOString(),
          p_to: to.toISOString(),
          p_timezone: 'Asia/Kolkata'
        }),
        supabase.rpc('get_admin_dashboard_timeseries', {
          p_from: from.toISOString(),
          p_to: to.toISOString(),
          p_timezone: 'Asia/Kolkata',
          p_granularity: granularity
        })
      ]);

      if (summaryResult.error) throw summaryResult.error;
      if (timeseriesResult.error) throw timeseriesResult.error;
      
      setSummaryData(summaryResult.data);
      
      const formattedChartData = (timeseriesResult.data || []).map((item: any) => ({
        ...item,
        displayDate: granularity === 'day' 
          ? format(parseISO(item.bucket), 'dd MMM') 
          : format(parseISO(item.bucket), 'MMM yyyy')
      }));
      setChartData(formattedChartData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch revenue data.');
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const formatINR = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const StatCard = ({ title, value, subtext, icon: Icon, trend, colorClass }: any) => (
    <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">{title}</p>
          <h3 className="mt-2 text-2xl font-black text-neutral-900">{value}</h3>
          {subtext && <p className="mt-1 text-xs text-neutral-400">{subtext}</p>}
        </div>
        <div className={`rounded-xl p-3 ${colorClass}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span className={`font-semibold ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.value}
          </span>
          <span className="ml-2 text-neutral-500">{trend.label}</span>
        </div>
      )}
    </div>
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-lg">
          <p className="mb-2 font-bold text-neutral-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 py-1">
              <span className="text-sm font-medium" style={{ color: entry.color }}>
                {entry.name}:
              </span>
              <span className="text-sm font-bold text-neutral-900">
                {formatINR(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
        <p className="font-bold">Error: {error}</p>
        <button onClick={fetchDashboard} className="mt-4 rounded-xl bg-red-100 px-4 py-2 font-bold hover:bg-red-200">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">Revenue & Commission</h1>
          <p className="mt-1 text-sm text-neutral-500">Monitor platform financials and earnings.</p>
        </div>
        
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-1 shadow-sm">
          <Calendar className="ml-2 h-4 w-4 text-neutral-400" />
          <select 
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="bg-transparent py-1.5 pl-2 pr-8 text-sm font-semibold text-neutral-900 outline-none cursor-pointer"
          >
            <option>Today</option>
            <option>Yesterday</option>
            <option>This Week</option>
            <option>This Month</option>
            <option>This Year</option>
            <option>All Time</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      ) : (
        <>
          {/* Main KPI Cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard 
              title="Total Gross Billing" 
              value={formatINR(summaryData?.consultation_gross_billing)}
              subtext="Total amount charged to users"
              icon={IndianRupee}
              colorClass="bg-blue-50 text-blue-600"
            />
            <StatCard 
              title="Company Revenue" 
              value={formatINR(summaryData?.company_commission_revenue)}
              subtext="Platform's share of consultations"
              icon={Building2}
              colorClass="bg-orange-50 text-[#FF8A00]"
            />
            <StatCard 
              title="Astrologer Earnings" 
              value={formatINR(summaryData?.astrologer_earnings)}
              subtext="Astrologers' share of consultations"
              icon={Briefcase}
              colorClass="bg-green-50 text-green-600"
            />
            <StatCard 
              title="Wallet Recharges" 
              value={formatINR(summaryData?.wallet_recharge_volume)}
              subtext="Total money added to user wallets"
              icon={Wallet}
              colorClass="bg-purple-50 text-purple-600"
            />
          </div>

          {/* Charts Section */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Revenue Trends</h2>
                <p className="text-sm text-neutral-500">Gross billing vs Company Revenue over time</p>
              </div>
            </div>
            
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCompany" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF8A00" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#FF8A00" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorWallet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                  <XAxis 
                    dataKey="displayDate" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#737373' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#737373' }}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }}/>
                  <Area 
                    type="monotone" 
                    dataKey="wallet_recharge_volume" 
                    name="Wallet Recharges"
                    stroke="#9333ea" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorWallet)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="consultation_gross_billing" 
                    name="Gross Billing"
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorGross)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="company_commission_revenue" 
                    name="Company Revenue"
                    stroke="#FF8A00" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorCompany)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-neutral-500">
                Payment Breakdown
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-neutral-100 p-2 text-neutral-600">
                      <IndianRupee size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900">Razorpay Volume</p>
                      <p className="text-xs text-neutral-500">Total processed by gateway</p>
                    </div>
                  </div>
                  <span className="font-bold text-neutral-900">{formatINR(summaryData?.razorpay_payment_volume)}</span>
                </div>
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-neutral-100 p-2 text-neutral-600">
                      <ArrowRightLeft size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900">Successful Payments</p>
                      <p className="text-xs text-neutral-500">Count of successful txns</p>
                    </div>
                  </div>
                  <span className="font-bold text-neutral-900">{summaryData?.successful_payment_count || 0}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-neutral-500">
                Payout Overview
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-orange-50 p-2 text-orange-600">
                      <Info size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900">Awaiting Commission</p>
                      <p className="text-xs text-neutral-500">Uncalculated ledger entries</p>
                    </div>
                  </div>
                  <span className="font-bold text-orange-600">{formatINR(summaryData?.awaiting_commission_amount)}</span>
                </div>
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-50 p-2 text-green-600">
                      <Wallet size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900">Paid Withdrawals</p>
                      <p className="text-xs text-neutral-500">Amount paid to astrologers</p>
                    </div>
                  </div>
                  <span className="font-bold text-green-600">{formatINR(summaryData?.paid_withdrawals_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

