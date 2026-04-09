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
  const [period, setSelectedPeriod] = useState('1y');

  const setPeriod = (years: number) => {
    setSelectedPeriod(`${years}y`);
  };

  useEffect(() => {
    setPeriod(1);
  }, []);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  const initialSummary = {
    finalBalance: 100000,
    totalReturn: 0,
    maxDrawdown: 0,
    benchmarkReturn: 0,
    benchmarkFinalBalance: 100000,
  };

  const currentSummary = result?.summary || initialSummary;
  const alpha = currentSummary.totalReturn - (currentSummary.benchmarkReturn || 0);
  const historyData = result?.history || [];

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

    // Dynamic period calculation for API
    let apiPeriod = period;

    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickers: tickerList,
          allocations: weightList,
          rebalanceInterval: 'monthly',
          seedMoney: 100000,
          benchmarkTicker,
          period: apiPeriod
        }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to run simulation');
      }
      
      setResult(data);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An error occurred during simulation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800 transition-colors dark:bg-slate-950 dark:text-slate-200">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 md:mb-8 flex items-center justify-between">
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">Alpha-Agent Backtester</h1>
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={toggleDarkMode}
              className="rounded-full p-2 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 dark:text-slate-400">
              <span className="h-2 w-2 rounded-full bg-green-500"></span> <span className="hidden xs:inline">Live Engine</span>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-6 md:grid lg:grid-cols-3 md:gap-8">
          {/* Controls */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 font-semibold text-sm md:text-base">Strategy Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-[10px] md:text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Assets & Weights</label>
                <div className="space-y-2">
                  {assets.map((asset, index) => (
                    <div key={index} className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Ticker"
                        className="flex-1 min-w-0 md:w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-blue-500"
                        value={asset.ticker}
                        onChange={(e) => updateAsset(index, 'ticker', e.target.value.toUpperCase())}
                      />
                      <input 
                        type="number" 
                        placeholder="%"
                        className="w-16 md:w-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-blue-500"
                        value={asset.weight || ''}
                        onChange={(e) => updateAsset(index, 'weight', parseFloat(e.target.value) || 0)}
                      />
                      <button 
                        onClick={() => removeAsset(index)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
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
                <label className="mb-1 block text-[10px] md:text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Benchmark Ticker</label>
                <input 
                  type="text" 
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-blue-500"
                  value={benchmarkTicker}
                  onChange={(e) => setBenchmarkTicker(e.target.value.toUpperCase())}
                />
              </div>



                <div className="grid grid-cols-3 gap-2">
                  {[1, 5, 10].map((y) => (
                    <button
                      key={y}
                      onClick={() => setPeriod(y)}
                      className={`rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                        period === `${y}y` 
                        ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black' 
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                      }`}
                    >
                      {y}Y
                    </button>
                  ))}
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
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-black py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-slate-200"
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
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Portfolio Group */}
                  <StatCard 
                    label="Portfolio Final Balance" 
                    value={`$${Math.round(currentSummary.finalBalance).toLocaleString()}`} 
                    icon={<Wallet className="text-blue-600 dark:text-blue-400" size={20} />}
                    isPortfolio
                  />
                  <StatCard 
                    label="Portfolio Total Return" 
                    value={`${(currentSummary.totalReturn * 100).toFixed(2)}%`} 
                    icon={<TrendingUp className="text-blue-600 dark:text-blue-400" size={20} />}
                    isPortfolio
                  />
                  <StatCard 
                    label="Portfolio Max Drawdown" 
                    value={`${(currentSummary.maxDrawdown * 100).toFixed(2)}%`} 
                    icon={<AlertTriangle className="text-slate-900 dark:text-slate-100" size={20} />}
                    isPortfolio
                  />

                  {/* Benchmark Group */}
                  <StatCard 
                    label="Benchmark Final Balance" 
                    value={`$${Math.round(currentSummary.benchmarkFinalBalance || 100000).toLocaleString()}`} 
                    icon={<Wallet className="text-red-600" size={20} />}
                    isBenchmark
                  />
                  <StatCard 
                    label="Benchmark Total Return" 
                    value={`${((currentSummary.benchmarkReturn || 0) * 100).toFixed(2)}%`} 
                    icon={<TrendingUp className="text-red-600" size={20} />}
                    isBenchmark
                  />
                  <StatCard 
                    label="Alpha" 
                    value={`${(alpha * 100).toFixed(2)}%`} 
                    icon={<TrendingUp className={alpha >= 0 ? "text-green-600" : "text-red-600"} size={20} />}
                    isAlpha
                  />
                </div>

                <div className="min-h-[400px] w-full rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="mb-4 text-[10px] md:text-sm font-medium text-slate-500 uppercase dark:text-slate-400">Growth of Portfolio ($100,000)</h3>
                  <div className="h-[300px] md:h-[350px] w-full -ml-4 md:ml-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#334155" : "#f1f5f9"} />
                      <XAxis 
                        dataKey="date" 
                        tick={{fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b'}}
                        tickFormatter={(str) => {
                          const date = new Date(str);
                          if (date.getMonth() === 0 && date.getDate() <= 7) {
                            return date.getFullYear().toString();
                          }
                          return "";
                        }}
                        interval={0}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b'}} 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `$${Math.round(val/1000)}k`}
                      />
                      <Tooltip 
                        labelClassName="text-slate-900 dark:text-slate-100 font-bold"
                        formatter={(val: any) => [`$${Math.round(val).toLocaleString()}`, "Balance"]}
                        contentStyle={{
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                          color: darkMode ? '#f1f5f9' : '#0f172a',
                          fontSize: '12px'
                        }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }}/>
                      <Line 
                        name="Portfolio"
                        type="monotone" 
                        dataKey="balance" 
                        stroke={darkMode ? "#3b82f6" : "#000000"} 
                        strokeWidth={2.5} 
                        dot={false} 
                        activeDot={{ r: 4, strokeWidth: 0, fill: darkMode ? "#3b82f6" : "#000000" }}
                      />
                      {historyData[0]?.benchmarkBalance && (
                        <Line 
                          name={`Benchmark (${benchmarkTicker})`}
                          type="monotone" 
                          dataKey="benchmarkBalance" 
                          stroke="#dc2626" 
                          strokeWidth={2} 
                          dot={false} 
                          strokeDasharray="5 5"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                  </div>
                </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value, icon, isPortfolio = false, isBenchmark = false, isAlpha = false }: any) {
  let borderColor = 'border-slate-200 dark:border-slate-800';
  let textColor = 'text-slate-900 dark:text-slate-100';

  if (isPortfolio) {
    borderColor = 'border-blue-200 dark:border-blue-900/40';
    textColor = 'text-blue-600 dark:text-blue-400';
  } else if (isBenchmark) {
    borderColor = 'border-red-200 dark:border-red-900/40';
    textColor = 'text-red-600 dark:text-red-400';
  } else if (isAlpha) {
    // Special case for Alpha - can use default or highlight high contrast
    borderColor = 'border-slate-400 dark:border-slate-500';
    textColor = 'text-slate-900 dark:text-slate-100';
  }

  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 ${borderColor}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider dark:text-slate-400">{label}</span>
        {icon}
      </div>
      <div className={`text-2xl font-black ${textColor}`}>
        {value}
      </div>
    </div>
  );
}
