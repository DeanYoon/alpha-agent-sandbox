export interface BacktestRequest {
  tickers: string[];
  allocations: number[]; // e.g., [0.4, 0.6]
  startDate: string;
  endDate: string;
  rebalanceInterval: 'monthly' | 'quarterly' | 'yearly' | 'none';
  seedMoney: number;
  benchmarkTicker?: string;
  period?: string;
}

export interface BacktestResult {
  runId?: string;
  summary: {
    finalBalance: number;
    totalReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
  };
  history: {
    date: string;
    balance: number;
    benchmarkBalance?: number;
  }[];
}

export interface PriceData {
  [ticker: string]: {
    date: string;
    price: number;
  }[];
}
