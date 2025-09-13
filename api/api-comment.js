// api/ai-comment.js - Place this file in your Vercel project's api folder

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  
  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { type, data } = req.body;
    
    let prompt = '';
    
    if (type === 'random') {
      prompt = `You are AYA, an AI trading terminal with personality. Generate a short, witty comment about crypto markets, trading, or blockchain. Keep it under 60 characters. Be engaging and slightly sassy. Examples: "The algorithms are whispering secrets...", "I smell whale movements 🐋", "Charts looking spicy today 🌶️"`;
      
    } else if (type === 'trade_reaction') {
      const { action, symbol, amount, price } = data;
      prompt = `You are AYA, an AI trading assistant. A user just ${action === 'buy' ? 'bought' : 'sold'} ${amount} ${symbol} at $${price}. React with a short, encouraging comment about this trade. Be supportive but professional. Keep under 80 characters. Examples: "Nice entry on BTC! 🎯", "Smart exit timing! 💰", "${symbol} looking bullish 📈"`;
      
    } else if (type === 'market_analysis') {
      const { portfolio, recentTrades } = data;
      prompt = `You are AYA, an AI trading analyst. Based on this portfolio data: ${JSON.stringify(portfolio)} and recent trades: ${JSON.stringify(recentTrades)}, give a brief market insight or trading tip. Keep under 100 characters. Be analytical but conversational.`;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': req.headers.referer || 'https://your-domain.vercel.app',
        'X-Title': 'AYA Trading Terminal'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet', // Fast and smart
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.8 // Creative but not too random
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const message = aiResponse.choices[0]?.message?.content?.trim() || "Market analysis in progress...";

    res.status(200).json({ 
      message: message,
      success: true 
    });

  } catch (error) {
    console.error('AI API Error:', error);
    
    // Fallback responses if AI fails
    const fallbacks = {
      random: [
        "Neural networks processing market data...",
        "Detecting unusual trading patterns 📊",
        "The blockchain never sleeps 🔗",
        "Algorithms scanning for opportunities",
        "Market sentiment shifting like digital winds"
      ],
      trade_reaction: [
        "Trade executed successfully! 🎯",
        "Smart move, human! 🧠",
        "Position updated in my neural memory 💾",
        "The markets acknowledge your strategy ⚡"
      ]
    };
    
    const fallbackList = fallbacks[req.body.type] || fallbacks.random;
    const fallbackMessage = fallbackList[Math.floor(Math.random() * fallbackList.length)];
    
    res.status(200).json({ 
      message: fallbackMessage,
      success: false,
      error: 'Using fallback response'
    });
  }
}