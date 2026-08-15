const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// 清理游戏目录下的旧备份文件（若存在会影响存档写入）
function cleanOldBackup() {
  const oldBackupPath = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\A Dance of Fire and Ice\\User\\data.sav.old';
  try {
    if (fs.existsSync(oldBackupPath)) {
      fs.unlinkSync(oldBackupPath);
      console.log('已删除旧备份文件:', oldBackupPath);
    }
  } catch (error) {
    console.error('删除旧备份文件失败:', error.message);
  }
}

const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

function createWindow() {
  const windowOptions = {
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      additionalArguments: []
    }
  };

  if (isMac) {
    // macOS：毛玻璃由主进程/系统合成器接管（vibrancy），渲染层不再用 backdrop-filter 硬算
    windowOptions.transparent = true;          // 窗口透明，让 vibrancy 透出
    windowOptions.backgroundColor = '#00000000';
    windowOptions.vibrancy = 'under-window';   // 构造参数方式
    // 通过 additionalArguments 同步告知渲染层：跳过 CSS backdrop-filter
    windowOptions.webPreferences.additionalArguments.push('--app-vibrancy=under-window');
  }

  mainWindow = new BrowserWindow(windowOptions);

  // 方法式 API（与构造参数等价），兼容旧版本并支持运行期切换
  if (isMac && typeof mainWindow.setVibrancy === 'function') {
    try {
      mainWindow.setVibrancy('under-window');
    } catch (error) {
      console.error('setVibrancy 应用失败:', error.message);
    }
  }

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

// Linux：Wayland 优先，失败自动回退 X11
function configureLinuxDisplay() {
  if (!isLinux) return;

  // 显式指定的命令行参数拥有最高优先级
  const forced = process.argv.some((arg) => arg.startsWith('--ozone-platform='));
  if (forced) return;

  const sessionType = (process.env.XDG_SESSION_TYPE || '').toLowerCase();
  const isWayland = sessionType === 'wayland' || !!process.env.WAYLAND_DISPLAY;

  if (process.env.SAVE_EDITOR_FORCE_X11 === '1') {
    // 逃生出口：老显卡 / NVIDIA 专有驱动 / 老合成器强制 X11
    app.commandLine.appendSwitch('ozone-platform', 'x11');
  } else if (isWayland) {
    // auto 提示：优先 Wayland，Ozone 初始化失败时自动落到 X11
    app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
  } else {
    // 纯 X11 会话直接走 X11
    app.commandLine.appendSwitch('ozone-platform', 'x11');
  }
}

configureLinuxDisplay();

app.whenReady().then(() => {
  cleanOldBackup();
  createWindow();
});

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

// 打开文件对话框
ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择存档文件',
    filters: [
      { name: '存档文件', extensions: ['sav'] },
      { name: '所有文件', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    return { filePath, content };
  }
  return null;
});

// 保存文件
ipcMain.handle('save-file', async (event, { filePath, content }) => {
  try {
    // 备份原文件
    const backupPath = filePath + '.backup';
    fs.copyFileSync(filePath, backupPath);
    
    // 写入新内容
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true, backupPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 保存到新文件
ipcMain.handle('save-as-file', async (event, content) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '保存修改后的存档',
    defaultPath: 'data.sav',
    filters: [
      { name: '存档文件', extensions: ['sav'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { success: true, filePath: result.filePath };
  }
  return { success: false };
});