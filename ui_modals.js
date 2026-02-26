const modalFocusMap = new WeakMap();
const modalOpenOrder = [];

function getFocusableElement(root) {
    if (!root) return null;
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return root.querySelector(selector);
}

function openModal(overlay, focusTarget) {
    if (!overlay) return;
    if (!modalFocusMap.has(overlay)) {
        modalFocusMap.set(overlay, document.activeElement);
    }

    // ✅ 修正：強制設定為 flex 以顯示視窗 (覆蓋 CSS 的 display: none)
    overlay.style.display = 'flex';

    if (overlay.classList.contains('hidden')) {
        overlay.classList.remove('hidden');
    }
    overlay.setAttribute('aria-hidden', 'false');

    if (!modalOpenOrder.includes(overlay)) {
        modalOpenOrder.push(overlay);
    }
    const focusEl = focusTarget || document.getElementById('btn-restart-game') || getFocusableElement(overlay);
    if (focusEl && typeof focusEl.focus === 'function') {
        focusEl.focus();
    }
}

function closeModal(overlay) {
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    const previousFocus = modalFocusMap.get(overlay);
    if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus();
    }
    modalFocusMap.delete(overlay);
    const idx = modalOpenOrder.indexOf(overlay);
    if (idx >= 0) modalOpenOrder.splice(idx, 1);
}

function closeTopModal() {
    const overlay = modalOpenOrder[modalOpenOrder.length - 1];
    if (overlay) closeModal(overlay);
}
