'use client';

import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Play, TrendingUp, AlertTriangle, Wallet, Plus, Trash2, Moon, Sun } from 'lucide-react';

interface Asset {
  ticker: string;
  weight: number;
}

export default function BacktestPage() {
  const [assets, setAssets] = useState<Asset[]>([
    { ticker: 'AAPL', weight: 40 },
    { ticker: 'MSFT', weight: 40 },
    { ticker: 'SPY', weight: 20 },
  ]);
  const [benchmarkTicker, setBenchmarkTicker] = useState('SPY');
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState('2023-12-31');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const addAsset = () => {
    setAssets([...assets, { ticker: '', weight: 0 }]);
  };

  const removeAsset = (index: number) => {
    setAssets(assets.filter((_, i) => i !== index));
  };

  const updateAsset = (index: number, field: keyof Asset, value: string | number) => {
    const newAssets = [...assets];
    newAssets[index] = { ...newAssets[index], [field]: value };
    setAssets(newAssets);
  };

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const handleRun = async () => {
    setError(null);
    const totalWeight = assets.reduce((sum, asset) => sum + asset.weight, 0);
    
    if (Math.abs(totalWeight - 100) > 0.01) {
      setError(`Total weight must be 100%. Current: ${totalWeight}%`);
      return;
    }

    if (assets.some(a => !a.ticker)) {
      setError('All assets must have a ticker.');
      return;
    }

    setLoading(true);
    const tickerList = assets.map(a => a.ticker);
    const weightList = assets.map(a => a.weight / 100);

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
          seedMoney: 100000,
          benchmarkTicker
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (e) {
      console.error(e);
      setError('An error occurred during simulation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-800 transition-colors dark:bg-slate-950 dark:text-slate-200">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Alpha-Agent Backtester</h1>
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleDarkMode}
              className="rounded-full p-2 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="h-2 w-2 rounded-full bg-green-500"></span> Live Engine
            </div>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Controls */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 font-semibold">Strategy Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Assets & Weights</label>
                <div className="space-y-2">
                  {assets.map((asset, index) => (
                    <div key={index} className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Ticker"
                        className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                        value={asset.ticker}
                        onChange={(e) => updateAsset(index, 'ticker', e.target.value.toUpperCase())}
                      />
                      <input 
                        type="number" 
                        placeholder="%"
                        className="w-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                        value={asset.weight || ''}
                        onChange={(e) => updateAsset(index, 'weight', parseFloat(e.target.value) || 0)}
                      />
                      <button 
                        onClick={() => removeAsset(index)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={addAsset}
                    className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-600 dark:border-slate-700 dark:text-slate-400"
                  >
                    <Plus size={14} /> Add Asset
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Benchmark Ticker</label>
                <input 
                  type="text" 
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                  value={benchmarkTicker}
                  onChange={(e) => setBenchmarkTicker(e.target.value.toUpperCase())}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Start</label>
                  <input 
                    type="date" 
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase text-slate-500 dark:text-slate-400">End</label>
                  <input 
                    type="date" 
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  <AlertTriangle size={14} />
                  {error}
                </div>
              )}

              <button 
                onClick={handleRun}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
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

                <div className="h-80 w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="mb-4 text-sm font-medium text-slate-500 uppercase dark:text-slate-400">Growth of Portfolio ($100,000)</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.history}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#334155" : "#f1f5f9"} />
                      <XAxis 
                        dataKey="date" 
                        hide 
                      />
                      <YAxis 
                        tick={{fontSize: 12, fill: darkMode ? '#64748b' : '#94a3b8'}} 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `$${val/1000}k`}
                      />
                      <Tooltip 
                        labelClassName="text-slate-900 dark:text-slate-100 font-bold"
                        contentStyle={{
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                          color: darkMode ? '#f1f5f9' : '#0f172a'
                        }}
                      />
                      <Legend />
                      <Line 
                        name="Portfolio"
                        type="monotone" 
                        dataKey="balance" 
                        stroke={darkMode ? "#3b82f6" : "#0f172a"} 
                        strokeWidth={2} 
                        dot={false} 
                      />
                      {result.history[0]?.benchmarkBalance && (
                        <Line 
                          name={`Benchmark (${benchmarkTicker})`}
                          type="monotone" 
                          dataKey="benchmarkBalance" 
                          stroke="#94a3b8" 
                          strokeWidth={2} 
                          strokeDasharray="5 5"
                          dot={false} 
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-600">
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase text-slate-500 tracking-wider font-semibold dark:text-slate-400">{label}</span>
        {icon}
      </div>
      <div className={`text-2xl font-bold ${isNegative ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'}`}>
        {value}
      </div>
    </div>
  );
}
