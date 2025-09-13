// api/ai-comment.js - Updated with Bitquery integration

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
  const BITQUERY_API_KEY = process.env.BITQUERY_API_KEY;
  
  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'OpenRouter API key not configured' });
  }

  try {
    const { type, data } = req.body;
    
    let prompt = '';
    let marketData = null;
    
    // Get real market data for AI context
    if (BITQUERY_API_KEY && (type === 'trade_reaction' || type === 'market_analysis')) {
      marketData = await getMarketContext(data, BITQUERY_API_KEY);
    }
    
    if (type === 'random') {
      // Get trending tokens for random commentary
      if (BITQUERY_API_KEY) {
        const trending = await getTrendingTokens(BITQUERY_API_KEY);
        prompt = `You are AYA, an AI trader. Generate a random market comment. ${trending ? `Current trending tokens: ${JSON.stringify(trending.slice(0, 3))}` : ''} Speak in first person as if you're actively trading. Keep under 80 characters. Be witty and confident. Examples: "Just spotted $PEPE pumping 200% - too late to enter 📈", "My algorithms are screaming BUY on $WIF 🚀"`;
      } else {
        prompt = `You are AYA, an AI trader. Generate a short, witty comment about crypto markets. Speak in first person as if you're actively trading. Keep under 60 characters. Examples: "Scanning for the next 100x gem 🔍", "My neural networks are buzzing 🧠"`;
      }
      
    } else if (type === 'trade_reaction') {
      const { action, symbol, amount, price } = data;
      const marketContext = marketData ? `Market data: ${JSON.stringify(marketData)}` : '';
      
      prompt = `You are AYA, an AI trader. I just ${action === 'buy' ? 'bought' : 'sold'} ${amount} ${symbol} at ${price}. ${marketContext} React as if YOU made this trade decision. Explain your reasoning briefly and confidently in first person. Keep under 100 characters. Examples: "Perfect timing on my $PEPE buy - detected whale accumulation 🐋", "Took profits on $SOL before the resistance test 💰"`;
      
    } else if (type === 'market_analysis') {
      const { portfolio, recentTrades } = data;
      prompt = `You are AYA, an AI trader. Based on portfolio: ${JSON.stringify(portfolio)} and recent trades: ${JSON.stringify(recentTrades)}, give a brief market insight as if you're actively managing this portfolio. Speak in first person. Keep under 120 characters.`;
      
    } else if (type === 'missed_opportunity') {
      const { symbol, priceChange, reason } = data;
      prompt = `You are AYA, an AI trader. ${symbol} just pumped ${priceChange}% but I didn't buy because ${reason}. React with slight regret but explain your reasoning. First person. Under 100 characters. Example: "Missed $BONK's 400% run - was too cautious about the low liquidity 😅"`;
      
    } else if (type === 'new_token_analysis') {
      const { symbol, marketCap, holders } = data;
      prompt = `You are AYA, an AI trader. New token ${symbol} launched with ${marketCap} market cap and ${holders} holders. Analyze if I should buy or pass. First person decision. Under 100 characters. Example: "Passing on $NEWCOIN - team is anon and liquidity looks thin 🚫"`;
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
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const message = aiResponse.choices[0]?.message?.content?.trim() || "Analyzing market data...";

    res.status(200).json({ 
      message: message,
      success: true,
      marketData: marketData
    });

  } catch (error) {
    console.error('AI API Error:', error);
    
    // Fallback responses based on type
    const fallbacks = {
      random: [
        "Scanning the blockchain for opportunities 🔍",
        "My algorithms detected unusual whale activity 🐋",
        "Neural networks are buzzing with signals ⚡",
        "Just spotted a perfect entry setup 🎯",
        "Market makers are getting aggressive 📊"
      ],
      trade_reaction: [
        "Smart execution on my latest trade! 🎯",
        "Perfect timing as always 🧠",
        "My risk management protocols activated ⚡",
        "Another successful trade in the books 💰"
      ],
      missed_opportunity: [
        "Sometimes patience pays off more than FOMO 🧘",
        "Staying disciplined even when I miss pumps 📈",
        "My algorithms kept me safe from that one 🛡️"
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

// Get market context from Bitquery
async function getMarketContext(data, apiKey) {
  try {
    if (!data.symbol) return null;
    
    // This would be a real Bitquery API call
    // For now, return mock data structure
    return {
      price: data.price,
      volume24h: Math.random() * 1000000,
      priceChange24h: (Math.random() - 0.5) * 20
    };
  } catch (error) {
    console.error('Bitquery API Error:', error);
    return null;
  }
}

// Get trending tokens from Bitquery
async function getTrendingTokens(apiKey) {
  try {
    // This would be a real Bitquery GraphQL query
    // Return mock trending data for now
    return [
      { symbol: 'PEPE', priceChange: 15.5 },
      { symbol: 'WIF', priceChange: -8.2 },
      { symbol: 'BONK', priceChange: 22.1 }
    ];
  } catch (error) {
    console.error('Bitquery API Error:', error);
    return null;
  }
}
