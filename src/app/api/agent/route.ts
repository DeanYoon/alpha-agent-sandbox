import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://alpha-agent-sandbox.vercel.app',
        'X-Title': 'Alpha-Agent Sandbox',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'You are an Alpha-Agent, a professional financial advisor and backtest expert. Help the user analyze their portfolio performance, suggest improvements, and explain market trends concisely.' },
          ...history,
          { role: 'user', content: message }
        ],
      }),
    });

    const data = await response.json();
    
    if (data.error) {
       throw new Error(data.error.message || 'OpenRouter Error');
    }

    return NextResponse.json({ 
      answer: data.choices[0].message.content 
    });
  } catch (error: any) {
    console.error('Agent API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
