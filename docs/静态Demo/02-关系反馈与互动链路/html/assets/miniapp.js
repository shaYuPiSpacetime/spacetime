(function () {
  const common = window.DemoCommon || {};
  const qs = common.qs || ((selector, root = document) => root.querySelector(selector));
  const qsa = common.qsa || ((selector, root = document) => Array.from(root.querySelectorAll(selector)));
  const showToast = common.showToast || (() => {});
  const openModal = common.openModal || (() => {});
  const closeModal = common.closeModal || (() => {});

  common.wireBackdropClose?.();

  qsa('[data-set-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      const [screenName, mode] = button.dataset.setMode.split(':');
      const screen = qs(`[data-mode-screen="${screenName}"]`);
      if (!screen) return;
      screen.dataset.mode = mode;
      qsa(`[data-control-group="${screenName}"] [data-set-mode]`).forEach((item) => {
        item.classList.toggle('is-active', item === button);
      });
    });
  });

  qsa('[data-open-single-unlock]').forEach((button) => {
    button.addEventListener('click', () => {
      const scene = button.dataset.openSingleUnlock;
      const subtitle = scene === 'viewers' ? '揭秘是谁来看过你' : '解锁喜欢你的人';
      const costText = scene === 'viewers'
        ? '只看 ta 需要 20 千寻币，确认后当前访客记录永久清晰；最近看过我的列表仍受 7 天窗口限制。'
        : '只看 ta 需要 20 千寻币，确认后当前喜欢记录永久清晰。';
      const subtitleNode = qs('[data-single-unlock-subtitle]');
      const costNode = qs('[data-single-unlock-cost]');
      if (subtitleNode) subtitleNode.textContent = subtitle;
      if (costNode) costNode.textContent = costText;
      openModal('singleUnlockModal');
    });
  });

  qsa('[data-open-relation-modal]').forEach((button) => {
    button.addEventListener('click', () => openModal(button.dataset.openRelationModal));
  });

  qsa('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      if (!document.body.hasAttribute('tabindex')) {
        document.body.setAttribute('tabindex', '-1');
      }
      document.body.focus({ preventScroll: true });
      closeModal(button);
    });
  });

  qsa('[data-toast]').forEach((button) => {
    button.addEventListener('click', () => {
      showToast(button.dataset.toast, button.dataset.toastType || 'success');
    });
  });
})();
