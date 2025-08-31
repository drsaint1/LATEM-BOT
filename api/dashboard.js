// Vercel serverless function for web dashboard
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CryptoTip Bot Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .alert { background: #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 CryptoTip Bot</h1>
            <p>Telegram Crypto Tipping Bot Dashboard</p>
        </div>
        
        <div class="alert">
            <strong>⚠️ Static Version:</strong> This is a static dashboard for Vercel deployment. 
            For full functionality with live stats, use Railway deployment.
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <h3>📊 Bot Status</h3>
                <p>Status: <strong>Deployed on Vercel</strong></p>
                <p>Type: <strong>Static Dashboard</strong></p>
            </div>
            
            <div class="stat-card">
                <h3>💰 Supported Tokens</h3>
                <p>• USDC (Base)</p>
                <p>• USDT (Base)</p>
                <p>• ETH (Base)</p>
            </div>
            
            <div class="stat-card">
                <h3>🔗 Networks</h3>
                <p>• Base Sepolia Testnet</p>
                <p>• Base Mainnet Ready</p>
            </div>
            
            <div class="stat-card">
                <h3>🤖 Bot Commands</h3>
                <p>• /start - Create wallet</p>
                <p>• /tip - Send crypto</p>
                <p>• /balance - Check balance</p>
                <p>• /withdraw - Withdraw funds</p>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 40px;">
            <p style="color: #666;">
                <strong>Note:</strong> The Telegram bot runs separately. This dashboard shows bot information only.
                <br>For full bot functionality, deploy to Railway instead.
            </p>
        </div>
    </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}