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

// Fetch real price data from Yahoo Finance API
async function fetchPrices(tickers: string[], start: string, end: string): Promise<PriceData> {
  const symbols = Array.from(new Set(tickers)).join(',');
  const apiUrl = `https://yahoo-finance-api-seven.vercel.app/history?symbols=${symbols}&period=max`;
  
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    // The data is expected to be an object with tickers as keys, each containing an array of {date, price}
    // We need to filter based on start/end dates
    const filteredPrices: PriceData = {};
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);

    Object.keys(data).forEach(ticker => {
      filteredPrices[ticker] = data[ticker]
        .filter((item: { date: string, price: number }) => {
          const itemDate = new Date(item.date);
          return itemDate >= startDateObj && itemDate <= endDateObj;
        })
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    // Ensure all tickers have the same dates (find common intersection)
    const commonDatesSet = new Set<string>();
    const tickerNames = Object.keys(filteredPrices);
    if (tickerNames.length === 0) return {};

    // Use the first ticker's dates as a starting point
    filteredPrices[tickerNames[0]].forEach(item => commonDatesSet.add(item.date));

    // Intersect with other tickers
    for (let i = 1; i < tickerNames.length; i++) {
      const currentTickerDates = new Set(filteredPrices[tickerNames[i]].map(item => item.date));
      for (const date of commonDatesSet) {
        if (!currentTickerDates.has(date)) {
          commonDatesSet.delete(date);
        }
      }
    }

    const commonDates = Array.from(commonDatesSet).sort();
    const finalPrices: PriceData = {};

    tickerNames.forEach(ticker => {
      finalPrices[ticker] = filteredPrices[ticker].filter(item => commonDatesSet.has(item.date));
    });

    return finalPrices;
  } catch (error) {
    console.error("Error fetching prices:", error);
    throw new Error("Failed to fetch market data.");
  }
}
