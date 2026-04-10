import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

    // 1. Get Answer from OpenRouter
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
    if (data.error) throw new Error(data.error.message || 'OpenRouter Error');
    
    const answer = data.choices[0].message.content;

    // 2. Save both User Message and Assistant Answer to Supabase
    // Note: In a real app, you would use a user session ID here. 
    // For now, we use a generic 'default_user' or leave it to be extended.
    const { error: dbError } = await supabase
      .from('chat_history')
      .insert([
        { role: 'user', content: message },
        { role: 'assistant', content: answer }
      ]);

    if (dbError) {
      console.error('Supabase Save Error (ignoring):', dbError);
    }

    return NextResponse.json({ answer });
  } catch (error: any) {
    console.error('Agent API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Add GET method to fetch history
export async function GET() {
  try {
    if (!supabase) return NextResponse.json({ history: [] });
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ history: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
