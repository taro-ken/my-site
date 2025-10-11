export function setupNav() {
  const navButton = document.querySelector('.navbar-icon-button');
  const navMenu = document.querySelector('.w-nav-menu');
  const closeButton = document.querySelector('.mobile-close-button');

  if (!navButton || !navMenu) return;

  const toggleNav = (forceClose = false) => {
    const isOpen = navMenu.classList.contains('is-open');

    if (forceClose && !isOpen) return; // 既に閉じている場合は何もしない

    if (isOpen) {
      // 閉じる時：アニメーションを開始してからクラスを削除
      document.body.classList.remove('nav-open');
      navMenu.classList.remove('is-open');
      setTimeout(() => {
        navMenu.classList.remove('is-visible');
      }, 300); // CSSのアニメーション時間と同じ
    } else {
      // 開く時：is-visibleを先に追加してからアニメーション
      document.body.classList.add('nav-open');
      navMenu.classList.add('is-visible');
      setTimeout(() => {
        navMenu.classList.add('is-open');
      }, 10);
    }
  };

  const closeNav = () => {
    if (navMenu.classList.contains('is-open')) {
      toggleNav(true);
    }
  };

  // ハンバーガーメニューボタンのクリック
  navButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleNav();
  });

  // クローズボタンのクリック
  if (closeButton) {
    closeButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeNav();
    });
  }

  // ナビゲーションリンクのクリック時も閉じる
  const navLinks = navMenu.querySelectorAll('.nav-link-container');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
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
