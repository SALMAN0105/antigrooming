const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const PORT = 3000;

// Middleware for parsing JSON body
app.use(express.json());

// Initialize WhatsApp Client with LocalAuth for session persistence
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // helps run faster on low-end VMs/containers
            '--disable-gpu'
        ]
    }
});

let isClientReady = false;

// Generate QR Code in terminal for scanning
client.on('qr', (qr) => {
    console.log('=== AUTHENTICATION REQUIRED ===');
    console.log('Scan the QR code below using your WhatsApp Linked Devices:');
    qrcode.generate(qr, { small: true });
});

// Client is ready to send messages
client.on('ready', () => {
    console.log('✅ WhatsApp Web Client is READY!');
    isClientReady = true;
});

// Handle authentication failure
client.on('auth_failure', (msg) => {
    console.error('❌ Authentication Failure:', msg);
});

// Handle disconnection
client.on('disconnected', (reason) => {
    console.warn('⚠️ WhatsApp client was disconnected:', reason);
    isClientReady = false;
    // Reinitialize
    client.initialize().catch(err => console.error('Error reinitializing after disconnect:', err));
});

// Initialize client
console.log('Initializing WhatsApp Client...');
client.initialize().catch(err => {
    console.error('Failed to initialize WhatsApp client:', err);
});

/**
 * Clean and format Indonesian phone numbers to WhatsApp API format
 * Examples:
 *   '08123456789' -> '628123456789@c.us'
 *   '+62 812-3456-789' -> '628123456789@c.us'
 *   '628123456789' -> '628123456789@c.us'
 */
function sanitizePhoneNumber(number) {
    if (!number || typeof number !== 'string') return '';
    
    // Remove all non-digit characters
    let cleaned = number.replace(/\D/g, '');
    
    // Replace leading '0' with '62'
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.slice(1);
    }
    
    // If it starts with '62', format as WhatsApp user ID, otherwise leave it
    if (!cleaned.endsWith('@c.us')) {
        cleaned = cleaned + '@c.us';
    }
    
    return cleaned;
}

// Endpoint to send WhatsApp message
app.post('/kirim-wa', async (req, res) => {
    const { nomor, pesan } = req.body;

    if (!nomor || !pesan) {
        return res.status(400).json({
            status: 'error',
            message: 'Parameter "nomor" dan "pesan" harus diisi.'
        });
    }

    if (!isClientReady) {
        return res.status(503).json({
            status: 'error',
            message: 'WhatsApp Web Client sedang tidak siap. Silakan scan QR code terlebih dahulu.'
        });
    }

    const formattedNumber = sanitizePhoneNumber(nomor);

    try {
        console.log(`Sending WhatsApp message to: ${formattedNumber}`);
        
        // Send the message using whatsapp-web.js
        const chat = await client.sendMessage(formattedNumber, pesan);
        
        return res.status(200).json({
            status: 'success',
            message: 'Pesan berhasil dikirim.',
            messageId: chat.id._serialized
        });
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Gagal mengirim pesan WhatsApp.',
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/status', (req, res) => {
    res.json({
        status: 'success',
        client_ready: isClientReady
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Node.js Express service running on http://localhost:${PORT}`);
});
