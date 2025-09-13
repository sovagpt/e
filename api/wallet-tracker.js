// api/wallet-tracker.js - Bitquery wallet tracking API

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const BITQUERY_API_KEY = process.env.BITQUERY_API_KEY;
  
  if (!BITQUERY_API_KEY) {
    return res.status(500).json({ error: 'Bitquery API key not configured' });
  }

  try {
    const { action, walletAddress, since } = req.query;

    if (action === 'transactions') {
      const trades = await getWalletTransactions(walletAddress, since, BITQUERY_API_KEY);
      return res.status(200).json({ trades, success: true });
      
    } else if (action === 'trending') {
      const trending = await getTrendingTokens(BITQUERY_API_KEY);
      return res.status(200).json({ trending, success: true });
      
    } else if (action === 'new-tokens') {
      const newTokens = await getNewTokens(BITQUERY_API_KEY);
      return res.status(200).json({ newTokens, success: true });
      
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Bitquery API Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch data',
      success: false 
    });
  }
}

async function getWalletTransactions(walletAddress, since, apiKey) {
  const query = `
    query WalletTransactions($address: String!, $since: DateTime!) {
      Solana {
        DEXTradeByTokens(
          where: {
            Transaction: {Signer: {is: $address}}
            Trade: {Dex: {ProtocolName: {is: "pump"}}}
            Block: {Time: {since: $since}}
          }
          orderBy: {descending: Block_Time}
          limit: {count: 50}
        ) {
          Block {
            Time
            Slot
          }
          Trade {
            Currency {
              Name
              Symbol
              MintAddress
            }
            Side {
              Type
              Amount
              AmountInUSD
            }
            PriceInUSD
            Market {
              MarketAddress
            }
          }
          Transaction {
            Signature
            Fee
            FeeInUSD
          }
        }
      }
    }
  `;

  const variables = {
    address: walletAddress,
    since: since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  };

  const response = await fetch('https://streaming.bitquery.io/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  const data = await response.json();
  
  if (data.errors) {
    throw new Error('GraphQL errors: ' + JSON.stringify(data.errors));
  }

  return data.data.Solana.DEXTradeByTokens.map(trade => ({
    timestamp: trade.Block.Time,
    action: trade.Trade.Side.Type,
    symbol: trade.Trade.Currency.Symbol,
    name: trade.Trade.Currency.Name,
    amount: parseFloat(trade.Trade.Side.Amount),
    price: parseFloat(trade.Trade.PriceInUSD),
    total: parseFloat(trade.Trade.Side.AmountInUSD),
    signature: trade.Transaction.Signature,
    mintAddress: trade.Trade.Currency.MintAddress
  }));
}

async function getTrendingTokens(apiKey) {
  const query = `
    query TrendingPumpFunTokens($since: DateTime!) {
      Solana {
        DEXTradeByTokens(
          where: {
            Trade: {Dex: {ProtocolName: {is: "pump"}}}
            Block: {Time: {since: $since}}
          }
          orderBy: {descendingByField: "volume"}
          limit: {count: 20}
        ) {
          Trade {
            Currency {
              Name
              Symbol
              MintAddress
            }
            PriceInUSD(maximum: Block_Time)
          }
          volume: sum(of: Trade_Side_AmountInUSD)
          trades: count
          buyers: uniq(of: Transaction_Signer, if: {Trade: {Side: {Type: {is: buy}}}})
        }
      }
    }
  `;

  const variables = {
    since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  };

  const response = await fetch('https://streaming.bitquery.io/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  const data = await response.json();
  
  if (data.errors) {
    throw new Error('GraphQL errors: ' + JSON.stringify(data.errors));
  }

  return data.data.Solana.DEXTradeByTokens.map(token => ({
    symbol: token.Trade.Currency.Symbol,
    name: token.Trade.Currency.Name,
    price: parseFloat(token.Trade.PriceInUSD),
    volume24h: parseFloat(token.volume),
    trades24h: parseInt(token.trades),
    buyers24h: parseInt(token.buyers),
    mintAddress: token.Trade.Currency.MintAddress
  }));
}

async function getNewTokens(apiKey) {
  const query = `
    query NewPumpFunTokens($since: DateTime!) {
      Solana {
        TokenSupplyUpdates(
          where: {
            TokenSupplyUpdate: {
              Currency: {TokenCreator: {Address: {includes: {is: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"}}}}
              Amount: {gt: "0"}
            }
            Block: {Time: {since: $since}}
          }
          orderBy: {descending: Block_Time}
          limit: {count: 50}
        ) {
          TokenSupplyUpdate {
            Currency {
              Name
              Symbol
              MintAddress
              TokenCreator {
                Address
              }
            }
            Amount
          }
          Block {
            Time
          }
        }
      }
    }
  `;

  const variables = {
    since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  };

  const response = await fetch('https://streaming.bitquery.io/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  const data = await response.json();
  
  if (data.errors) {
    throw new Error('GraphQL errors: ' + JSON.stringify(data.errors));
  }

  return data.data.Solana.TokenSupplyUpdates.map(token => ({
    symbol: token.TokenSupplyUpdate.Currency.Symbol,
    name: token.TokenSupplyUpdate.Currency.Name,
    mintAddress: token.TokenSupplyUpdate.Currency.MintAddress,
    launchTime: token.Block.Time,
    totalSupply: parseFloat(token.TokenSupplyUpdate.Amount),
    creator: token.TokenSupplyUpdate.Currency.TokenCreator.Address
  }));
}
