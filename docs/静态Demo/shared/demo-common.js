(function () {
  if (window.DemoCommon) return;

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function statusClass(status) {
    if (/通过|开放|正常|完成|一致/.test(status)) return 'success';
    if (/驳回|冻结|失败|不可用|未完成/.test(status)) return 'danger';
    if (/审核|待|未提交|失效|冲突|敏感/.test(status)) return 'warning';
    return 'brand';
  }

  function showToast(message, type = 'success') {
    let stack = qs('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    stack.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
      if (!stack.children.length) stack.remove();
    }, 2600);
  }

  function openSurface(id) {
    const surface = document.getElementById(id);
    if (!surface) return null;
    surface.classList.add('is-open');
    surface.setAttribute('aria-hidden', 'false');
    return surface;
  }

  function closeSurface(target, selector) {
    const surface = target.closest(selector);
    if (!surface) return;
    surface.classList.remove('is-open');
    surface.setAttribute('aria-hidden', 'true');
  }

  function openModal(id) {
    openSurface(id);
  }

  function closeModal(target) {
    closeSurface(target, '.modal-backdrop');
  }

  function openDrawer(id) {
    openSurface(id);
  }

  function closeDrawer(target) {
    closeSurface(target, '.drawer-backdrop');
  }

  function wireBackdropClose(root = document) {
    qsa('.modal-backdrop, .drawer-backdrop', root).forEach((backdrop) => {
      backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) {
          backdrop.classList.remove('is-open');
          backdrop.setAttribute('aria-hidden', 'true');
        }
      });
    });
  }

  window.DemoCommon = {
    qs,
    qsa,
    escapeHtml,
    statusClass,
    showToast,
    openModal,
    closeModal,
    openDrawer,
    closeDrawer,
    wireBackdropClose
  };

  window.showToast = showToast;
  window.openModal = openModal;
  window.openDrawer = openDrawer;
})();
