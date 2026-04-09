'use client';

import React, { useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Play, TrendingUp, AlertTriangle, Wallet } from 'lucide-react';

export default function BacktestPage() {
  const [tickers, setTickers] = useState('AAPL, MSFT, SPY');
  const [weights, setWeights] = useState('40, 40, 20');
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState('2023-12-31');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRun = async () => {
    setLoading(true);
    const tickerList = tickers.split(',').map(s => s.trim());
    const weightList = weights.split(',').map(s => parseFloat(s.trim()) / 100);

    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickers: tickerList,
          allocations: weightList,
          startDate,
          endDate,
          rebalanceInterval: 'monthly',
          seedMoney: 100000
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-800">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Alpha-Agent Backtester</h1>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="h-2 w-2 rounded-full bg-green-500"></span> Live Engine
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Controls */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold">Strategy Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-slate-500">Tickers (comma separated)</label>
                <input 
                  type="text" 
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={tickers}
                  onChange={(e) => setTickers(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-slate-500">Weights (%)</label>
                <input 
                  type="text" 
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={weights}
                  onChange={(e) => setWeights(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase text-slate-500">Start</label>
                  <input 
                    type="date" 
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase text-slate-500">End</label>
                  <input 
                    type="date" 
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <button 
                onClick={handleRun}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? 'Simulating...' : (
                  <>
                    <Play size={16} fill="currentColor" /> Run Backtest
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Results Display */}
          <div className="lg:col-span-2 space-y-6">
            {result ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <StatCard 
                    label="Final Balance" 
                    value={`$${Math.round(result.summary.finalBalance).toLocaleString()}`} 
                    icon={<Wallet className="text-blue-500" size={20} />}
                  />
                  <StatCard 
                    label="Total Return" 
                    value={`${(result.summary.totalReturn * 100).toFixed(2)}%`} 
                    icon={<TrendingUp className="text-green-500" size={20} />}
                  />
                  <StatCard 
                    label="Max Drawdown" 
                    value={`${(result.summary.maxDrawdown * 100).toFixed(2)}%`} 
                    icon={<AlertTriangle className="text-orange-500" size={20} />}
                    isNegative
                  />
                </div>

                <div className="h-80 w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-sm font-medium text-slate-500 uppercase">Growth of Portfolio ($100,000)</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.history}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        hide 
                      />
                      <YAxis 
                        tick={{fontSize: 12, fill: '#94a3b8'}} 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `$${val/1000}k`}
                      />
                      <Tooltip 
                        labelClassName="text-slate-900 font-bold"
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="balance" 
                        stroke="#0f172a" 
                        strokeWidth={2} 
                        dot={false} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                <TrendingUp size={48} className="mb-4 opacity-20" />
                <p>Enter parameters and run simulation to see results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value, icon, isNegative = false }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase text-slate-500 tracking-wider font-semibold">{label}</span>
        {icon}
      </div>
      <div className={`text-2xl font-bold ${isNegative ? 'text-red-600' : 'text-slate-900'}`}>
        {value}
      </div>
    </div>
  );
}
