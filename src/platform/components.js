/**
 * components.js —— 三类基础组件的平台差异化行为层
 * ==================================================
 *   视觉差异由 platformStyles.js 的 Token + CSS 负责；
 *   本文件只负责“行为”差异：
 *
 *   1) ScrollBehavior —— 列表滚动（滚轮/键盘 vs 原生动量）
 *   2) Buttons        —— 按钮（Android 波纹、Apple 回弹、Windows 下沉）
 *   3) Inputs         —— 输入框（iOS 16px 防缩放、inputmode、焦点态）
 *
 * 采用事件委托 + 属性标记，动态生成的元素（关卡/飚速条目）自动生效，
 * 无需修改 renderer.js 的渲染代码。
 */
(function (global) {
  'use strict';

  var Platform = global.Platform;
  var Interactions = global.Interactions;

  /* ========================================================================
   * 1) 列表滚动
   * ======================================================================== */
  var ScrollBehavior = {
    enhance: function (container) {
      if (!container || container.hasAttribute('data-scroll-enhanced')) return null;
      container.setAttribute('data-scroll-enhanced', '');

      var disposers = [];

      if (Platform.isMobile) {
        // 移动端：原生动量滚动由 CSS 负责，这里锁定纵向手势
        container.style.touchAction = 'pan-y';
        container.style.webkitOverflowScrolling = 'touch';
      } else {
        // 桌面端：Apple 覆盖式滚动条——滚动时显示，静止 800ms 后隐藏
        var idleTimer = null;
        var markScrolling = function () {
          container.classList.add('is-scrolling');
          clearTimeout(idleTimer);
          idleTimer = setTimeout(function () {
            container.classList.remove('is-scrolling');
          }, 800);
        };
        container.addEventListener('wheel', markScrolling, { passive: true });
        container.addEventListener('scroll', markScrolling, { passive: true });
        disposers.push(function () {
          container.removeEventListener('wheel', markScrolling);
          container.removeEventListener('scroll', markScrolling);
        });

        // 桌面端：键盘导航（方向键 / PageUp / PageDown / Home / End）
        if (container.tabIndex < 0) container.tabIndex = 0;
        var onKey = function (e) {
          var step = 96;
          switch (e.key) {
            case 'ArrowDown': container.scrollTop += step; e.preventDefault(); break;
            case 'ArrowUp':   container.scrollTop -= step; e.preventDefault(); break;
            case 'PageDown':  container.scrollTop += container.clientHeight; e.preventDefault(); break;
            case 'PageUp':    container.scrollTop -= container.clientHeight; e.preventDefault(); break;
            case 'Home':      container.scrollTop = 0; e.preventDefault(); break;
            case 'End':       container.scrollTop = container.scrollHeight; e.preventDefault(); break;
          }
        };
        container.addEventListener('keydown', onKey);
        disposers.push(function () { container.removeEventListener('keydown', onKey); });
      }

      return function dispose() {
        disposers.forEach(function (d) { d(); });
        container.removeAttribute('data-scroll-enhanced');
      };
    }
  };

  /* ========================================================================
   * 2) 按钮
   * ======================================================================== */
  var Buttons = {
    enhance: function (scope) {
      scope = scope || document;
      var disposers = [];

      // Android / Material：点击波纹（事件委托，动态按钮也生效）
      if (Platform.family === 'android') {
        var onPointerDown = function (e) {
          var btn = e.target && e.target.closest ? e.target.closest('.btn') : null;
          if (!btn) return;
          var rect = btn.getBoundingClientRect();
          var d = Math.max(rect.width, rect.height) * 2;
          var ripple = document.createElement('span');
          ripple.className = 'btn-ripple';
          ripple.style.width = ripple.style.height = d + 'px';
          ripple.style.left = (e.clientX - rect.left - d / 2) + 'px';
          ripple.style.top = (e.clientY - rect.top - d / 2) + 'px';
          btn.appendChild(ripple);
          ripple.addEventListener('animationend', function () { ripple.remove(); });
        };
        scope.addEventListener('pointerdown', onPointerDown);
        disposers.push(function () { scope.removeEventListener('pointerdown', onPointerDown); });
      }

      // 移动端：触感反馈（按钮点按轻震）
      if (Platform.isMobile) {
        var onTap = function (e) {
          var btn = e.target && e.target.closest ? e.target.closest('.btn') : null;
          if (btn) Interactions.haptic(10);
        };
        scope.addEventListener('click', onTap, true);
        disposers.push(function () { scope.removeEventListener('click', onTap, true); });
      }

      return function dispose() {
        disposers.forEach(function (d) { d(); });
      };
    }
  };

  /* ========================================================================
   * 3) 输入框
   * ======================================================================== */
  var Inputs = {
    enhance: function (scope) {
      scope = scope || document;
      var inputs = scope.querySelectorAll('input, textarea');

      inputs.forEach(function (el) {
        // iOS：字号 < 16px 会在聚焦时触发自动缩放，强制 16px
        if (Platform.isIOS) {
          if (parseFloat(window.getComputedStyle(el).fontSize) < 16) {
            el.style.fontSize = '16px';
          }
          el.setAttribute('enterkeyhint', 'done');
        }

        // 数字输入在移动端弹数字键盘
        if (el.type === 'number') {
          el.setAttribute('inputmode', 'decimal');
          if (Platform.isMobile) el.setAttribute('pattern', '[0-9]*\\.?[0-9]*');
        }

        // 焦点态标记：供 CSS [data-focused] 规则与触感联动
        var onFocus = function () { el.setAttribute('data-focused', ''); };
        var onBlur = function () { el.removeAttribute('data-focused'); };
        el.addEventListener('focus', onFocus);
        el.addEventListener('blur', onBlur);
      });
    }
  };

  /* ========================================================================
   * 次要操作路由（同一语义，不同手势）
   *   桌面：右键菜单   移动：长按
   * 业务动作通过全局钩子 window.onSecondaryAction(el) 注入，
   * 平台层与业务层解耦。
   * ======================================================================== */
  function wireSecondaryAction() {
    var selector = '.level-item, .speed-item';
    var invoke = function (el) {
      if (typeof global.onSecondaryAction === 'function') {
        global.onSecondaryAction(el);
      }
    };

    if (Platform.isMobile) {
      Interactions.delegateLongPress(document, selector, function (el) {
        Interactions.haptic(15);
        invoke(el);
      });
    } else {
      Interactions.delegateContextMenu(document, selector, function (el) {
        invoke(el);
      });
    }
  }

  /* ========================================================================
   * 启动：在 DOM 就绪后增强静态组件 + 建立委托
   * ======================================================================== */
  function boot() {
    document.querySelectorAll('.level-grid, .speed-grid, [data-scrollable]')
      .forEach(function (el) { ScrollBehavior.enhance(el); });

    Buttons.enhance(document);
    Inputs.enhance(document);
    wireSecondaryAction();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  global.PlatformUI = {
    ScrollBehavior: ScrollBehavior,
    Buttons: Buttons,
    Inputs: Inputs,
    boot: boot
  };
})(window);
