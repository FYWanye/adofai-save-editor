/**
 * interactions.js —— 交互事件差异化层
 * ======================================
 * 同一“语义动作”在不同端绑定不同原生事件：
 *
 *   语义          桌面端                    移动端
 *   ------------  ------------------------  ------------------------
 *   轻点/点击     click                     touchend（无 300ms 延迟）
 *   滚动          wheel（passive）          scroll（原生动量）
 *   次要操作      contextmenu（右键）       长按（touch 500ms）
 *   焦点反馈      键盘焦点                 触摸焦点 + 触感（vibrate）
 *
 * 对外暴露纯函数，所有函数返回 dispose（解绑）函数，便于热切换与内存回收。
 */
(function (global) {
  'use strict';

  var Platform = global.Platform;
  var LONG_PRESS_MS = 500;   // 长按判定时长
  var MOVE_TOLERANCE = 10;   // 移动超过该像素即取消长按（区分滚动）

  /* 长按后抑制 WebView 合成的 click，避免一次长按触发两次动作 */
  var suppressNextClick = false;
  document.addEventListener('click', function (e) {
    if (suppressNextClick) {
      suppressNextClick = false;
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);

  function scheduleSuppress() {
    suppressNextClick = true;
    // 合成 click 通常在 touchend 后立即派发；兜底超时复位
    setTimeout(function () { suppressNextClick = false; }, 400);
  }

  /* ==========================================================================
   * onTap —— 轻点
   *   桌面：直接绑定 click
   *   移动：touch 判定（位移 < 10px 视为轻点），并阻止合成 click 重复触发
   * ========================================================================== */
  function onTap(element, handler) {
    if (!Platform.isMobile) {
      element.addEventListener('click', handler);
      return function off() { element.removeEventListener('click', handler); };
    }

    var startX = 0, startY = 0, moved = false;
    function onStart(e) {
      var t = e.touches[0];
      startX = t.clientX; startY = t.clientY; moved = false;
    }
    function onMove(e) {
      var t = e.touches[0];
      if (Math.abs(t.clientX - startX) > MOVE_TOLERANCE ||
          Math.abs(t.clientY - startY) > MOVE_TOLERANCE) moved = true;
    }
    function onEnd(e) {
      if (moved) return;
      e.preventDefault();       // 阻断合成 click
      handler(e);
    }

    element.addEventListener('touchstart', onStart, { passive: true });
    element.addEventListener('touchmove', onMove, { passive: true });
    element.addEventListener('touchend', onEnd, { passive: false });

    return function off() {
      element.removeEventListener('touchstart', onStart);
      element.removeEventListener('touchmove', onMove);
      element.removeEventListener('touchend', onEnd);
    };
  }

  /* ==========================================================================
   * onScroll —— 滚动
   *   桌面：wheel（passive，不阻塞主线程）
   *   移动：scroll（native 动量滚动由 CSS 负责）
   * ========================================================================== */
  function onScroll(element, handler) {
    var evt = Platform.isMobile ? 'scroll' : 'wheel';
    element.addEventListener(evt, handler, { passive: true });
    return function off() { element.removeEventListener(evt, handler); };
  }

  /* ==========================================================================
   * attachLongPress —— 单元素长按
   * ========================================================================== */
  function attachLongPress(element, handler, opts) {
    if (!Platform.isMobile) return function () {};

    var longMs = (opts && opts.delay) || LONG_PRESS_MS;
    var startX = 0, startY = 0, fired = false, timer = null;

    function clear() {
      if (timer) { clearTimeout(timer); timer = null; }
    }
    function onStart(e) {
      var t = e.touches[0];
      startX = t.clientX; startY = t.clientY; fired = false;
      clear();
      timer = setTimeout(function () {
        fired = true;
        scheduleSuppress();       // 长按结束后抑制合成 click
        handler(e);
      }, longMs);
    }
    function onMove(e) {
      if (!timer) return;
      var t = e.touches[0];
      if (Math.abs(t.clientX - startX) > MOVE_TOLERANCE ||
          Math.abs(t.clientY - startY) > MOVE_TOLERANCE) clear();
    }
    function onEnd() { clear(); }

    element.addEventListener('touchstart', onStart, { passive: true });
    element.addEventListener('touchmove', onMove, { passive: true });
    element.addEventListener('touchend', onEnd);
    element.addEventListener('touchcancel', onEnd);

    return function off() {
      clear();
      element.removeEventListener('touchstart', onStart);
      element.removeEventListener('touchmove', onMove);
      element.removeEventListener('touchend', onEnd);
      element.removeEventListener('touchcancel', onEnd);
    };
  }

  /* ==========================================================================
   * delegateLongPress —— 事件委托版长按（适配动态生成的列表项）
   * ========================================================================== */
  function delegateLongPress(scope, selector, handler, opts) {
    if (!Platform.isMobile) return function () {};
    scope = scope || document;

    var active = null; // { el, x, y, fired, timer }
    var longMs = (opts && opts.delay) || LONG_PRESS_MS;

    function clear() {
      if (active && active.timer) { clearTimeout(active.timer); }
      active = null;
    }
    function onStart(e) {
      var el = e.target && e.target.closest ? e.target.closest(selector) : null;
      if (!el) return;
      var t = e.touches[0];
      var rec = { el: el, x: t.clientX, y: t.clientY, fired: false, timer: null };
      active = rec;
      rec.timer = setTimeout(function () {
        rec.fired = true;
        active = null;
        scheduleSuppress();
        handler(rec.el, e);
      }, longMs);
    }
    function onMove(e) {
      if (!active) return;
      var t = e.touches[0];
      if (Math.abs(t.clientX - active.x) > MOVE_TOLERANCE ||
          Math.abs(t.clientY - active.y) > MOVE_TOLERANCE) clear();
    }
    function onEnd() { clear(); }

    scope.addEventListener('touchstart', onStart, { passive: true });
    scope.addEventListener('touchmove', onMove, { passive: true });
    scope.addEventListener('touchend', onEnd);
    scope.addEventListener('touchcancel', onEnd);

    return function off() {
      clear();
      scope.removeEventListener('touchstart', onStart);
      scope.removeEventListener('touchmove', onMove);
      scope.removeEventListener('touchend', onEnd);
      scope.removeEventListener('touchcancel', onEnd);
    };
  }

  /* ==========================================================================
   * onContextMenu / delegateContextMenu —— 次要操作
   *   桌面：右键（contextmenu）
   *   移动：长按（自动降级）
   * ========================================================================== */
  function onContextMenu(element, handler) {
    if (Platform.isMobile) return attachLongPress(element, handler);
    function onCtx(e) { e.preventDefault(); handler(e); }
    element.addEventListener('contextmenu', onCtx);
    return function off() { element.removeEventListener('contextmenu', onCtx); };
  }

  function delegateContextMenu(scope, selector, handler) {
    if (Platform.isMobile) {
      return delegateLongPress(scope, selector, function (el, e) { handler(el, e); });
    }
    scope = scope || document;
    function onCtx(e) {
      var el = e.target && e.target.closest ? e.target.closest(selector) : null;
      if (el) { e.preventDefault(); handler(el, e); }
    }
    scope.addEventListener('contextmenu', onCtx);
    return function off() { scope.removeEventListener('contextmenu', onCtx); };
  }

  /* ==========================================================================
   * haptic —— 触感反馈（仅移动端，静默降级）
   * ========================================================================== */
  function haptic(pattern) {
    if (Platform.isMobile && navigator.vibrate) {
      navigator.vibrate(pattern || 15);
    }
  }

  global.Interactions = {
    LONG_PRESS_MS: LONG_PRESS_MS,
    onTap: onTap,
    onScroll: onScroll,
    attachLongPress: attachLongPress,
    delegateLongPress: delegateLongPress,
    onContextMenu: onContextMenu,
    delegateContextMenu: delegateContextMenu,
    haptic: haptic
  };
})(window);
