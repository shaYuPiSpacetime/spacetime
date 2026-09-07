const currentYear = document.querySelector('[data-current-year]');
const menuToggle = document.querySelector('[data-menu-toggle]');
const navigation = document.querySelector('[data-navigation]');

if (currentYear) {
  currentYear.textContent = String(new Date().getFullYear());
}

const closeMenu = () => {
  if (!menuToggle || !navigation) return;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.querySelector('.sr-only').textContent = '打开导航';
  navigation.dataset.open = 'false';
  document.body.classList.remove('menu-open');
};

if (menuToggle && navigation) {
  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    menuToggle.querySelector('.sr-only').textContent = isOpen ? '打开导航' : '关闭导航';
    navigation.dataset.open = String(!isOpen);
    document.body.classList.toggle('menu-open', !isOpen);
  });

  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
      menuToggle.focus();
    }
  });

  window.addEventListener('resize', () => {
    if (window.matchMedia('(min-width: 48rem)').matches) closeMenu();
  });
}
