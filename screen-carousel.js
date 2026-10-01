(() => {
  const carousel = document.querySelector('[data-screen-carousel]');
  if (!carousel) return;
  const slides = [...carousel.querySelectorAll('.screen-slide')];
  const choices = [...carousel.querySelectorAll('[data-screen-select]')];
  const viewport = carousel.querySelector('.screen-viewport');
  const status = carousel.querySelector('[data-screen-status]');
  const dialog = document.getElementById('screenDialog');
  let current = 0;
  let gesture = null;
  let opener = null;

  function show(index) {
    const next = (index + slides.length) % slides.length;
    if (next !== current && slides[current].contains(document.activeElement)) viewport.focus({ preventScroll: true });
    current = next;
    slides.forEach((slide, i) => { slide.hidden = i !== current; });
    choices.forEach((choice, i) => choice.setAttribute('aria-pressed', String(i === current)));
    status.textContent = `${current + 1} de ${slides.length} · ${choices[current].textContent}`;
  }

  carousel.querySelector('[data-screen-prev]').addEventListener('click', () => show(current - 1));
  carousel.querySelector('[data-screen-next]').addEventListener('click', () => show(current + 1));
  choices.forEach((choice, i) => choice.addEventListener('click', () => show(i)));
  carousel.addEventListener('keydown', (event) => {
    const actions = { ArrowLeft: () => current - 1, ArrowRight: () => current + 1, Home: () => 0, End: () => slides.length - 1 };
    if (!actions[event.key] || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    show(actions[event.key]());
  });

  viewport.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary) { gesture = null; return; }
    if (event.isPrimary && ['touch', 'pen'].includes(event.pointerType) && !event.target.closest('button')) {
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }
  });
  viewport.addEventListener('pointerup', (event) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    gesture = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
  });
  viewport.addEventListener('pointercancel', () => { gesture = null; });

  carousel.querySelectorAll('[data-screen-zoom]').forEach((button) => button.addEventListener('click', () => {
    const original = slides[current].querySelector('img');
    const enlarged = dialog.querySelector('img');
    enlarged.src = original.src;
    enlarged.alt = original.alt;
    enlarged.width = original.width;
    enlarged.height = original.height;
    document.getElementById('screenDialogTitle').textContent = choices[current].textContent;
    opener = button;
    dialog.showModal();
  }));
  dialog.querySelector('[data-screen-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { opener?.focus({ preventScroll: true }); });
})();
