export function setupNav() {
  const navButton = document.querySelector('.navbar-icon-button');
  const navMenu = document.querySelector('.w-nav-menu');
  const closeButton = document.querySelector('.mobile-close-button');

  if (!navButton || !navMenu) {
    console.log('Nav elements not found');
    return;
  }

  console.log('Nav elements found:', { navButton, navMenu, closeButton });

  const toggleNav = () => {
    const isOpen = navMenu.classList.contains('is-open');
    const isMobile = window.innerWidth <= 991;

    console.log('Toggle nav:', { isOpen, isMobile });
    console.log('Nav menu classes before:', navMenu.className);
    console.log('Nav menu computed style display:', window.getComputedStyle(navMenu).display);

    if (isOpen) {
      // 閉じる時
      document.body.classList.remove('nav-open');
      navMenu.classList.remove('is-open');

      // インラインスタイルをリセット
      navMenu.style.display = '';
      navMenu.style.position = '';
      navMenu.style.top = '';
      navMenu.style.left = '';
      navMenu.style.right = '';
      navMenu.style.bottom = '';
      navMenu.style.width = '';
      navMenu.style.height = '';
      navMenu.style.background = '';
      navMenu.style.zIndex = '';
      navMenu.style.opacity = '';
      navMenu.style.visibility = '';
      navMenu.style.flexDirection = '';
      navMenu.style.alignItems = '';
      navMenu.style.justifyContent = '';
      navMenu.style.padding = '';
      navMenu.style.boxSizing = '';
      navMenu.style.transform = '';
      navMenu.style.webkitTransform = '';

      setTimeout(() => {
        navMenu.classList.remove('is-visible');
        console.log('Nav menu classes after close:', navMenu.className);
      }, 300);
    } else {
      // 開く時
      document.body.classList.add('nav-open');
      navMenu.classList.add('is-visible');
      console.log('Nav menu classes after adding is-visible:', navMenu.className);

      // Instagram Webビューアー対応（モバイルのみ）
      if (isMobile && (navigator.userAgent.includes('Instagram') || window.location.search.includes('fbclid'))) {
        navMenu.style.position = 'absolute';
        navMenu.style.top = '-9999px';
        navMenu.style.left = '0';
        navMenu.style.right = '0';
        navMenu.style.bottom = '-9999px';
        navMenu.style.width = '100vw';
        navMenu.style.height = '200vh';
        navMenu.style.zIndex = '999999999';
        navMenu.style.transform = 'translateY(50vh)';
        navMenu.style.webkitTransform = 'translateY(50vh)';
        navMenu.style.margin = '0';
        navMenu.style.padding = '60px 40px 40px';
        navMenu.style.background = 'white';
        navMenu.style.border = 'none';
        navMenu.style.outline = 'none';
        navMenu.style.boxShadow = 'none';
        navMenu.style.display = 'flex';
        navMenu.style.flexDirection = 'column';
        navMenu.style.alignItems = 'flex-end';
        navMenu.style.justifyContent = 'flex-start';
        console.log('Applied Instagram WebView styles');
      }

      setTimeout(() => {
        navMenu.classList.add('is-open');

        // インラインスタイルで確実に表示
        navMenu.style.display = 'flex';
        navMenu.style.position = 'fixed';
        navMenu.style.top = '0';
        navMenu.style.left = '0';
        navMenu.style.right = '0';
        navMenu.style.bottom = '0';
        navMenu.style.width = '100vw';
        navMenu.style.height = '100vh';
        navMenu.style.background = 'white';
        navMenu.style.zIndex = '9999';
        navMenu.style.opacity = '1';
        navMenu.style.visibility = 'visible';
        navMenu.style.flexDirection = 'column';
        navMenu.style.alignItems = 'flex-end';
        navMenu.style.justifyContent = 'flex-start';
        navMenu.style.padding = '60px 40px 40px';
        navMenu.style.boxSizing = 'border-box';
        navMenu.style.transform = 'none';
        navMenu.style.webkitTransform = 'none';

        console.log('Nav menu classes after adding is-open:', navMenu.className);
        console.log('Nav menu computed style after is-open:', {
          display: window.getComputedStyle(navMenu).display,
          opacity: window.getComputedStyle(navMenu).opacity,
          visibility: window.getComputedStyle(navMenu).visibility,
          position: window.getComputedStyle(navMenu).position
        });
      }, 10);
    }
  };

  const closeNav = () => {
    console.log('Close nav');
    if (navMenu.classList.contains('is-open')) {
      toggleNav();
    }
  };

  // ハンバーガーメニューボタンのクリック
  navButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Nav button clicked');
    toggleNav();
  });

  // クローズボタンのクリック
  if (closeButton) {
    closeButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Close button clicked');
      closeNav();
    });
  }

  // ナビゲーションリンクのクリック時も閉じる
  const navLinks = navMenu.querySelectorAll('.nav-link-container');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      console.log('Nav link clicked');
      closeNav();
    });
  });

  // サイドバーメニュー自体のクリック（閉じないようにする）
  navMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // ESCキーで閉じる
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      closeNav();
    }
  };
  document.addEventListener('keydown', handleKeyDown);

  console.log('Nav setup complete');

  // クリーンアップ関数
  const cleanup = () => {
    navButton.removeEventListener('click', toggleNav);
    if (closeButton) {
      closeButton.removeEventListener('click', closeNav);
    }
    navLinks.forEach(link => {
      link.removeEventListener('click', closeNav);
    });
    navMenu.removeEventListener('click', closeNav);
    document.removeEventListener('keydown', handleKeyDown);
  };

  return cleanup;
}
