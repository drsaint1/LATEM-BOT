const express = require('express');
const qrcode = require('qrcode');

class WhatsAppQRServer {
    constructor(port = 3001) {
        this.port = port;
        this.app = express();
        this.currentQR = null;
        this.setupRoutes();
    }

    setupRoutes() {
        // Serve QR code as web page
        this.app.get('/whatsapp-qr', async (req, res) => {
            if (!this.currentQR) {
                return res.send(`
                    <html>
                        <head><title>WhatsApp QR Code</title></head>
                        <body style="text-align: center; font-family: Arial;">
                            <h1>WhatsApp Bot Setup</h1>
                            <p>Waiting for QR code...</p>
                            <p>Make sure the bot is running!</p>
                            <script>setTimeout(() => location.reload(), 3000);</script>
                        </body>
                    </html>
                `);
            }

            try {
                const qrImage = await qrcode.toDataURL(this.currentQR);
                res.send(`
                    <html>
                        <head>
                            <title>WhatsApp QR Code - CryptoTip Bot</title>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        </head>
                        <body style="text-align: center; font-family: Arial; padding: 20px;">
                            <h1>🤖 CryptoTip Bot - WhatsApp Setup</h1>
                            <p><strong>Scan this QR code with your WhatsApp mobile app:</strong></p>
                            <div style="margin: 20px 0;">
                                <img src="${qrImage}" alt="WhatsApp QR Code" style="max-width: 300px; border: 1px solid #ddd; padding: 10px;">
                            </div>
                            <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; max-width: 500px; margin: 0 auto;">
                                <h3>📱 How to scan:</h3>
                                <ol style="text-align: left;">
                                    <li>Open WhatsApp on your phone</li>
                                    <li>Go to Settings > Linked Devices</li>
                                    <li>Tap "Link a Device"</li>
                                    <li>Point your camera at this QR code</li>
                                </ol>
                            </div>
                            <p style="margin-top: 20px; color: #666;">
                                ⚠️ This connects the bot to your WhatsApp account.<br>
                                Users will message your WhatsApp number to use the bot.
                            </p>
                            <script>
                                // Auto refresh every 30 seconds
                                setTimeout(() => location.reload(), 30000);
                            </script>
                        </body>
                    </html>
                `);
            } catch (error) {
                res.status(500).send('Error generating QR code');
            }
        });

        // API endpoint for QR code data
        this.app.get('/api/whatsapp-qr', async (req, res) => {
            if (!this.currentQR) {
                return res.json({ status: 'waiting', message: 'No QR code available' });
            }
            
            try {
                const qrImage = await qrcode.toDataURL(this.currentQR);
                res.json({ 
                    status: 'ready', 
                    qr: this.currentQR,
                    qrImage: qrImage
                });
            } catch (error) {
                res.status(500).json({ error: 'Failed to generate QR code' });
            }
        });
    }

    updateQR(qr) {
        this.currentQR = qr;
        console.log(`📱 WhatsApp QR code updated. View at: http://localhost:${this.port}/whatsapp-qr`);
    }

    clearQR() {
        this.currentQR = null;
    }

    start() {
        this.server = this.app.listen(this.port, () => {
            console.log(`📱 WhatsApp QR server running on http://localhost:${this.port}/whatsapp-qr`);
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`⚠️  Port ${this.port} is busy, trying port ${this.port + 1}...`);
                this.port += 1;
                setTimeout(() => this.start(), 1000);
            } else {
                console.error('WhatsApp QR server error:', err);
            }
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
        }
    }
}

module.exports = WhatsAppQRServer;