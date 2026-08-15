export const APP_EMBED_HIDING_SCRIPT = `
(function () {
  var STYLE_ID = 'taro-app-embed-style';
  var SIGN_OUT_REQUEST = 'taroessence:signout-request';
  var STYLE_CONTENT =
    'header,#mobile-menu,#mobile-menu-btn{display:none!important;visibility:hidden!important;}' +
    'main[class*="pt-32"],main[class*="pt-28"],main[class*="pt-24"]{' +
    'padding-top:calc(env(safe-area-inset-top,0px) + 1rem)!important;}' +
    'main > div[class*="pt-24"],main > div[class*="pt-28"],main > div > div[class*="pt-24"],main > div > div[class*="pt-28"]{' +
    'padding-top:0!important;padding-bottom:0!important;margin-bottom:0!important;}' +
    'main > div[class*="pt-24"] > p,main > div[class*="pt-28"] > p,main > div[class*="pt-24"] > h1,main > div[class*="pt-28"] > h1,' +
    'main > div > div[class*="pt-24"] > p,main > div > div[class*="pt-28"] > p,main > div > div[class*="pt-24"] > h1,main > div > div[class*="pt-28"] > h1,' +
    'main > div > div[class*="text-center"] > p,main > div > div[class*="text-center"] > h1{' +
    'display:none!important;visibility:hidden!important;}' +
    'main > div > div[class*="text-center"]{' +
    'margin-bottom:0!important;}';

  function hidePageHero() {
    var main = document.querySelector('main');
    if (!main) {
      return;
    }

    var wrappers = main.querySelectorAll(
      ':scope > div[class*="pt-24"], :scope > div[class*="pt-28"], :scope > div > div[class*="text-center"]',
    );

    wrappers.forEach(function (wrapper) {
      if (!(wrapper instanceof HTMLElement)) {
        return;
      }

      wrapper.querySelectorAll(':scope > p, :scope > h1').forEach(function (node) {
        node.style.setProperty('display', 'none', 'important');
        node.style.setProperty('visibility', 'hidden', 'important');
      });

      wrapper.style.setProperty('padding-top', '0', 'important');
      wrapper.style.setProperty('padding-bottom', '0', 'important');
      wrapper.style.setProperty('margin-bottom', '0', 'important');
    });

    main.style.setProperty(
      'padding-top',
      'calc(env(safe-area-inset-top, 0px) + 1rem)',
      'important',
    );
  }

  function isSignOutForm(form) {
  if (!(form instanceof HTMLFormElement)) {
    return false;
  }

  var action = form.getAttribute('action') || '';
  return action === '/api/auth/signout' || action.endsWith('/api/auth/signout');
}

function requestSignOut() {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(SIGN_OUT_REQUEST);
    return true;
  }

  window.location.assign('/api/auth/signout');
  return false;
}

function bindSignOutHandlers() {
  if (window.__taroAppSignOutBound) {
    return;
  }

  window.__taroAppSignOutBound = true;

  document.addEventListener(
    'click',
    function (event) {
      var target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (!target.closest('#signout-btn')) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      requestSignOut();
    },
    true,
  );

  document.addEventListener(
    'submit',
    function (event) {
      if (!isSignOutForm(event.target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      requestSignOut();
    },
    true,
  );
}

  function apply() {
    document.documentElement.classList.add('app-embed');
    document.documentElement.dataset.appEmbed = 'true';

    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = STYLE_CONTENT;
      document.head.appendChild(style);
    }

    document.querySelectorAll('header, #mobile-menu, #mobile-menu-btn').forEach(function (node) {
      node.style.setProperty('display', 'none', 'important');
      node.style.setProperty('visibility', 'hidden', 'important');
    });

    if (document.body) {
      document.body.style.setProperty('overflow', 'auto', 'important');
    }

    hidePageHero();
  }

  bindSignOutHandlers();
  apply();

  if (!window.__taroAppEmbedBound) {
    window.__taroAppEmbedBound = true;
    document.addEventListener('DOMContentLoaded', apply);
    window.addEventListener('pageshow', apply);
    document.addEventListener('astro:after-swap', apply);

    new MutationObserver(apply).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
})();
true;
`;
