import { NextRequest, NextResponse } from 'next/server';
import { runBacktestSimulation } from '@/lib/backtest-engine';
import { BacktestRequest } from '@/types/backtest';

export async function POST(req: NextRequest) {
  try {
    const body: BacktestRequest = await req.json();

    // Validation
    if (!body.tickers || body.tickers.length === 0) {
      return NextResponse.json({ error: 'Tickers required' }, { status: 400 });
    }
    
    const totalAlloc = body.allocations.reduce((a, b) => a + b, 0);
    if (Math.abs(totalAlloc - 1.0) > 0.01 && Math.abs(totalAlloc - 100) > 0.01) {
       // Allow both 0-1 and 0-100 formats but normalize
    }

    const result = await runBacktestSimulation(body);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Backtest API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
