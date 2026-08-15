/**
 * platformStyles.js —— 抽象样式层（Design Tokens）+ 平台分支覆盖
 * ==================================================================
 * 核心思路（只写一次，四端复用）：
 *
 *   语义 Token（写意图）
 *        │
 *        ├─ 平台族覆盖表：apple / windows / android / linux
 *        │        （覆盖字体、圆角、毛玻璃、动效、强调色…）
 *        │
 *        ├─ 形态覆盖表：mobile
 *        │        （48px 热区、16px 根字号防 iOS 缩放、动量滚动…）
 *        │
 *        └─ 合并 → 写入 CSS 变量（:root）→ 组件 CSS 只引用 var(--...)
 *
 * 因此组件样式永远是一套，差异全部由 Token 与少量 [data-platform=...] 规则表达。
 *
 * 使用：<script src="platform.js"></script>
 *       <script src="platformStyles.js"></script>  ← 加载即自动应用
 */
(function (global) {
  'use strict';

  var Platform = global.Platform;

  /* ========================================================================
   * 1) 基础 Design Tokens（语义层：描述“意图”，不描述平台）
   * ======================================================================== */
  var BASE_TOKENS = {
    /* 字体 */
    'font-sans': "system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif",
    'font-size-root': '15px',
    'font-size-sm': '0.84em',
    'font-size-md': '0.95em',
    'font-size-lg': '1.05em',

    /* 圆角（Apple 大圆角 / Windows 小圆角 / Android 介于两者之间） */
    'radius-xs': '6px',
    'radius-sm': '10px',
    'radius-md': '14px',
    'radius-lg': '18px',
    'radius-pill': '999px',

    /* 间距 */
    'space-xs': '6px',
    'space-sm': '10px',
    'space-md': '16px',
    'space-lg': '24px',

    /* 毛玻璃（Apple 强毛玻璃 / Windows Mica 低饱和 / Android 无模糊） */
    'glass-bg': 'rgba(255,255,255,0.05)',
    'glass-border': 'rgba(255,255,255,0.10)',
    'glass-blur': '10px',
    'glass-saturation': '140%',

    /* 语义色 */
    'color-bg': '#0f1022',
    'color-surface': 'rgba(255,255,255,0.04)',
    'color-surface-raised': 'rgba(255,255,255,0.08)',
    'color-border': 'rgba(255,255,255,0.10)',
    'color-text': '#eef0f6',
    'color-text-dim': '#8b91a7',
    'color-accent': '#4d96ff',
    'color-success': '#3ddc84',
    'color-warning': '#ffd93d',
    'color-danger': '#ff5c6c',

    /* 控件高度（移动端覆盖为 48px，满足 44pt 最小热区） */
    'control-height': '40px',
    'touch-target': '44px',

    /* 动效 */
    'motion-fast': '120ms',
    'motion-normal': '200ms',
    'motion-slow': '300ms',
    'ease-standard': 'cubic-bezier(0.2, 0, 0, 1)',
    'ease-emphasized': 'cubic-bezier(0.05, 0.7, 0.1, 1)',

    /* 阴影（Android 用层级阴影，Apple 用柔和阴影） */
    'shadow-sm': '0 1px 3px rgba(0,0,0,0.30)',
    'shadow-md': '0 4px 14px rgba(0,0,0,0.35)',
    'shadow-lg': '0 10px 30px rgba(0,0,0,0.45)'
  };

  /* ========================================================================
   * 2) 平台族覆盖表（Platform overrides）
   * ======================================================================== */
  var PLATFORM_OVERRIDES = {
    /* ---------- Apple Design Language（macOS + iOS） ---------- */
    apple: {
      'font-sans': "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'PingFang SC', 'Helvetica Neue', sans-serif",
      'radius-xs': '6px',
      'radius-sm': '10px',
      'radius-md': '14px',
      'radius-lg': '20px',
      'glass-bg': 'rgba(255,255,255,0.06)',
      'glass-border': 'rgba(255,255,255,0.12)',
      'glass-blur': '20px',
      'glass-saturation': '180%',
      'ease-standard': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      'ease-emphasized': 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      'shadow-md': '0 6px 18px rgba(0,0,0,0.30)',
      'shadow-lg': '0 12px 40px rgba(0,0,0,0.40)'
    },

    /* ---------- Windows（WinUI / Fluent） ---------- */
    windows: {
      'font-sans': "'Segoe UI Variable', 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif",
      'radius-xs': '4px',
      'radius-sm': '8px',
      'radius-md': '8px',
      'radius-lg': '8px',
      'color-accent': '#0078d4',
      'glass-bg': 'rgba(255,255,255,0.03)',
      'glass-blur': '28px',
      'glass-saturation': '120%',
      'ease-standard': 'cubic-bezier(0.1, 0.9, 0.2, 1)',
      'ease-emphasized': 'cubic-bezier(0.1, 0.9, 0.2, 1.1)',
      'shadow-sm': '0 2px 4px rgba(0,0,0,0.25)',
      'shadow-md': '0 4px 8px rgba(0,0,0,0.28)'
    },

    /* ---------- Android（Material You / Material 3） ---------- */
    android: {
      'font-sans': "Roboto, 'Noto Sans CJK SC', system-ui, sans-serif",
      'radius-xs': '8px',
      'radius-sm': '12px',
      'radius-md': '16px',
      'radius-lg': '24px',
      'color-accent': '#6750a4',          // M3 默认种子色（见 applyDynamicColor）
      'color-surface': 'rgba(255,255,255,0.06)',
      'glass-blur': '0px',
      'glass-saturation': '100%',
      'control-height': '48px',
      'touch-target': '48px',
      'ease-standard': 'cubic-bezier(0.2, 0, 0, 1)',
      'ease-emphasized': 'cubic-bezier(0.2, 0, 0, 1)',
      'shadow-sm': '0 1px 2px rgba(0,0,0,0.40)',
      'shadow-md': '0 2px 6px rgba(0,0,0,0.45)',
      'shadow-lg': '0 6px 16px rgba(0,0,0,0.50)'
    },

    /* ---------- Linux（GNOME/GTK 中性，不绑定单一 DE） ---------- */
    linux: {
      'font-sans': "system-ui, Ubuntu, Cantarell, 'Noto Sans CJK SC', 'PingFang SC', sans-serif",
      'radius-xs': '6px',
      'radius-sm': '10px',
      'radius-md': '12px',
      'radius-lg': '16px',
      'color-accent': '#3584e4'
    }
  };

  /* ========================================================================
   * 3) 形态覆盖表（移动端叠加层，在平台族之后应用）
   * ======================================================================== */
  var MOBILE_OVERRIDES = {
    'control-height': '48px',
    'touch-target': '44px',
    'font-size-root': '16px',   // iOS 输入聚焦时不自动缩放
    'space-md': '20px',
    'space-lg': '28px',
    'glass-blur': '12px'
  };

  /* ========================================================================
   * 4) Token 合并
   * ======================================================================== */
  function mergeTokens() {
    var out = {};
    Object.keys(BASE_TOKENS).forEach(function (k) { out[k] = BASE_TOKENS[k]; });
    var familyTokens = PLATFORM_OVERRIDES[Platform.family] || {};
    Object.keys(familyTokens).forEach(function (k) { out[k] = familyTokens[k]; });
    if (Platform.isMobile) {
      Object.keys(MOBILE_OVERRIDES).forEach(function (k) { out[k] = MOBILE_OVERRIDES[k]; });
    }
    return out;
  }

  /* ========================================================================
   * 5) 注入工具
   * ======================================================================== */
  function injectStyle(id, css) {
    var old = document.getElementById(id);
    if (old) old.parentNode.removeChild(old);
    var style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function tokenCSS(tokens) {
    var lines = Object.keys(tokens).map(function (k) {
      return '  --' + k + ': ' + tokens[k] + ';';
    });
    return ':root {\n' + lines.join('\n') + '\n}';
  }

  /* ========================================================================
   * 6) 组件样式（一套代码，靠 Token + [data-*] 分支表达差异）
   *    这里只补“差异部分”；基础视觉仍由 index.html 提供。
   * ======================================================================== */
  function componentCSS() {
    return [
      /* ---------- 通用：组件引用 Token ---------- */
      '.btn, input, textarea, select { font-family: var(--font-sans); }',
      '.card {',
      '  border-radius: var(--radius-md);',
      '  background: var(--glass-bg);',
      '  border: 1px solid var(--glass-border);',
      '  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));',
      '  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));',
      '}',

      /* ---------- 按钮：基础 ---------- */
      '.btn {',
      '  min-height: var(--control-height);',
      '  border-radius: var(--radius-sm);',
      '  transition: transform var(--motion-fast) var(--ease-standard),',
      '              filter var(--motion-fast) var(--ease-standard),',
      '              box-shadow var(--motion-fast) var(--ease-standard),',
      '              background-color var(--motion-fast) var(--ease-standard);',
      '}',

      /* Apple：按钮几乎不“上浮”，按压用缩放回弹；移动端禁用 hover 依赖 */
      '[data-family="apple"] .btn:hover { transform: none; filter: brightness(1.06); }',
      '[data-family="apple"] .btn:active { transform: scale(0.96); }',
      '[data-form-factor="mobile"] .btn:hover { transform: none; }',

      /* Windows：Fluent 风格，按压轻微下沉 + 强调色描边 */
      '[data-family="windows"] .btn:hover { transform: translateY(-1px); filter: brightness(1.1); }',
      '[data-family="windows"] .btn:active { transform: translateY(0) scale(0.98); }',

      /* Android：Material 波纹 + 无 hover */
      '[data-family="android"] .btn { position: relative; overflow: hidden; }',
      '[data-family="android"] .btn:hover { filter: none; transform: none; }',
      '.btn-ripple {',
      '  position: absolute; border-radius: 50%; pointer-events: none;',
      '  background: rgba(255,255,255,0.35);',
      '  transform: scale(0); animation: btn-ripple var(--motion-slow) var(--ease-standard) forwards;',
      '}',
      '@keyframes btn-ripple { to { transform: scale(1); opacity: 0; } }',

      /* ---------- 列表滚动容器 ---------- */
      '.level-grid, .speed-grid {',
      '  overscroll-behavior: contain;',
      '  scrollbar-gutter: stable;',
      '}',

      /* Apple 桌面：覆盖式滚动条，静止时隐藏（配合 components.js 的 is-scrolling 类） */
      '[data-family="apple"] .level-grid::-webkit-scrollbar,',
      '[data-family="apple"] .speed-grid::-webkit-scrollbar { width: 8px; background: transparent; }',
      '[data-family="apple"] .level-grid::-webkit-scrollbar-thumb,',
      '[data-family="apple"] .speed-grid::-webkit-scrollbar-thumb {',
      '  background: rgba(255,255,255,0.20); border-radius: 999px;',
      '}',
      '[data-family="apple"] .level-grid:not(:hover):not(.is-scrolling)::-webkit-scrollbar-thumb,',
      '[data-family="apple"] .speed-grid:not(:hover):not(.is-scrolling)::-webkit-scrollbar-thumb {',
      '  background: transparent;',
      '}',

      /* Windows / Linux：常驻细滚动条 */
      '[data-family="windows"] .level-grid, [data-family="windows"] .speed-grid,',
      '[data-family="linux"] .level-grid, [data-family="linux"] .speed-grid {',
      '  scrollbar-width: thin;',
      '  scrollbar-color: rgba(255,255,255,0.35) transparent;',
      '}',

      /* 移动端：原生动量滚动 + 纵向滚动锁定（避免与横向手势冲突） */
      '[data-form-factor="mobile"] .level-grid,',
      '[data-form-factor="mobile"] .speed-grid {',
      '  -webkit-overflow-scrolling: touch;',
      '  touch-action: pan-y;',
      '  scrollbar-width: none;',
      '}',
      '[data-form-factor="mobile"] .level-grid::-webkit-scrollbar,',
      '[data-form-factor="mobile"] .speed-grid::-webkit-scrollbar { display: none; }',

      /* ---------- 条目：最小触摸热区 ---------- */
      '[data-form-factor="mobile"] .level-item,',
      '[data-form-factor="mobile"] .speed-item { min-height: var(--touch-target); }',

      /* ---------- 输入框 ---------- */
      '.speed-control input, input[type="number"], input[type="text"] {',
      '  min-height: var(--control-height);',
      '  border-radius: var(--radius-sm);',
      '  font-size: var(--font-size-root);',
      '  transition: border-color var(--motion-fast) var(--ease-standard),',
      '              box-shadow var(--motion-fast) var(--ease-standard);',
      '}',
      /* Apple 焦点环：柔和光晕 */
      '[data-family="apple"] .speed-control input:focus {',
      '  box-shadow: 0 0 0 4px rgba(77,150,255,0.25); border-color: var(--color-accent);',
      '}',
      /* Windows 焦点环：2px 实心强调色 */
      '[data-family="windows"] .speed-control input:focus {',
      '  box-shadow: inset 0 0 0 2px var(--color-accent); border-color: var(--color-accent);',
      '}',
      /* Android 焦点环：粗描边 + 上浮背景 */
      '[data-family="android"] .speed-control input:focus {',
      '  box-shadow: 0 0 0 2px var(--color-accent); border-color: var(--color-accent);',
      '  background: rgba(0,0,0,0.45);',
      '}',
      /* iOS：16px 防缩放（令牌兜底，components.js 会二次校正） */
      '[data-platform="ios"] input, [data-platform="ios"] textarea { font-size: 16px; }',

      /* ---------- macOS vibrancy：主进程接管毛玻璃，渲染层禁用 backdrop-filter ---------- */
      '[data-vibrancy] body { background: rgba(16, 18, 36, 0.55); }',
      '[data-vibrancy] .card { -webkit-backdrop-filter: none; backdrop-filter: none; }',
      '[data-vibrancy] .save-section { background: rgba(16, 18, 36, 0.65); }',

      /* ---------- 减少动效（无障碍） ---------- */
      '[data-reduced-motion] * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }'
    ].join('\n');
  }

  /* ========================================================================
   * 7) Material You 动态取色（仅 Android，可选）
   *    从用户壁纸/品牌色种子生成强调色。此处给出轻量实现：
   *    若 CSS 变量 --md-seed 存在则以其为种子，否则保持 M3 默认紫。
   * ======================================================================== */
  function applyDynamicColor() {
    if (Platform.family !== 'android') return;
    var seed = getComputedStyle(document.documentElement)
      .getPropertyValue('--md-seed').trim();
    if (!seed || !/^#([0-9a-f]{6})$/i.test(seed)) return;

    var hex = seed.replace('#', '');
    var r = parseInt(hex.substr(0, 2), 16);
    var g = parseInt(hex.substr(2, 2), 16);
    var b = parseInt(hex.substr(4, 2), 16);
    // 极简色调映射：暗色主题下取“色调 80”，演示用
    var scale = Platform.prefersDark ? 0.55 : 1.0;
    var tone = 'rgb(' + Math.round(r * scale) + ',' + Math.round(g * scale) + ',' + Math.round(b * scale) + ')';
    document.documentElement.style.setProperty('--color-accent', tone);
    document.documentElement.style.setProperty('--md-source', seed);
  }

  /* ========================================================================
   * 8) 入口：应用主题
   * ======================================================================== */
  function applyPlatformTheme() {
    var tokens = mergeTokens();
    injectStyle('platform-tokens', tokenCSS(tokens));
    injectStyle('platform-components', componentCSS());
    applyDynamicColor();
    document.documentElement.classList.add('platform-ready');

    // 暴露给组件层 / 业务层读取
    global.PlatformTokens = tokens;
    global.PlatformTheme = {
      tokens: tokens,
      refresh: applyPlatformTheme
    };
    return tokens;
  }

  // 加载即应用（脚本位于 </body> 前，DOM 已可写）
  applyPlatformTheme();
})(window);
