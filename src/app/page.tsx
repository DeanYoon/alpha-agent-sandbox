'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Brush
} from 'recharts';
import { Play, TrendingUp, AlertTriangle, Wallet, Plus, Trash2, Moon, Sun, Send, MessageSquare, Loader2, RefreshCw } from 'lucide-react';

interface Asset {
  ticker: string;
  weight: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function BacktestPage() {
  const [isClient, setIsClient] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isChatLoading]);

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
  const [darkMode, setDarkMode] = useState(true);

  const [rebalanceInterval, setRebalanceInterval] = useState<'none' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [rebalanceTriggerPercent, setRebalanceTriggerPercent] = useState<number>(0);

  const initialSummary = {
    finalBalance: 100000,
    totalReturn: 0,
    maxDrawdown: 0,
    benchmarkReturn: 0,
    benchmarkMaxDrawdown: 0,
    benchmarkFinalBalance: 100000,
  };

  const currentSummary = result?.summary || initialSummary;
  const alphaPercent = currentSummary.benchmarkReturn !== undefined 
    ? ((1 + currentSummary.totalReturn) / (1 + currentSummary.benchmarkReturn)) - 1
    : 0;

  const historyData = result?.history || [];
  const startRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (historyData.length > 0) {
      if (startRef.current) startRef.current.innerText = formatDate(historyData[0].date);
      if (endRef.current) endRef.current.innerText = formatDate(historyData[historyData.length - 1].date);
    }
  }, [historyData]);

  const handleBrushChange = (range: any) => {
    if (range && typeof range.startIndex === 'number' && typeof range.endIndex === 'number') {
      if (historyData[range.startIndex] && startRef.current) {
        startRef.current.innerText = formatDate(historyData[range.startIndex].date);
      }
      if (historyData[range.endIndex] && endRef.current) {
        endRef.current.innerText = formatDate(historyData[range.endIndex].date);
      }
    }
  };

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
          rebalanceInterval: rebalanceInterval,
          rebalanceTriggerPercent: rebalanceTriggerPercent > 0 ? rebalanceTriggerPercent : undefined,
          seedMoney: 100000,
          benchmarkTicker,
          period: period
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to run simulation');
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim() || isChatLoading) return;
    const userMsg: Message = { role: 'user', content: chatMessage };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setChatMessage('');
    setIsChatLoading(true);
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatMessage, history: chatHistory }),
      });
      const data = await response.json();
      if (data.answer) setChatHistory([...newHistory, { role: 'assistant', content: data.answer }]);
    } catch (e) { console.error(e); } finally { setIsChatLoading(false); }
  };

  return (
    <main className="flex h-screen bg-slate-50 text-slate-800 transition-colors dark:bg-slate-950 dark:text-slate-200">
      <div className={`flex-1 overflow-y-auto p-4 md:p-8 transition-all ${chatOpen ? 'mr-0 lg:mr-[400px]' : ''}`}>
        <div className="mx-auto max-w-5xl">
          <header className="mb-6 md:mb-8 flex items-center justify-between">
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">Alpha-Agent Backtester</h1>
            <div className="flex items-center gap-2 md:gap-4">
              <button onClick={toggleDarkMode} className="rounded-full p-2 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-green-500"></span> <span>Live Engine</span>
              </div>
            </div>
          </header>

          <div className="flex flex-col gap-6 md:grid lg:grid-cols-3 md:gap-8">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 font-semibold text-sm md:text-base">Strategy Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[10px] md:text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Assets & Weights</label>
                  <div className="space-y-2">
                    {assets.map((asset, index) => (
                      <div key={index} className="flex gap-2">
                        <input type="text" placeholder="Ticker" className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" value={asset.ticker} onChange={(e) => updateAsset(index, 'ticker', e.target.value.toUpperCase())} />
                        <input type="number" placeholder="%" className="w-16 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" value={asset.weight || ''} onChange={(e) => updateAsset(index, 'weight', parseFloat(e.target.value) || 0)} />
                        <button onClick={() => removeAsset(index)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={18} /></button>
                      </div>
                    ))}
                    <button onClick={addAsset} className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 dark:border-slate-700"><Plus size={14} /> Add Asset</button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] md:text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Rebalance Interval</label>
                  <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" value={rebalanceInterval} onChange={(e: any) => setRebalanceInterval(e.target.value)}>
                    <option value="none">None</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] md:text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Market Drop Trigger (%)</label>
                  <input type="number" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" value={rebalanceTriggerPercent || ''} placeholder="0 (Disabled)" onChange={(e) => setRebalanceTriggerPercent(parseFloat(e.target.value) || 0)} />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] md:text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Benchmark</label>
                  <input type="text" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" value={benchmarkTicker} onChange={(e) => setBenchmarkTicker(e.target.value.toUpperCase())} />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[1, 5, 10].map((y) => (
                    <button key={y} onClick={() => setPeriod(y)} className={`rounded-lg border py-1.5 text-xs font-medium ${period === `${y}y` ? 'bg-black text-white dark:bg-white dark:text-black' : 'border-slate-200 dark:border-slate-700'}`}>{y}Y</button>
                  ))}
                </div>

                {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-900/20">{error}</div>}
                <button onClick={handleRun} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-black py-3 text-sm font-semibold text-white dark:bg-white dark:text-black">
                  {loading ? 'Simulating...' : <><Play size={16} fill="currentColor" /> Run Backtest</>}
                </button>
              </div>
            </section>

            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="Final Balance" value={`$${Math.round(currentSummary.finalBalance).toLocaleString()}`} portfolio={`$${Math.round(currentSummary.finalBalance).toLocaleString()}`} benchmark={`$${Math.round(currentSummary.benchmarkFinalBalance || 100000).toLocaleString()}`} bTicker={benchmarkTicker} />
                <StatCard label="Total Return" value={`${(currentSummary.totalReturn * 100).toFixed(2)}%`} portfolio={`${(currentSummary.totalReturn * 100).toFixed(2)}%`} benchmark={`${((currentSummary.benchmarkReturn || 0) * 100).toFixed(2)}%`} bTicker={benchmarkTicker} />
                <StatCard label="Risk & Alpha" value={`${(alphaPercent * 100).toFixed(2)}%`} alpha={alphaPercent} pMDD={currentSummary.maxDrawdown} bMDD={currentSummary.benchmarkMaxDrawdown} bTicker={benchmarkTicker} />
              </div>

              <div className="min-h-[400px] w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-4 text-[10px] font-medium text-slate-500 uppercase">Growth of Portfolio ($100,000)</h3>
                {isClient && (
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#334155" : "#f1f5f9"} />
                        <XAxis dataKey="date" hide />
                        <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} tickFormatter={(val) => `$${Math.round(val/1000)}k`} domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ borderRadius: '12px', backgroundColor: darkMode ? '#1e293b' : '#ffffff', border: 'none' }} />
                        <Legend verticalAlign="top" height={36} />
                        <Line name="Portfolio" type="monotone" dataKey="balance" stroke={darkMode ? "#3b82f6" : "#000000"} strokeWidth={2.5} dot={false} />
                        {historyData[0]?.benchmarkBalance && <Line name={`Benchmark (${benchmarkTicker})`} type="monotone" dataKey="benchmarkBalance" stroke="#dc2626" strokeWidth={2.5} dot={false} />}
                        <Brush dataKey="date" height={30} stroke={darkMode ? "#475569" : "#64748b"} fill={darkMode ? "#0f172a" : "#f8fafc"} tickFormatter={() => ""} travellerWidth={20} onChange={handleBrushChange} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {historyData.length > 0 && isClient && (
                  <div className="mt-2 flex justify-between px-2 text-[11px] font-bold text-slate-500">
                    <div ref={startRef} className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{formatDate(historyData[0]?.date)}</div>
                    <div ref={endRef} className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{formatDate(historyData[historyData.length - 1]?.date)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className={`fixed top-0 right-0 h-full w-[400px] border-l border-slate-200 bg-white shadow-2xl transition-transform dark:border-slate-800 dark:bg-slate-900 z-50 transform ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white"><MessageSquare size={16} /></div>
              <div><h3 className="text-sm font-bold">Alpha-Agent</h3><p className="text-[10px] text-slate-500 font-mono">google/gemini-3-flash-preview</p></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setChatHistory([])} className="text-slate-400 hover:text-blue-500"><RefreshCw size={14} /></button>
              <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-red-500 lg:hidden font-bold">✕</button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center opacity-30"><TrendingUp size={48} /><p className="text-xs pt-2">How can I help with your strategy?</p></div>
            ) : chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{msg.content}</div>
              </div>
            ))}
            {isChatLoading && <div className="flex justify-start"><div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2"><Loader2 size={14} className="animate-spin text-slate-400" /></div></div>}
            <div ref={scrollRef} />
          </div>
          <div className="border-t border-slate-200 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="relative">
              <input type="text" placeholder="Ask anything..." className="w-full rounded-xl border border-slate-200 bg-white pl-4 pr-12 py-3 text-xs focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()} />
              <button onClick={sendChatMessage} disabled={isChatLoading || !chatMessage.trim()} className="absolute right-2 top-1.5 rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700 disabled:opacity-50"><Send size={16} /></button>
            </div>
          </div>
        </div>
      </aside>

      {!chatOpen && <button onClick={() => setChatOpen(true)} className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-blue-600 shadow-lg flex items-center justify-center text-white z-40"><MessageSquare size={20} /></button>}
    </main>
  );
}

function StatCard({ label, value, portfolio, benchmark, bTicker, alpha, pMDD, bMDD }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between uppercase text-[10px] font-bold text-slate-500 tracking-wider"><span>{label}</span>{alpha !== undefined ? <AlertTriangle size={14}/> : <Wallet size={14}/>}</div>
      {alpha !== undefined ? (
        <div className="space-y-1">
          <div className="flex justify-between items-end border-l-2 border-slate-900 dark:border-white pl-2"><span className="text-[10px] font-medium opacity-60">Alpha</span><span className={`text-lg font-black ${alpha >= 0 ? "text-green-600" : "text-red-600"}`}>{value}</span></div>
          <div className="flex justify-between items-end border-l-2 border-blue-500 pl-2"><span className="text-[10px] font-medium text-blue-500">Port MDD</span><span className="text-sm font-bold text-blue-600">{`-${(pMDD * 100).toFixed(1)}%`}</span></div>
          <div className="flex justify-between items-end border-l-2 border-red-500 pl-2"><span className="text-[10px] font-medium text-red-500">Bench MDD</span><span className="text-sm font-bold text-red-600">{`-${(bMDD * 100).toFixed(1)}%`}</span></div>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex justify-between items-end border-l-2 border-blue-500 pl-2"><span className="text-[10px] font-medium text-blue-500">Port</span><span className="text-lg font-black text-blue-600">{portfolio}</span></div>
          <div className="flex justify-between items-end border-l-2 border-red-500 pl-2"><span className="text-[10px] font-medium text-red-500">{bTicker}</span><span className="text-lg font-black text-red-600">{benchmark}</span></div>
        </div>
      )}
    </div>
  );
}
