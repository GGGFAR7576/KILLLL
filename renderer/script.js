const { ipcRenderer } = require('electron');

// DOM Elements
const minimizeBtn = document.getElementById('minimize-btn');
const maximizeBtn = document.getElementById('maximize-btn');
const closeBtn = document.getElementById('close-btn');
const connectBtn = document.getElementById('connect-btn');
const breachBtn = document.getElementById('breach-btn');
const serverIpInput = document.getElementById('server-ip');
const phoneNumberInput = document.getElementById('phone-number');
const appSelect = document.getElementById('app-select');
const attackProfile = document.getElementById('attack-profile');
const regionSelect = document.getElementById('region-select');
const moduleHijack = document.getElementById('module-hijack');
const moduleMitm = document.getElementById('module-mitm');
const moduleToken = document.getElementById('module-token');
const moduleCert = document.getElementById('module-cert');
const offlineDemo = document.getElementById('offline-demo');
const terminal = document.getElementById('terminal');
const progressFill = document.getElementById('progress-fill');
const progressPercent = document.getElementById('progress-percent');
const progressText = document.getElementById('progress-text');
const connectionStatus = document.getElementById('connection-status');
const statusText = document.getElementById('status-text');
const timeDisplay = document.getElementById('time-display');
const sessionId = document.getElementById('session-id');
const successOverlay = document.getElementById('success-overlay');
const titlebarDrag = document.querySelector('.titlebar-drag');
const reloadBtn = document.getElementById('reload-btn');
// Badges
const badgeApp = document.getElementById('badge-app');
const badgeProfile = document.getElementById('badge-profile');
const badgeRegion = document.getElementById('badge-region');
const badgeMode = document.getElementById('badge-mode')?.querySelector('strong');
const badgeSessionId = document.getElementById('badge-session-id');
const progressSteps = document.getElementById('progress-steps');
// Advanced modal elements
const advancedBtn = document.getElementById('advanced-btn');
const advancedModal = document.getElementById('advanced-modal');
const advancedClose = document.getElementById('advanced-close');
const advancedX = document.getElementById('advanced-x');
const advancedSave = document.getElementById('advanced-save');
// Checkboxes/inputs inside modal
const adv = {
    mitm_sslstrip: document.getElementById('mitm-sslstrip'),
    mitm_arp: document.getElementById('mitm-arp'),
    mitm_dns: document.getElementById('mitm-dns'),
    mitm_pin: document.getElementById('mitm-pin'),
    sess_cookie: document.getElementById('sess-cookie'),
    sess_ws: document.getElementById('sess-ws'),
    sess_qr: document.getElementById('sess-qr'),
    sess_oauth: document.getElementById('sess-oauth'),
    proto_xmpp: document.getElementById('proto-xmpp'),
    proto_e2e: document.getElementById('proto-e2e'),
    proto_multi: document.getElementById('proto-multi'),
    proto_push: document.getElementById('proto-push'),
    net_ports: document.getElementById('net-ports'),
    net_sniff: document.getElementById('net-sniff'),
    net_traffic: document.getElementById('net-traffic'),
    net_proxy: document.getElementById('net-proxy')
};

let connected = false;
let advancedConfig = getAdvancedConfigFromUI();

// Advanced modal helpers (global scope)
function openAdvanced() {
    if (advancedModal) advancedModal.style.display = 'block';
}
function closeAdvanced() {
    if (advancedModal) advancedModal.style.display = 'none';
}
function getAdvancedConfigFromUI() {
    const ports = (adv.net_ports?.value || '443,5222,8080')
        .split(',')
        .map(p => p.trim())
        .filter(Boolean);
    return {
        mitm: {
            sslStrip: !!adv.mitm_sslstrip?.checked,
            arp: !!adv.mitm_arp?.checked,
            dns: !!adv.mitm_dns?.checked,
            pinBypass: !!adv.mitm_pin?.checked
        },
        session: {
            cookie: !!adv.sess_cookie?.checked,
            ws: !!adv.sess_ws?.checked,
            qr: !!adv.sess_qr?.checked,
            oauth: !!adv.sess_oauth?.checked
        },
        protocol: {
            xmpp: !!adv.proto_xmpp?.checked,
            e2e: !!adv.proto_e2e?.checked,
            multi: !!adv.proto_multi?.checked,
            push: !!adv.proto_push?.checked
        },
        network: {
            ports,
            sniff: !!adv.net_sniff?.checked,
            traffic: !!adv.net_traffic?.checked,
            proxy: !!adv.net_proxy?.checked
        }
    };
}

// Modal events (global scope)
advancedBtn?.addEventListener('click', openAdvanced);
advancedClose?.addEventListener('click', closeAdvanced);
advancedX?.addEventListener('click', closeAdvanced);
advancedSave?.addEventListener('click', () => {
    advancedConfig = getAdvancedConfigFromUI();
    addLog('success', 'Тонкие настройки сохранены');
    closeAdvanced();
});

// Make modal draggable
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
const modalDialog = document.querySelector('.modal-dialog');
const modalHeader = document.querySelector('.modal-header');

if (modalHeader && modalDialog) {
    modalHeader.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = modalDialog.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        modalDialog.style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const x = e.clientX - dragOffsetX;
        const y = e.clientY - dragOffsetY;
        
        // Ограничения, чтобы окно не уходило за границы
        const maxX = window.innerWidth - modalDialog.offsetWidth;
        const maxY = window.innerHeight - modalDialog.offsetHeight;
        
        const clampedX = Math.max(0, Math.min(x, maxX));
        const clampedY = Math.max(0, Math.min(y, maxY));
        
        modalDialog.style.left = clampedX + 'px';
        modalDialog.style.top = clampedY + 'px';
        modalDialog.style.transform = 'none';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            modalDialog.style.transition = '';
        }
    });
}

// ESC closes modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAdvanced();
});

// Global hotkeys: reload (F5/Ctrl+R) and quit (Ctrl+Q)
document.addEventListener('keydown', (e) => {
    if (e.key === 'F5' || (e.ctrlKey && (e.key === 'r' || e.key === 'R'))) {
        e.preventDefault();
        ipcRenderer.send('reload-window');
    }
    if (e.ctrlKey && (e.key === 'q' || e.key === 'Q')) {
        e.preventDefault();
        ipcRenderer.send('quit-app');
    }
});

// Window Controls
minimizeBtn.addEventListener('click', () => {
    ipcRenderer.send('minimize-window');
});

maximizeBtn.addEventListener('click', () => {
    ipcRenderer.send('maximize-window');
});

closeBtn.addEventListener('click', () => {
    ipcRenderer.send('close-window');
});

// Double click titlebar toggles maximize
titlebarDrag?.addEventListener('dblclick', () => {
    ipcRenderer.send('maximize-window');
});

// Reload button
reloadBtn?.addEventListener('click', () => {
    ipcRenderer.send('reload-window');
});

// Connect Button
connectBtn.addEventListener('click', () => {
    let serverIp = serverIpInput.value.trim();

    // 1) Оффлайн-демо работает без адреса
    if (offlineDemo && offlineDemo.checked) {
        addLog('success', 'КАНАЛ СИНХРОНИЗИРОВАН (ОФФЛАЙН)');
        connected = true;
        connectionStatus.classList.add('connected');
        statusText.textContent = 'ПОДКЛЮЧЕНО';
        breachBtn.disabled = false;
        const sid = generateSessionId();
        sessionId.textContent = sid;
        badgeSessionId.textContent = sid;
        updateBadges();
        return;
    }

    // 2) Онлайн: если адрес пуст — автоподстановка 127.0.0.1
    if (!serverIp) {
        serverIp = '127.0.0.1';
        serverIpInput.value = serverIp;
        addLog('info', 'Адрес сервера не указан — использую 127.0.0.1');
    }

    addLog('info', 'Устанавливаю соединение с сервером...');
    addLog('info', `Цель: ${serverIp}:8080`);

    ipcRenderer.send('connect-server', serverIp);
    updateBadges();
});

// Breach Button
breachBtn.addEventListener('click', () => {
    const phoneNumber = phoneNumberInput.value.trim();
    const app = (appSelect?.value || 'viber').toLowerCase();
    const profile = attackProfile?.value || 'standard';
    const region = regionSelect?.value || 'eu';
    const modules = {
        hijack: !!(moduleHijack && moduleHijack.checked),
        mitm: !!(moduleMitm && moduleMitm.checked),
        token: !!(moduleToken && moduleToken.checked),
        cert: !!(moduleCert && moduleCert.checked)
    };
    
    if (!phoneNumber) {
        addLog('error', 'ERROR: Target identifier required');
        return;
    }

    if (!connected) {
        addLog('error', 'ERROR: No active server connection');
        return;
    }

    // Оффлайн‑демо: проигрываем сценарий локально
    if (offlineDemo && offlineDemo.checked) {
        breachBtn.disabled = true;
        connectBtn.disabled = true;
        runOfflineDemo({ phoneNumber, app, profile, region, modules });
        return;
    }

    breachBtn.disabled = true;
    connectBtn.disabled = true;
    
    // refresh advanced config before send
    advancedConfig = getAdvancedConfigFromUI();
    ipcRenderer.send('start-breach', { phoneNumber, app, profile, region, modules, advancedConfig });
});

// IPC Listeners
ipcRenderer.on('log-message', (event, data) => {
    addLog(data.type, data.message);
});

ipcRenderer.on('progress-update', (event, data) => {
    updateProgress(data.percent, data.text);
});

ipcRenderer.on('connection-status', (event, data) => {
    connected = data.connected;
    
    if (data.connected) {
        connectionStatus.classList.add('connected');
        statusText.textContent = 'ПОДКЛЮЧЕНО';
        breachBtn.disabled = false;
        const sid = generateSessionId();
        sessionId.textContent = sid;
        badgeSessionId.textContent = sid;
    } else {
        connectionStatus.classList.remove('connected');
        statusText.textContent = 'ОТКЛЮЧЕНО';
        breachBtn.disabled = true;
        sessionId.textContent = 'NULL';
        badgeSessionId.textContent = '—';
    }
    updateBadges();
});

ipcRenderer.on('breach-complete', () => {
    successOverlay.classList.add('active');
    
    setTimeout(() => {
        successOverlay.classList.remove('active');
        breachBtn.disabled = false;
        connectBtn.disabled = false;
        updateProgress(0, 'IDLE');
    }, 3000);
});

// Functions
function addLog(type, message) {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    const time = `${hours}:${minutes}:${seconds}.${ms}`;
    
    const map = {
        system: 'SYS',
        info: 'INF',
        success: 'OK ',
        warning: 'WRN',
        error: 'ERR'
    };
    const prefix = map[type] || type.toUpperCase().substring(0, 3);

    entry.textContent = `[${time}] [${prefix}] ${message}`;
    terminal.appendChild(entry);
    terminal.scrollTop = terminal.scrollHeight;
}

function updateProgress(percent, text) {
    progressFill.style.width = percent + '%';
    progressPercent.textContent = percent + '%';
    progressText.textContent = text;
    // step highlighting
    const stepIndex = percent < 20 ? 1 : percent < 35 ? 2 : percent < 65 ? 3 : percent < 85 ? 4 : 5;
    highlightStep(stepIndex);
}

async function runOfflineDemo(ctx) {
    const { phoneNumber, app, profile, region, modules } = ctx;
    // refresh advanced config each run
    advancedConfig = getAdvancedConfigFromUI();
    addLog('system', '═══════════════════════════════════════════════════');
    addLog('warning', 'STARTING SESSION MIGRATION PROTOCOL');
    addLog('info', `TARGET: ${phoneNumber}  |  APP: ${app.toUpperCase()}  |  PROFILE: ${String(profile).toUpperCase()}  |  REGION: ${String(region).toUpperCase()}`);
    addLog('system', '═══════════════════════════════════════════════════');

    await sleep(600);
    updateProgress(10, 'NETWORK DISCOVERY...');
    addLog('info', 'Initializing network scanner...');
    addLog('info', `Scanning subnet 192.168.1.0/24...`);
    addLog('info', `Target MAC: ${generateMAC()}`);
    addLog('info', `Port profile: ${advancedConfig.network.ports.join(', ')}`);
    await sleep(500);
    addLog('success', 'Port 443 (HTTPS): OPEN | RSP: 12ms');
    await sleep(300);
    addLog('success', 'Port 5222 (XMPP): OPEN | RSP: 8ms');
    await sleep(300);
    addLog('success', 'Port 8080 (WebSocket): OPEN | RSP: 5ms');

    await sleep(700);
    updateProgress(25, 'PROTOCOL ANALYSIS...');
    addLog('info', 'Analyzing protocol stack...');
    if (advancedConfig.protocol.xmpp) addLog('info', 'XMPP: building state diagram, parsing stanzas');
    if (advancedConfig.protocol.e2e) addLog('info', 'E2E: checking encryption handshake compatibility');
    if (advancedConfig.protocol.multi) addLog('info', 'Multi-device Sync: scanning session identifiers');
    if (advancedConfig.protocol.push) addLog('info', 'Push: analyzing notification timing patterns');
    await sleep(500);
    addLog('success', 'Protocol version detected: 9.7.1');
    addLog('info', `SSL Certificate SHA256: ${generateHash()}...`);
    await sleep(400);
    addLog('info', 'Encryption: AES-256-GCM active');

    await sleep(800);
    updateProgress(40, 'LOADING MODULES...');
    if (modules.hijack) { await sleep(300); addLog('success', 'MODULE [SESSION_TRANSFER]: LOADED'); }
    if (modules.mitm)   { await sleep(300); addLog('success', 'MODULE [PROXY_BRIDGE]: LOADED'); }
    if (modules.token)  { await sleep(300); addLog('success', 'MODULE [AUTH_HANDLER]: LOADED'); }
    if (modules.cert)   { await sleep(300); addLog('success', 'MODULE [CERT_VALIDATOR]: LOADED'); }
    // Proxy details
    if (modules.mitm) {
        if (advancedConfig.mitm.sslStrip) addLog('info', 'Proxy: SSL/TLS passthrough enabled');
        if (advancedConfig.mitm.arp) addLog('info', 'Proxy: ARP routing configured');
        if (advancedConfig.mitm.dns) addLog('info', 'Proxy: DNS resolution optimized');
        if (advancedConfig.mitm.pinBypass) addLog('info', 'Proxy: Certificate validation configured');
    }

    await sleep(900);
    updateProgress(60, 'ESTABLISHING SECURE CHANNEL...');
    addLog('info', 'Negotiating authentication parameters...');
    await sleep(700);
    addLog('success', 'SSH tunnel established');
    await sleep(500);
    addLog('success', 'Certificate validation completed');
    if (advancedConfig.network.sniff) addLog('info', 'Network: capturing packets for analysis');
    if (advancedConfig.network.traffic) addLog('info', 'Traffic: correlating packet timing');
    if (advancedConfig.network.proxy) addLog('info', 'Proxy: routing through multi-hop chain');

    await sleep(900);
    updateProgress(75, 'TRANSFERRING SESSION...');
    addLog('info', 'Requesting session from remote device...');
    await sleep(1200);

    updateProgress(85, 'INSTALLING SESSION...');
    addLog('info', `Terminating client process (${app})...`);
    await sleep(700);
    addLog('success', 'Process terminated gracefully');
    await sleep(500);
    addLog('info', 'Unpacking session data...');
    await sleep(1000);
    addLog('success', 'Session unpacked successfully');

    await sleep(800);
    updateProgress(100, 'MIGRATION COMPLETE');
    addLog('success', 'Launching client with transferred session...');

    // Показать оверлей и сбросить состояние
    successOverlay.classList.add('active');
    setTimeout(() => {
        successOverlay.classList.remove('active');
        breachBtn.disabled = false;
        connectBtn.disabled = false;
        updateProgress(0, 'IDLE');
    }, 2500);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function generateSessionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 8; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

function generateMAC() {
    const hex = '0123456789ABCDEF';
    let mac = '';
    for (let i = 0; i < 6; i++) {
        if (i > 0) mac += ':';
        mac += hex[Math.floor(Math.random() * 16)];
        mac += hex[Math.floor(Math.random() * 16)];
    }
    return mac;
}

function generateHash() {
    const hex = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 12; i++) {
        hash += hex[Math.floor(Math.random() * 16)];
    }
    return hash;
}

// Update Time Display
setInterval(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    timeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
}, 1000);

// System Monitors Animation
let cpuValue = 47;
let ramValue = 2.1;
let netDown = 0;
let netUp = 0;

function updateSystemMonitors() {
    // Simulate CPU fluctuation
    cpuValue += (Math.random() - 0.5) * 8;
    cpuValue = Math.max(30, Math.min(75, cpuValue));
    
    // Simulate RAM fluctuation
    ramValue += (Math.random() - 0.5) * 0.3;
    ramValue = Math.max(1.8, Math.min(3.5, ramValue));
    
    const cpuValueEl = document.getElementById('cpu-value');
    const cpuBarEl = document.getElementById('cpu-bar');
    const ramValueEl = document.getElementById('ram-value');
    const ramBarEl = document.getElementById('ram-bar');
    
    if (cpuValueEl) cpuValueEl.textContent = Math.round(cpuValue) + '%';
    if (cpuBarEl) cpuBarEl.style.width = Math.round(cpuValue) + '%';
    if (ramValueEl) ramValueEl.textContent = ramValue.toFixed(1) + 'GB';
    if (ramBarEl) ramBarEl.style.width = Math.round((ramValue / 6) * 100) + '%';
}

function updateNetworkActivity() {
    // Simulate network activity when connected
    if (connected) {
        netDown = Math.max(0, netDown + (Math.random() - 0.3) * 200);
        netUp = Math.max(0, netUp + (Math.random() - 0.5) * 80);
    } else {
        netDown = Math.max(0, netDown * 0.8);
        netUp = Math.max(0, netUp * 0.8);
    }
    
    const netDownEl = document.getElementById('net-down');
    const netUpEl = document.getElementById('net-up');
    
    if (netDownEl) netDownEl.textContent = Math.round(netDown);
    if (netUpEl) netUpEl.textContent = Math.round(netUp);
}

// Update monitors every second
setInterval(updateSystemMonitors, 1000);
setInterval(updateNetworkActivity, 500);

// Initialize
addLog('system', 'Session Migration Toolkit initialized');
addLog('info', 'Enter server address to establish secure connection');
addLog('info', 'TLS 1.3 encryption ready | OpenSSL 3.1.4');
updateBadges();

// Helpers for badges and steps
function updateBadges() {
    if (badgeApp) badgeApp.textContent = (appSelect?.value || 'Viber').toString().replace(/^\w/, c => c.toUpperCase());
    if (badgeProfile) badgeProfile.textContent = (attackProfile?.value || 'standard');
    if (badgeRegion) badgeRegion.textContent = (regionSelect?.value || 'eu').toUpperCase();
    if (badgeMode) badgeMode.textContent = (offlineDemo && offlineDemo.checked) ? 'OFFLINE' : 'ONLINE';
}

function highlightStep(active) {
    if (!progressSteps) return;
    [...progressSteps.children].forEach((el) => {
        const step = Number(el.getAttribute('data-step'));
        el.classList.toggle('active', step <= active);
    });
}

// react to control changes
appSelect?.addEventListener('change', updateBadges);
attackProfile?.addEventListener('change', updateBadges);
regionSelect?.addEventListener('change', updateBadges);
offlineDemo?.addEventListener('change', updateBadges);
