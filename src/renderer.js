// 平台抽象：桌面 Electron 走 IPC + fs；移动端（Capacitor）由 core/storage 适配
const isElectron = typeof process !== 'undefined' && process.versions && !!process.versions.electron;
const { ipcRenderer } = isElectron ? require('electron') : {};
const fs = isElectron ? require('fs') : null;

let currentData = null;
let currentFilePath = null;
let originalData = null;
let selectedLevels = new Set();
let selectedSpeedLevels = new Set();

// 自动检测存档路径
async function autoLoadSave() {
  const possiblePaths = [
    'C:\\Program Files (x86)\\Steam\\steamapps\\common\\A Dance of Fire and Ice\\User\\data.sav',
    'C:\\Program Files\\Steam\\steamapps\\common\\A Dance of Fire and Ice\\User\\data.sav',
    'D:\\Steam\\steamapps\\common\\A Dance of Fire and Ice\\User\\data.sav',
    'E:\\Steam\\steamapps\\common\\A Dance of Fire and Ice\\User\\data.sav'
  ];

  for (let savePath of possiblePaths) {
    try {
      if (fs.existsSync(savePath)) {
        const content = fs.readFileSync(savePath, 'utf-8').replace(/^\uFEFF/, '');
        currentFilePath = savePath;
        currentData = JSON.parse(content);
        originalData = JSON.parse(content);
        
        document.getElementById('fileInfo').textContent = `✅ 已自动加载: ${savePath}`;
        document.getElementById('fileInfo').style.color = '#6bcb77';
        document.getElementById('actionsSection').style.display = 'block';
        document.getElementById('previewSection').style.display = 'block';
        updateStats();
        generateLevelGrid();
        document.getElementById('levelSelectSection').style.display = 'block';
        generateSpeedGrid();
        document.getElementById('speedTrialSection').style.display = 'block';
        document.getElementById('saveSection').style.display = 'block';
        showStatus('✅ 自动检测到存档并加载成功！', '#6bcb77');
        return true;
      }
    } catch (error) {
      // 继续尝试下一个路径
    }
  }
  
  showStatus('ℹ️ 未自动检测到存档，请手动打开', '#4d96ff');
  return false;
}

// 打开文件
async function openFile() {
  const result = await ipcRenderer.invoke('open-file');
  if (result) {
    try {
      currentFilePath = result.filePath;
      currentData = JSON.parse(result.content.replace(/^\uFEFF/, ''));
      originalData = JSON.parse(result.content.replace(/^\uFEFF/, ''));
      
      document.getElementById('fileInfo').textContent = `已加载: ${result.filePath}`;
      document.getElementById('fileInfo').style.color = '#ffffff';
      document.getElementById('actionsSection').style.display = 'block';
      document.getElementById('previewSection').style.display = 'block';
      
      updateStats();
      generateLevelGrid();
      document.getElementById('levelSelectSection').style.display = 'block';
      generateSpeedGrid();
      document.getElementById('speedTrialSection').style.display = 'block';
      document.getElementById('saveSection').style.display = 'block';
      showStatus('✅ 文件加载成功！', '#6bcb77');
    } catch (error) {
      showStatus(`❌ 文件解析失败: ${error.message}`, '#ff6b6b');
    }
  }
}

// 一键全解锁
function unlockAll() {
  if (!currentData) {
    showStatus('⚠️ 请先打开存档文件！', '#ffd93d');
    return;
  }

  let count = 0;
  for (let key in currentData) {
    if (key.startsWith('percentCompletion') && typeof currentData[key] === 'number') {
      currentData[key] = 1;
      count++;
    }
    if (key.startsWith('coop_percentCompletion') && currentData[key] !== null && typeof currentData[key] === 'number') {
      currentData[key] = 1;
      count++;
    }
  }

  updateStats();
  generateLevelGrid();
  showStatus(`🔓 已解锁 ${count} 个关卡！`, '#6bcb77');
}

// 教程全完成
function maxTutorial() {
  if (!currentData) {
    showStatus('⚠️ 请先打开存档文件！', '#ffd93d');
    return;
  }

  let count = 0;
  for (let key in currentData) {
    if (key.startsWith('tutorialProgress') && typeof currentData[key] === 'number') {
      currentData[key] = 99;
      count++;
    }
  }

  updateStats();
  showStatus(`📚 已最大化 ${count} 个教程进度！`, '#4d96ff');
}

// DLC全奖牌
function maxDLC() {
  if (!currentData) {
    showStatus('⚠️ 请先打开存档文件！', '#ffd93d');
    return;
  }

  let count = 0;
  for (let key in currentData) {
    if (key.startsWith('dlcMedals')) {
      const medals = currentData[key];
      if (typeof medals === 'string' && medals.length > 0) {
        currentData[key] = medals.split('').map(() => '3').join('');
        count++;
      }
    }
  }

  // 设置DLC完成度
  currentData['dlcEXProgress'] = 3;
  currentData['dlcStoryProgress'] = 7;
  currentData['clearedTechFeatured'] = true;

  updateStats();
  showStatus(`🏆 已最大化 ${count} 个DLC奖牌！`, '#ffd93d');
}

// 保存文件
async function saveFile() {
  if (!currentData || !currentFilePath) {
    showStatus('⚠️ 请先打开存档文件！', '#ffd93d');
    return;
  }

  const content = JSON.stringify(currentData);
  const result = await ipcRenderer.invoke('save-file', {
    filePath: currentFilePath,
    content: content
  });

  if (result.success) {
    showStatus(`💾 保存成功！备份已创建: ${result.backupPath}`, '#6bcb77');
  } else {
    showStatus(`❌ 保存失败: ${result.error}`, '#ff6b6b');
  }
}

// 另存为
async function saveAsFile() {
  if (!currentData) {
    showStatus('⚠️ 请先打开存档文件！', '#ffd93d');
    return;
  }

  const content = JSON.stringify(currentData);
  const result = await ipcRenderer.invoke('save-as-file', content);

  if (result.success) {
    showStatus(`💾 已保存到: ${result.filePath}`, '#6bcb77');
  }
}

// 更新统计信息
function updateStats() {
  if (!currentData) return;

  const statsGrid = document.getElementById('statsGrid');
  statsGrid.innerHTML = '';

  let completedCount = 0;
  let totalLevels = 0;
  for (let key in currentData) {
    if (key.startsWith('percentCompletion') && !key.startsWith('coop_')) {
      totalLevels++;
      if (currentData[key] >= 1) completedCount++;
    }
  }

  let tutorialCount = 0;
  let maxTutorialCount = 0;
  for (let key in currentData) {
    if (key.startsWith('tutorialProgress')) {
      tutorialCount++;
      if (currentData[key] >= 99) maxTutorialCount++;
    }
  }

  let dlcCount = 0;
  for (let key in currentData) {
    if (key.startsWith('dlcMedals')) {
      dlcCount++;
    }
  }

  let speedCount = 0;
  let maxSpeed = 0;
  for (let key in currentData) {
    if (key.startsWith('bestSpeedMultiplier')) {
      speedCount++;
      if (currentData[key] > maxSpeed) maxSpeed = currentData[key];
    }
  }

  addStat(statsGrid, '关卡完成度', `${completedCount}/${totalLevels}`);
  addStat(statsGrid, '教程进度', `${maxTutorialCount}/${tutorialCount}`);
  addStat(statsGrid, 'DLC奖牌数', dlcCount);
  addStat(statsGrid, 'DLC故事进度', currentData['dlcStoryProgress'] || 0);
  addStat(statsGrid, 'DLC额外进度', currentData['dlcEXProgress'] || 0);
  addStat(statsGrid, '飚速关卡数', speedCount);
  addStat(statsGrid, '飚速最高倍率', speedCount > 0 ? `${maxSpeed}x` : 'N/A');
  addStat(statsGrid, '当前关卡', currentData['currentLevel'] || 'N/A');
}

function addStat(container, label, value) {
  const div = document.createElement('div');
  div.className = 'stat-item';
  div.innerHTML = `
    <div class="label">${label}</div>
    <div class="value">${value}</div>
  `;
  container.appendChild(div);
}

// 显示状态提示
function showStatus(message, color = '#6bcb77') {
  const statusBar = document.getElementById('statusBar');
  statusBar.textContent = message;
  statusBar.style.background = color;
  statusBar.classList.add('show');
  
  setTimeout(() => {
    statusBar.classList.remove('show');
  }, 3000);
}

// 生成关卡选择列表
function generateLevelGrid() {
  if (!currentData) return;
  
  const levelGrid = document.getElementById('levelGrid');
  levelGrid.innerHTML = '';
  selectedLevels.clear();
  
  // 收集所有关卡
  const levels = [];
  for (let key in currentData) {
    if (key.startsWith('percentCompletion') && !key.startsWith('coop_')) {
      const levelNum = key.replace('percentCompletion', '');
      levels.push({
        key: key,
        num: levelNum,
        completed: currentData[key] >= 1
      });
    }
  }
  
  // 按编号排序
  levels.sort((a, b) => {
    const numA = parseInt(a.num) || 0;
    const numB = parseInt(b.num) || 0;
    return numA - numB;
  });
  
  // 生成关卡项
  levels.forEach(level => {
    const div = document.createElement('div');
    div.className = 'level-item' + (level.completed ? ' completed' : '');
    div.setAttribute('data-key', level.key);
    div.innerHTML = `
      <div class="level-name">${level.num}</div>
      <div class="level-status">${level.completed ? '✅ 已完成' : '⬜ 未完成'}</div>
    `;
    
    div.addEventListener('click', () => {
      toggleLevel(level.key, div);
    });
    
    levelGrid.appendChild(div);
  });
}

// 切换关卡选择
function toggleLevel(key, element) {
  if (selectedLevels.has(key)) {
    selectedLevels.delete(key);
    element.classList.remove('selected');
  } else {
    selectedLevels.add(key);
    element.classList.add('selected');
  }
}

// 全选
function selectAllLevels() {
  if (!currentData) return;
  
  selectedLevels.clear();
  const levelItems = document.querySelectorAll('.level-item');
  levelItems.forEach(item => {
    const key = item.getAttribute('data-key');
    selectedLevels.add(key);
    item.classList.add('selected');
  });
  
  showStatus(`✅ 已选择 ${selectedLevels.size} 个关卡`, '#4d96ff');
}

// 取消全选
function deselectAllLevels() {
  selectedLevels.clear();
  const levelItems = document.querySelectorAll('.level-item');
  levelItems.forEach(item => {
    item.classList.remove('selected');
  });
  
  showStatus('已取消所有选择', '#aaa');
}

// 解锁选中的关卡
function unlockSelected() {
  if (!currentData) {
    showStatus('⚠️ 请先打开存档文件！', '#ffd93d');
    return;
  }
  
  if (selectedLevels.size === 0) {
    showStatus('⚠️ 请先选择要解锁的关卡！', '#ffd93d');
    return;
  }
  
  let count = 0;
  selectedLevels.forEach(key => {
    currentData[key] = 1;
    count++;
  });
  
  // 同时解锁对应的教程进度
  selectedLevels.forEach(key => {
    const levelNum = key.replace('percentCompletion', '');
    const tutorialKey = 'tutorialProgress' + levelNum;
    if (tutorialKey in currentData) {
      currentData[tutorialKey] = 99;
    }
  });
  
  updateStats();
  generateLevelGrid(); // 重新生成关卡列表
  
  showStatus(`🔓 成功解锁 ${count} 个关卡！`, '#6bcb77');
}

// 生成飚速模式关卡列表
function generateSpeedGrid() {
  if (!currentData) return;
  
  const speedGrid = document.getElementById('speedGrid');
  speedGrid.innerHTML = '';
  selectedSpeedLevels.clear();
  
  // 收集所有飚速关卡
  const speedLevels = [];
  for (let key in currentData) {
    if (key.startsWith('bestSpeedMultiplier')) {
      const levelNum = key.replace('bestSpeedMultiplier', '');
      speedLevels.push({
        key: key,
        num: levelNum,
        value: currentData[key]
      });
    }
  }
  
  // 按编号排序
  speedLevels.sort((a, b) => {
    const numA = parseInt(a.num) || 0;
    const numB = parseInt(b.num) || 0;
    return numA - numB;
  });
  
  // 生成关卡项
  speedLevels.forEach(level => {
    const div = document.createElement('div');
    div.className = 'speed-item';
    div.setAttribute('data-key', level.key);
    div.style.setProperty('--speed-color', speedColor(level.value));
    div.innerHTML = `
      <div class="speed-name">${level.num}</div>
      <div class="speed-value">${level.value}x</div>
    `;
    
    div.addEventListener('click', () => {
      toggleSpeedLevel(level.key, div);
    });
    
    speedGrid.appendChild(div);
  });
}

// 切换飚速关卡选择
function toggleSpeedLevel(key, element) {
  if (selectedSpeedLevels.has(key)) {
    selectedSpeedLevels.delete(key);
    element.classList.remove('selected');
  } else {
    selectedSpeedLevels.add(key);
    element.classList.add('selected');
  }
}

// 次要操作钩子：桌面端=右键菜单，移动端=长按（由 platform/components.js 路由到本函数）
window.onSecondaryAction = function (element) {
  if (!currentData) return;
  const key = element.getAttribute('data-key');
  if (!key) return;

  if (key.startsWith('percentCompletion') && !key.startsWith('coop_')) {
    // 关卡：快速解锁单个关卡
    currentData[key] = 1;
    const tutorialKey = 'tutorialProgress' + key.replace('percentCompletion', '');
    if (tutorialKey in currentData) currentData[tutorialKey] = 99;
    updateStats();
    generateLevelGrid();
    showStatus(`🔓 已解锁关卡 ${key.replace('percentCompletion', '')}`, '#6bcb77');
  } else if (key.startsWith('bestSpeedMultiplier')) {
    // 飚速：切换选中
    toggleSpeedLevel(key, element);
    showStatus(`⚡ 已${element.classList.contains('selected') ? '选中' : '取消'}飚速关卡 ${key.replace('bestSpeedMultiplier', '')}`, '#4d96ff');
  }
};

// 获取目标倍率
function getSpeedMultiplier() {
  const input = document.getElementById('speedMultiplierInput');
  const raw = parseFloat(input.value);
  if (isNaN(raw) || raw < 0.1) {
    showStatus('⚠️ 请输入有效的速度倍率（最小 0.1）！', '#ffd93d');
    return null;
  }
  // 精确到 0.1
  return Math.round(raw * 10) / 10;
}

// 根据倍率计算颜色（低倍率偏蓝，高倍率偏红，便于辨认）
function speedColor(value) {
  const v = Math.max(0.1, Math.min(parseFloat(value) || 0.1, 3.0));
  const hue = 210 - ((v - 0.1) / 2.9) * 210;
  return `hsl(${hue.toFixed(1)}, 85%, 62%)`;
}

// 应用到全部关卡
function applySpeedToAll() {
  if (!currentData) {
    showStatus('⚠️ 请先打开存档文件！', '#ffd93d');
    return;
  }
  
  const value = getSpeedMultiplier();
  if (value === null) return;
  
  let count = 0;
  for (let key in currentData) {
    if (key.startsWith('bestSpeedMultiplier')) {
      currentData[key] = value;
      count++;
    }
  }
  
  if (count === 0) {
    showStatus('⚠️ 存档中没有飚速模式数据！', '#ffd93d');
    return;
  }
  
  updateStats();
  generateSpeedGrid();
  showStatus(`🚀 已设置 ${count} 个关卡的飚速倍率为 ${value}x！`, '#4d96ff');
}

// 设置选中关卡
function applySpeedToSelected() {
  if (!currentData) {
    showStatus('⚠️ 请先打开存档文件！', '#ffd93d');
    return;
  }
  
  if (selectedSpeedLevels.size === 0) {
    showStatus('⚠️ 请先选择要设置的关卡！', '#ffd93d');
    return;
  }
  
  const value = getSpeedMultiplier();
  if (value === null) return;
  
  const count = selectedSpeedLevels.size;
  selectedSpeedLevels.forEach(key => {
    currentData[key] = value;
  });
  
  updateStats();
  generateSpeedGrid();
  showStatus(`⚡ 已设置 ${count} 个关卡的飚速倍率为 ${value}x！`, '#4d96ff');
}

// 全选飚速关卡
function selectAllSpeedLevels() {
  if (!currentData) return;
  
  selectedSpeedLevels.clear();
  const items = document.querySelectorAll('.speed-item');
  items.forEach(item => {
    const key = item.getAttribute('data-key');
    selectedSpeedLevels.add(key);
    item.classList.add('selected');
  });
  
  showStatus(`✅ 已选择 ${selectedSpeedLevels.size} 个关卡`, '#4d96ff');
}

// 取消全选飚速关卡
function deselectAllSpeedLevels() {
  selectedSpeedLevels.clear();
  const items = document.querySelectorAll('.speed-item');
  items.forEach(item => {
    item.classList.remove('selected');
  });
  
  showStatus('已取消所有选择', '#aaa');
}

// 页面加载完成后自动检测存档
window.addEventListener('DOMContentLoaded', () => {
  autoLoadSave();
});