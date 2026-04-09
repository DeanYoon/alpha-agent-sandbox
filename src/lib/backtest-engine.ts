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
  const { tickers, allocations, rebalanceInterval, seedMoney, benchmarkTicker, period } = config;

  // Placeholder: In a real app, you'd call an external API or your internal price service.
  // For this sandbox, let's simulate fetching data.
  const activeTickers = benchmarkTicker ? Array.from(new Set([...tickers, benchmarkTicker])) : tickers;
  const prices = await fetchPrices(activeTickers, period);
  
  // Verify all requested tickers are present in the response and have same length
  const dates = Object.values(prices)[0]?.map(p => p.date) || [];
  if (dates.length === 0) {
    throw new Error(`Insufficient data for the selected period: ${period}`);
  }

  activeTickers.forEach(ticker => {
    if (!prices[ticker] || prices[ticker].length !== dates.length) {
      throw new Error(`Insufficient data for ticker: ${ticker}. Please adjust the date range or check the symbol.`);
    }
  });

  let currentBalance = seedMoney;
  let shares = tickers.map((ticker, i) => (seedMoney * allocations[i]) / prices[ticker][0].price);
  
  // Benchmark initial shares calculation
  let benchmarkShares = 0;
  if (benchmarkTicker && prices[benchmarkTicker]) {
    benchmarkShares = seedMoney / prices[benchmarkTicker][0].price;
  }

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

  let benchmarkReturn = 0;
  let benchmarkFinalBalance = seedMoney;
  if (benchmarkTicker && history.length > 0) {
    benchmarkFinalBalance = history[history.length - 1].benchmarkBalance || seedMoney;
    benchmarkReturn = (benchmarkFinalBalance - seedMoney) / seedMoney;
  }

  return {
    summary: {
      finalBalance,
      totalReturn,
      maxDrawdown,
      sharpeRatio: 0, // Placeholder
      benchmarkReturn,
      benchmarkFinalBalance,
    },
    history,
  };
}

// Fetch real price data from Yahoo Finance API
async function fetchPrices(tickers: string[], period?: string): Promise<PriceData> {
  const symbols = Array.from(new Set(tickers)).join(',');
  const fetchPeriod = period || '1y';
  const apiUrl = `https://yahoo-finance-api-seven.vercel.app/history?symbols=${symbols}&period=${fetchPeriod}`;
  
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    const filteredPrices: PriceData = {};

    Object.keys(data).forEach(ticker => {
      let tickerData = data[ticker];

      // Handle Object format: { "YYYY-MM-DD": { close: 123.45 } }
      if (tickerData && !Array.isArray(tickerData) && typeof tickerData === 'object') {
        console.log(`[API] Converting object data to array for ticker ${ticker}`);
        tickerData = Object.entries(tickerData).map(([date, values]: [string, any]) => ({
          date,
          price: values.close || values.price || 0
        }));
      }

      if (!Array.isArray(tickerData)) {
        console.warn(`[API] Invalid data format for ticker ${ticker}:`, tickerData);
        return;
      }

      filteredPrices[ticker] = tickerData
        .filter((item: any) => item.date && (item.price !== undefined || item.close !== undefined))
        .map((item: any) => ({
          date: item.date,
          price: item.price ?? item.close
        }))
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    const tickerNames = Object.keys(filteredPrices);
    if (tickerNames.length === 0) {
      console.error("[API] No valid tickers in response. Data received:", JSON.stringify(data).substring(0, 500));
      throw new Error("No price data found for the selected tickers. Please try different periods or symbols.");
    }

    // UNION: Collect all unique dates across all tickers
    const allDatesSet = new Set<string>();
    tickerNames.forEach(ticker => {
      filteredPrices[ticker].forEach(item => allDatesSet.add(item.date));
    });
    
    const sortedDates = Array.from(allDatesSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    // ALIGNMENT: Fill missing dates using the last known price forward
    const finalPrices: PriceData = {};
    tickerNames.forEach(ticker => {
      const originalData = filteredPrices[ticker];
      const alignedData: { date: string, price: number }[] = [];
      let lastPrice = originalData.length > 0 ? originalData[0].price : 0;
      
      const priceMap = new Map(originalData.map(item => [item.date, item.price]));

      sortedDates.forEach(date => {
        if (priceMap.has(date)) {
          lastPrice = priceMap.get(date)!;
        }
        alignedData.push({ date, price: lastPrice });
      });

      finalPrices[ticker] = alignedData;
    });

    return finalPrices;
  } catch (error) {
    console.error("Error fetching prices:", error);
    throw new Error("Failed to fetch market data.");
  }
}
