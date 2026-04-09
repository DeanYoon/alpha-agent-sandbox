import { BacktestRequest, BacktestResult, PriceData } from '@/types/backtest';

/**
 * Backtesting Logic:
 * 1. Fetch prices for all tickers in the date range.
 * 2. Align prices by date.
 * 3. Loop through days:
 *    - Update portfolio values based on daily returns.
 *    - Rebalance on specific dates if necessary.
 *    - Record daily balance.
 * 4. Compute metrics.
 */

export async function runBacktestSimulation(config: BacktestRequest): Promise<BacktestResult> {
  const { tickers, allocations, startDate, endDate, rebalanceInterval, seedMoney, benchmarkTicker } = config;

  // Placeholder: In a real app, you'd call an external API or your internal price service.
  // For this sandbox, let's simulate fetching data.
  const activeTickers = benchmarkTicker ? [...tickers, benchmarkTicker] : tickers;
  const prices = await fetchPrices(activeTickers, startDate, endDate);
  
  const dates = Object.values(prices)[0].map(p => p.date);
  let currentBalance = seedMoney;
  let shares = tickers.map((ticker, i) => (seedMoney * allocations[i]) / prices[ticker][0].price);
  
  // Benchmark shares
  let benchmarkShares = benchmarkTicker ? seedMoney / prices[benchmarkTicker][0].price : 0;

  const history: { date: string, balance: number, benchmarkBalance?: number }[] = [];
  let maxBalance = seedMoney;
  let maxDrawdown = 0;

  for (let d = 0; d < dates.length; d++) {
    const date = dates[d];
    let totalValue = 0;
    
    for (let i = 0; i < tickers.length; i++) {
      totalValue += shares[i] * prices[tickers[i]][d].price;
    }

    const dayEntry: { date: string, balance: number, benchmarkBalance?: number } = { 
      date, 
      balance: totalValue 
    };

    if (benchmarkTicker) {
      dayEntry.benchmarkBalance = benchmarkShares * prices[benchmarkTicker][d].price;
    }

    // Daily Balance
    history.push(dayEntry);

    // Drawdown Calculation
    if (totalValue > maxBalance) maxBalance = totalValue;
    const currentDrawdown = (maxBalance - totalValue) / maxBalance;
    if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;

    // Rebalancing logic (Simplified: Monthly rebalancing on the first trading day of the month)
    const currentDate = new Date(date);
    const nextDateStr = dates[d + 1];
    if (nextDateStr && rebalanceInterval === 'monthly') {
      const nextDate = new Date(nextDateStr);
      if (nextDate.getMonth() !== currentDate.getMonth()) {
        // Rebalance
        shares = tickers.map((ticker, i) => (totalValue * allocations[i]) / prices[ticker][d].price);
      }
    }
  }

  const finalBalance = history[history.length - 1].balance;
  const totalReturn = (finalBalance - seedMoney) / seedMoney;

  return {
    summary: {
      finalBalance,
      totalReturn,
      maxDrawdown,
      sharpeRatio: 0, // Placeholder
    },
    history,
  };
}

// Mock price fetching - replace with Yahoo Finance or Alpha Vantage
async function fetchPrices(tickers: string[], start: string, end: string): Promise<PriceData> {
  // Simulating daily returns with some randomness for the sandbox logic
  const mockPrices: PriceData = {};
  const startDate = new Date(start);
  const endDate = new Date(end);
  const days: string[] = [];
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) { // Weekdays
      days.push(d.toISOString().split('T')[0]);
    }
  }

  tickers.forEach(ticker => {
    let currentPrice = 100 + Math.random() * 50;
    mockPrices[ticker] = days.map(date => {
      const change = 1 + (Math.random() - 0.48) * 0.02; // Slight upward bias
      currentPrice *= change;
      return { date, price: currentPrice };
    });
  });

  return mockPrices;
}
