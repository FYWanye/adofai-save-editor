/**
 * platform.js —— 平台 / 形态检测层
 * =================================
 * 唯一“判断环境”的地方。其余模块只读 Platform 对象，不再自行判断 UA / process.platform。
 *
 * 产出两类信息：
 *   - 操作系统（os）：darwin | win32 | linux | ios | android
 *   - 平台族（family）：apple | windows | android | linux  ← 决定“视觉语言”
 *   - 形态（isMobile）：桌面 vs 移动  ← 决定“交互手势”
 *
 * 兼容 Electron（可用 process.platform）与 Capacitor / 纯 WebView（只用 UA + 触摸点）。
 */
(function (global) {
  'use strict';

  function detect() {
    var ua = navigator.userAgent || '';
    var isElectron = typeof process !== 'undefined' &&
                     process.versions && !!process.versions.electron;

    /* ---- 1. 移动系统（优先判断） ---- */
    // iPadOS 13+ 会把 UA 伪装成 Macintosh，需结合 maxTouchPoints 识别
    var isIOS = /iPad|iPhone|iPod/.test(ua) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var isAndroid = /Android/i.test(ua);

    /* ---- 2. 操作系统 ---- */
    var os = 'linux';
    if (isIOS) {
      os = 'ios';
    } else if (isAndroid) {
      os = 'android';
    } else if (isElectron && process.platform) {
      os = process.platform; // darwin | win32 | linux
    } else if (/Mac OS X|Macintosh/.test(ua)) {
      os = 'darwin';
    } else if (/Windows/.test(ua)) {
      os = 'win32';
    }

    /* ---- 3. 移动形态 ---- */
    var isMobile = isIOS || isAndroid || /Mobi/i.test(ua);

    /* ---- 4. 平台族：决定视觉语言 ---- */
    var family = isIOS ? 'apple'
      : isAndroid ? 'android'
      : os === 'darwin' ? 'apple'
      : os === 'win32' ? 'windows'
      : 'linux';

    var hasTouch = ('ontouchstart' in global) || (navigator.maxTouchPoints > 0);

    return {
      os: os,
      family: family,
      isElectron: isElectron,
      isDesktop: !isMobile,
      isMobile: isMobile,
      isIOS: isIOS,
      isAndroid: isAndroid,
      isMac: os === 'darwin' && !isIOS,
      isWindows: os === 'win32',
      isLinux: os === 'linux',
      maxTouchPoints: navigator.maxTouchPoints || 0,
      hasTouch: hasTouch,
      prefersReducedMotion: !!(global.matchMedia &&
        global.matchMedia('(prefers-reduced-motion: reduce)').matches),
      prefersDark: !!(global.matchMedia &&
        global.matchMedia('(prefers-color-scheme: dark)').matches)
    };
  }

  global.Platform = detect();

  // 主进程注入的毛玻璃接管标记（macOS vibrancy）：
  // 渲染层据此跳过 CSS backdrop-filter，改由系统合成器渲染
  var vibrancy = null;
  if (typeof process !== 'undefined' && Array.isArray(process.argv)) {
    var arg = process.argv.find(function (a) { return a.indexOf('--app-vibrancy=') === 0; });
    if (arg) vibrancy = arg.split('=')[1];
  }
  if (vibrancy) global.Platform.vibrancy = vibrancy;

  // 首次识别即写入 <html>，供 CSS 选择器 [data-platform=...] 使用
  var root = document.documentElement;
  root.setAttribute('data-platform', global.Platform.os);
  root.setAttribute('data-family', global.Platform.family);
  root.setAttribute('data-form-factor', global.Platform.isMobile ? 'mobile' : 'desktop');
  if (global.Platform.hasTouch) root.setAttribute('data-touch', '');
  if (global.Platform.prefersReducedMotion) root.setAttribute('data-reduced-motion', '');
  if (vibrancy) root.setAttribute('data-vibrancy', vibrancy);
})(window);
