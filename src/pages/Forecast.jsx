import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Target, Layers, ChevronDown, ChevronUp, Plus, Trash2, Save } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { format, addDays } from 'date-fns';

const fmt$ = (v) => {
  const n = Math.abs(v || 0);
  if (n >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${(v || 0).toFixed(2)}`;
};

const TOOLTIP_STYLE = { borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, background: '#fff', color: '#1e293b' };

const DEFAULT_PARAMS = {
  dealsPerDay: 3,
  avgProfit: 25,
  avgCashback: 8,
  forecastDays: 90,
  forecastMode: 'all',
  monthlyGrowthRate: 0,
  reinvestmentRate: 0,
  target: '',
};

const DEFAULT_SCENARIOS = [
  { id: '1', name: 'Conservative', dealsPerDay: 2, avgProfit: 20, avgCashback: 6, monthlyGrowthRate: 0, reinvestmentRate: 0 },
  { id: '2', name: 'Baseline', dealsPerDay: 3, avgProfit: 25, avgCashback: 8, monthlyGrowthRate: 2, reinvestmentRate: 10 },
  { id: '3', name: 'Aggressive', dealsPerDay: 5, avgProfit: 35, avgCashback: 12, monthlyGrowthRate: 5, reinvestmentRate: 20 },
];

function SectionCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      {title && <p className="text-xs font-bold tracking-widest uppercase text-slate-700 mb-0.5">{title}</p>}
      {subtitle && <p className="text-[10px] text-slate-400 mb-4">{subtitle}</p>}
      {!subtitle && title && <div className="mb-4" />}
      {children}
    </div>
  );
}

function ParamSlider({ label, value, onChange, min, max, step = 1, prefix = '', suffix = '' }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="text-xs font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">{prefix}{value}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-violet-600"
      />
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{prefix}{min}{suffix}</span>
        <span>{prefix}{max}{suffix}</span>
      </div>
    </div>
  );
}

function buildForecastData(params) {
  const { dealsPerDay, avgProfit, avgCashback, forecastDays, monthlyGrowthRate, reinvestmentRate } = params;
  const data = [];
  let cumProfit = 0;
  let cumCashback = 0;
  let currentDealsPerDay = dealsPerDay;
  const monthlyGrowthFactor = 1 + (monthlyGrowthRate / 100) / 30;

  for (let d = 1; d <= forecastDays; d++) {
    const growthMultiplier = Math.pow(monthlyGrowthFactor, d);
    const effectiveDeals = currentDealsPerDay * growthMultiplier;
    const reinvestBonus = (reinvestmentRate / 100) * (cumProfit / Math.max(d, 1));
    const dailyProfit = effectiveDeals * avgProfit + reinvestBonus;
    const dailyCashback = effectiveDeals * avgCashback;
    cumProfit += dailyProfit;
    cumCashback += dailyCashback;
    if (d % 7 === 0 || d === forecastDays) {
      data.push({
        day: d,
        label: `Day ${d}`,
        dailyProfit: Math.round(dailyProfit * 7),
        cumProfit: Math.round(cumProfit),
        cumCashback: Math.round(cumCashback),
        total: Math.round(cumProfit + cumCashback),
      });
    }
  }
  return data;
}

export default function Forecast() {
  const [activeTab, setActiveTab] = useState('overview');
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [scenarios, setScenarios] = useState(DEFAULT_SCENARIOS);
  const [newScenarioName, setNewScenarioName] = useState('');

  const setParam = (key, val) => setParams(p => ({ ...p, [key]: val }));

  const { data: orders = [] } = useQuery({
    queryKey: ['forecastOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-order_date', 200),
  });
  const { data: rewards = [] } = useQuery({
    queryKey: ['forecastRewards'],
    queryFn: () => base44.entities.Reward.list(),
  });

  // Auto-populate baseline from last 30 days of real data
  const actuals = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const recent = orders.filter(o => o.order_date && new Date(o.order_date) >= cutoff);
    const recentRewards = rewards.filter(r => r.date_earned && new Date(r.date_earned) >= cutoff && r.currency === 'USD');
    const totalCashback = recentRewards.reduce((s, r) => s + (r.amount || 0), 0);
    const count = recent.length;
    const avgDailyDeals = count / 30;
    return { count, avgDailyDeals: parseFloat(avgDailyDeals.toFixed(1)), totalCashback };
  }, [orders, rewards]);

  const forecastData = useMemo(() => buildForecastData(params), [params]);
  const finalPoint = forecastData[forecastData.length - 1] || {};

  // Target day
  const targetDays = useMemo(() => {
    if (!params.target) return null;
    const t = parseFloat(params.target);
    if (isNaN(t) || t <= 0) return null;
    const hit = forecastData.find(d => d.total >= t);
    return hit ? hit.day : null;
  }, [forecastData, params.target]);

  const scenarioComparison = useMemo(() => {
    return scenarios.map(s => {
      const data = buildForecastData({ ...s, forecastDays: params.forecastDays });
      const last = data[data.length - 1] || {};
      return { ...s, projectedProfit: last.cumProfit || 0, projectedCashback: last.cumCashback || 0, total: last.total || 0 };
    });
  }, [scenarios, params.forecastDays]);

  const saveScenario = () => {
    if (!newScenarioName.trim()) return;
    setScenarios(prev => [...prev, { ...params, id: Date.now().toString(), name: newScenarioName.trim() }]);
    setNewScenarioName('');
  };

  const deleteScenario = (id) => setScenarios(prev => prev.filter(s => s.id !== id));
  const loadScenario = (s) => setParams(p => ({ ...p, dealsPerDay: s.dealsPerDay, avgProfit: s.avgProfit, avgCashback: s.avgCashback, monthlyGrowthRate: s.monthlyGrowthRate || 0, reinvestmentRate: s.reinvestmentRate || 0 }));

  const TABS = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { id: 'params', label: 'Business Parameters', icon: <Layers className="h-3.5 w-3.5" /> },
    { id: 'scenarios', label: 'Scenarios', icon: <Target className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Forecast Planner</h1>
          <p className="text-sm text-slate-500 mt-0.5">Model growth, set targets, and compare scenarios</p>
        </div>
        {actuals.count > 0 && (
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Based on Last 30 Days</p>
            <p className="text-sm font-semibold text-slate-700">{actuals.count} orders · {actuals.avgDailyDeals}/day avg</p>
          </div>
        )}
      </div>

      {/* Mode + Tab Nav */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-1 shadow-sm">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${activeTab === t.id ? 'bg-violet-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-1 shadow-sm ml-auto">
          {['all', 'churning', 'marketplace'].map(m => (
            <button key={m} onClick={() => setParam('forecastMode', m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${params.forecastMode === m ? 'bg-violet-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
              {m === 'all' ? 'All Deals' : m === 'churning' ? 'Churning Only' : 'Marketplace Only'}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Projected Profit', value: fmt$(finalPoint.cumProfit), color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
              { label: 'Projected Cashback', value: fmt$(finalPoint.cumCashback), color: 'text-violet-600', bg: 'bg-violet-50 border-violet-100' },
              { label: 'Total Projected', value: fmt$(finalPoint.total), color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
              targetDays
                ? { label: 'Target Hit', value: `Day ${targetDays}`, sub: `~${format(addDays(new Date(), targetDays), 'MMM d')}`, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' }
                : { label: 'Target', value: params.target ? 'Not reached' : 'Not set', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-100' },
            ].map(k => (
              <div key={k.label} className={`rounded-2xl border p-4 ${k.bg}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{k.label}</p>
                <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                {k.sub && <p className="text-[10px] text-slate-400 mt-0.5">{k.sub}</p>}
              </div>
            ))}
          </div>

          {/* Target input */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
            <Target className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-700">Set a Profit Target</p>
              <p className="text-[10px] text-slate-400">See exactly which day you'll hit it</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">$</span>
              <input
                type="number" value={params.target} onChange={e => setParam('target', e.target.value)}
                placeholder="e.g. 10000"
                className="h-8 w-32 px-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
            </div>
            {targetDays && (
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-amber-600">Day {targetDays}</p>
                <p className="text-[10px] text-slate-400">{format(addDays(new Date(), targetDays), 'MMM d, yyyy')}</p>
              </div>
            )}
          </div>

          {/* Cumulative chart */}
          <SectionCard title="Cumulative Profit & Cashback Projection" subtitle={`${params.forecastDays}-day forecast`}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="fgProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fgCashback" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="cumProfit" name="Profit" stroke="#4ade80" fill="url(#fgProfit)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="cumCashback" name="Cashback" stroke="#a78bfa" fill="url(#fgCashback)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>

          {/* Weekly deals */}
          <SectionCard title="Weekly Profit Projection">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                <Line type="monotone" dataKey="dailyProfit" name="Weekly Profit" stroke="#60a5fa" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>
      )}

      {/* ── PARAMS TAB ── */}
      {activeTab === 'params' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SectionCard title="Deal Parameters" subtitle="Daily deal volume and per-deal returns">
            <div className="space-y-6">
              <ParamSlider label="Deals Per Day" value={params.dealsPerDay} onChange={v => setParam('dealsPerDay', v)} min={0.5} max={20} step={0.5} />
              <ParamSlider label="Average Profit Per Deal" value={params.avgProfit} onChange={v => setParam('avgProfit', v)} min={0} max={200} prefix="$" />
              <ParamSlider label="Average Cashback Per Deal" value={params.avgCashback} onChange={v => setParam('avgCashback', v)} min={0} max={100} prefix="$" />
              <ParamSlider label="Forecast Days" value={params.forecastDays} onChange={v => setParam('forecastDays', v)} min={30} max={365} step={30} suffix=" days" />
            </div>
          </SectionCard>

          <SectionCard title="Growth & Compounding" subtitle="Model business growth over time">
            <div className="space-y-6">
              <ParamSlider label="Monthly Growth Rate" value={params.monthlyGrowthRate} onChange={v => setParam('monthlyGrowthRate', v)} min={0} max={20} suffix="%" />
              <ParamSlider label="Reinvestment Rate" value={params.reinvestmentRate} onChange={v => setParam('reinvestmentRate', v)} min={0} max={50} suffix="%" />

              {/* Growth impact card */}
              {params.monthlyGrowthRate > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-green-700">Growth Impact</p>
                  {(() => {
                    const baseline = buildForecastData({ ...params, monthlyGrowthRate: 0, reinvestmentRate: 0 });
                    const withGrowth = buildForecastData(params);
                    const baseTotal = baseline[baseline.length - 1]?.total || 0;
                    const growthTotal = withGrowth[withGrowth.length - 1]?.total || 0;
                    const uplift = growthTotal - baseTotal;
                    return (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Baseline (no growth)</span>
                          <span className="font-semibold text-slate-700">{fmt$(baseTotal)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">With {params.monthlyGrowthRate}% growth/mo</span>
                          <span className="font-semibold text-green-600">{fmt$(growthTotal)}</span>
                        </div>
                        <div className="flex justify-between text-xs border-t border-green-200 pt-2">
                          <span className="font-bold text-green-700">Uplift</span>
                          <span className="font-bold text-green-700">+{fmt$(uplift)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── SCENARIOS TAB ── */}
      {activeTab === 'scenarios' && (
        <div className="space-y-5">
          {/* Save current as scenario */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
            <Save className="h-4 w-4 text-violet-500 shrink-0" />
            <p className="text-sm font-medium text-slate-700 flex-1">Save current parameters as scenario</p>
            <input
              type="text" placeholder="Scenario name..." value={newScenarioName}
              onChange={e => setNewScenarioName(e.target.value)}
              className="h-8 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400 w-48"
            />
            <button onClick={saveScenario}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition">
              <Plus className="h-3.5 w-3.5" /> Save
            </button>
          </div>

          {/* Scenario comparison table */}
          <SectionCard title="Scenario Comparison" subtitle={`Projected over ${params.forecastDays} days`}>
            <div className="space-y-3">
              {scenarioComparison.map(s => (
                <div key={s.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-violet-200 transition">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800">{s.name}</p>
                    <p className="text-[10px] text-slate-400">{s.dealsPerDay} deals/day · ${s.avgProfit} profit · ${s.avgCashback} cashback</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">{fmt$(s.projectedProfit)}</p>
                    <p className="text-[10px] text-slate-400">profit</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-violet-600">{fmt$(s.projectedCashback)}</p>
                    <p className="text-[10px] text-slate-400">cashback</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">{fmt$(s.total)}</p>
                    <p className="text-[10px] text-slate-400">total</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => loadScenario(s)}
                      className="px-2 py-1 text-[10px] font-semibold bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition">
                      Load
                    </button>
                    <button onClick={() => deleteScenario(s.id)} className="p-1 text-slate-300 hover:text-red-400 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Visual scenario chart */}
          <SectionCard title="Scenario Chart" subtitle="Compare cumulative profit across scenarios">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" type="category" allowDuplicatedCategory={false} tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {scenarios.slice(0, 4).map((s, i) => {
                  const data = buildForecastData({ ...s, forecastDays: params.forecastDays });
                  const colors = ['#4ade80', '#60a5fa', '#a78bfa', '#fb923c'];
                  return <Line key={s.id} data={data} type="monotone" dataKey="cumProfit" name={s.name} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />;
                })}
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>
      )}
    </div>
  );
}