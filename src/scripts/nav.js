export function setupNav() {
  const navButton = document.querySelector('.navbar-icon-button');
  const navMenu = document.querySelector('.w-nav-menu');

  if (!navButton || !navMenu) return;

  const toggleNav = (forceClose = false) => {
    const isOpen = navMenu.classList.contains('is-open');

    if (forceClose && !isOpen) return; // 既に閉じている場合は何もしない

    if (isOpen) {
      // 閉じる時：アニメーションを開始してからクラスを削除
      navMenu.classList.remove('is-open');
      setTimeout(() => {
        navMenu.classList.remove('is-visible');
      }, 300); // CSSのアニメーション時間と同じ
    } else {
      // 開く時：is-visibleを先に追加してからアニメーション
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
    e.stopPropagation();
    toggleNav();
  });

  // サイドバーメニュー自体のクリック（閉じないようにする）
  navMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // 外側をクリックした時に閉じる
  document.addEventListener('click', closeNav);

  // クリーンアップ関数
  const cleanup = () => {
    navButton.removeEventListener('click', toggleNav);
    navMenu.removeEventListener('click', closeNav);
    document.removeEventListener('click', closeNav);
  };

  return cleanup;
}
