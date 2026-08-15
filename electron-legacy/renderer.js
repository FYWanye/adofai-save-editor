// 平台抽象：桌面 Electron 走 IPC + fs；移动端（Capacitor）由 core/storage 适配
const isElectron = typeof process !== 'undefined' && process.versions && !!process.versions.electron;
const { ipcRenderer } = isElectron ? require('electron') : {};
const fs = isElectron ? require('fs') : null;

let currentData = null;
let currentFilePath = null;
let originalData = null;
let currentLevelNum = null;   // 当前选中的关卡号

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
        document.getElementById('previewSection').style.display = 'block';
        updateStats();
        generateLevelList();
        document.getElementById('levelEditorSection').style.display = 'block';
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
      document.getElementById('previewSection').style.display = 'block';
      
      updateStats();
      generateLevelList();
      document.getElementById('levelEditorSection').style.display = 'block';
      document.getElementById('saveSection').style.display = 'block';
      showStatus('✅ 文件加载成功！', '#6bcb77');
    } catch (error) {
      showStatus(`❌ 文件解析失败: ${error.message}`, '#ff6b6b');
    }
  }
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

// 收集所有普通关卡数据（进度 / 精准度 / X精准度 / 尝试次数 / 教程 / 飚速）
function collectLevels() {
  const levels = [];
  for (let key in currentData) {
    if (key.startsWith('percentCompletion') && !key.startsWith('coop_')) {
      const num = key.replace('percentCompletion', '');
      levels.push({
        num: num,
        numInt: parseInt(num) || 0,
        progress: currentData[key] === 1,
        accuracy: currentData['bestPercentAccuracy' + num],
        xAccuracy: currentData['bestPercentXAccuracy' + num],
        attempts: currentData['worldAttempts' + num],
        tutorial: currentData['tutorialProgress' + num],
        speed: currentData['bestSpeedMultiplier' + num]
      });
    }
  }
  return levels;
}

// 生成关卡列表（左侧）
function generateLevelList() {
  if (!currentData) return;
  const list = document.getElementById('levelList');
  if (!list) return;
  list.innerHTML = '';

  const search = document.getElementById('levelSearch');
  const filter = document.getElementById('levelFilter');
  const sort = document.getElementById('levelSort');
  const text = search ? search.value.trim() : '';
  const status = filter ? filter.value : 'all';
  const sortBy = sort ? sort.value : 'num';

  let levels = collectLevels();

  // 筛选
  if (status === 'completed') levels = levels.filter(l => l.progress);
  else if (status === 'uncompleted') levels = levels.filter(l => !l.progress);
  if (text) levels = levels.filter(l => l.num.includes(text));

  // 排序
  if (sortBy === 'accuracy') {
    levels.sort((a, b) => (b.accuracy ?? -1) - (a.accuracy ?? -1));
  } else if (sortBy === 'attempts') {
    levels.sort((a, b) => (b.attempts ?? -1) - (a.attempts ?? -1));
  } else {
    levels.sort((a, b) => a.numInt - b.numInt);
  }

  levels.forEach(level => {
    const row = document.createElement('div');
    row.className = 'level-row'
      + (level.progress ? ' completed' : '')
      + (level.num === currentLevelNum ? ' selected' : '');
    row.setAttribute('data-num', level.num);

    const acc = level.accuracy != null ? (level.accuracy * 100).toFixed(2) + '%' : '—';
    const xacc = level.xAccuracy != null ? (level.xAccuracy * 100).toFixed(2) + '%' : '—';
    const att = level.attempts != null ? level.attempts + ' 次' : '—';
    const speedTag = level.speed != null ? '<span class="speed-tag">' + level.speed + 'x</span>' : '';

    row.innerHTML = `
      <div class="level-badge">${level.num}</div>
      <div class="level-info">
        <div class="level-title">#${level.num}</div>
        <div class="level-meta">精准度 ${acc} · X精准度 ${xacc} · 尝试 ${att}</div>
      </div>
      <div class="level-flag">${level.progress ? '✅' : '⬜'} ${speedTag}</div>
    `;

    // 同款飚速提示条：左侧彩色竖条（按倍率着色）
    if (level.speed != null) {
      row.style.borderLeftColor = speedColor(level.speed);
    }

    row.addEventListener('click', () => selectLevel(level.num));
    list.appendChild(row);
  });
}

// 选中关卡
function selectLevel(num) {
  currentLevelNum = num;
  document.querySelectorAll('.level-row').forEach(r => {
    r.classList.toggle('selected', r.getAttribute('data-num') === num);
  });
  renderEditor(num);
}

// 渲染右侧编辑面板
function renderEditor(num) {
  const panel = document.getElementById('editorPanel');
  if (!panel) return;

  const progress = currentData['percentCompletion' + num] === 1;
  const accuracy = currentData['bestPercentAccuracy' + num];
  const xAccuracy = currentData['bestPercentXAccuracy' + num];
  const attempts = currentData['worldAttempts' + num];
  const tutorial = currentData['tutorialProgress' + num];
  const speed = currentData['bestSpeedMultiplier' + num];

  const accVal = accuracy != null ? (accuracy * 100).toFixed(2) : '';
  const xaccVal = xAccuracy != null ? (xAccuracy * 100).toFixed(2) : '';
  const attVal = attempts != null ? attempts : '';
  const tutField = tutorial != null ? `
    <label class="editor-field">
      <span>教程进度</span>
      <input type="number" id="editTutorial" step="1" min="0" value="${tutorial}">
    </label>` : '';
  const speedField = speed != null ? `
    <label class="editor-field">
      <span>飚速倍率 (x)</span>
      <input type="number" id="editSpeed" step="0.1" min="0.1" value="${speed}">
    </label>` : '';

  panel.innerHTML = `
    <div class="editor-head">
      <div class="level-badge large">${num}</div>
      <div class="editor-title">#${num}</div>
    </div>
    <label class="editor-field editor-toggle">
      <span>进度（完成）</span>
      <input type="checkbox" id="editProgress" ${progress ? 'checked' : ''}>
    </label>
    <label class="editor-field">
      <span>精准度 (%)</span>
      <input type="number" id="editAccuracy" step="0.01" min="0" value="${accVal}">
    </label>
    <label class="editor-field">
      <span>X 精准度 (%)</span>
      <input type="number" id="editXAccuracy" step="0.01" min="0" value="${xaccVal}">
    </label>
    <label class="editor-field">
      <span>尝试次数</span>
      <input type="number" id="editAttempts" step="1" min="0" value="${attVal}">
    </label>
    ${tutField}
    ${speedField}
    <div class="editor-actions">
      <button class="btn btn-primary" onclick="applyLevelEdit()">应用修改</button>
      <button class="btn btn-ghost" onclick="resetLevelEdit()">还原</button>
    </div>
  `;
}

// 应用修改：把编辑面板的值写回 currentData
function applyLevelEdit() {
  if (!currentData || !currentLevelNum) {
    showStatus('⚠️ 请先选择关卡！', '#ffd93d');
    return;
  }
  const num = currentLevelNum;

  const progress = document.getElementById('editProgress');
  if (progress) currentData['percentCompletion' + num] = progress.checked ? 1 : 0;

  const accuracy = document.getElementById('editAccuracy');
  if (accuracy && accuracy.value !== '') {
    const v = parseFloat(accuracy.value);
    if (!isNaN(v) && v >= 0) currentData['bestPercentAccuracy' + num] = Math.round(v * 100) / 10000;
  }

  const xAccuracy = document.getElementById('editXAccuracy');
  if (xAccuracy && xAccuracy.value !== '') {
    const v = parseFloat(xAccuracy.value);
    if (!isNaN(v) && v >= 0) currentData['bestPercentXAccuracy' + num] = Math.round(v * 100) / 10000;
  }

  const attempts = document.getElementById('editAttempts');
  if (attempts && attempts.value !== '') {
    const v = parseInt(attempts.value, 10);
    if (!isNaN(v) && v >= 0) currentData['worldAttempts' + num] = v;
  }

  const tutorial = document.getElementById('editTutorial');
  if (tutorial && tutorial.value !== '') {
    const v = parseInt(tutorial.value, 10);
    if (!isNaN(v) && v >= 0) currentData['tutorialProgress' + num] = v;
  }

  const speed = document.getElementById('editSpeed');
  if (speed && speed.value !== '') {
    const v = parseFloat(speed.value);
    if (!isNaN(v) && v >= 0.1) currentData['bestSpeedMultiplier' + num] = Math.round(v * 10) / 10;
  }

  updateStats();
  generateLevelList();
  renderEditor(num); // 重新渲染，显示归一化后的值
  showStatus(`✅ 已应用关卡 #${num} 的修改`, '#6bcb77');
}

// 还原：放弃未应用的编辑，重新从 currentData 渲染
function resetLevelEdit() {
  if (!currentLevelNum) return;
  renderEditor(currentLevelNum);
  showStatus('已还原当前关卡的显示', '#aaa');
}

// 次要操作钩子：桌面端=右键菜单，移动端=长按（由 platform/components.js 路由到本函数）
window.onSecondaryAction = function (element) {
  if (!currentData) return;
  const num = element.getAttribute('data-num');
  if (num == null) return;
  // 关卡列表：次要操作 = 选中该关卡
  selectLevel(num);
  showStatus(`已选中关卡 #${num}`, '#4d96ff');
};

// 根据倍率计算颜色（低倍率偏蓝，高倍率偏红，便于辨认）
function speedColor(value) {
  const v = Math.max(0.1, Math.min(parseFloat(value) || 0.1, 3.0));
  const hue = 210 - ((v - 0.1) / 2.9) * 210;
  return `hsl(${hue.toFixed(1)}, 85%, 62%)`;
}

// 页面加载完成后自动检测存档
window.addEventListener('DOMContentLoaded', () => {
  autoLoadSave();
});