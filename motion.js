(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const layers = [...document.querySelectorAll('.parallax-layer')];
  let frame = 0, x = 0, y = 0, targetX = 0, targetY = 0;

  function reset() {
    cancelAnimationFrame(frame);
    frame = x = y = targetX = targetY = 0;
    layers.forEach(layer => layer.style.removeProperty('transform'));
  }

  function draw() {
    frame = 0;
    if (reduced.matches) return reset();
    x += (targetX - x) * .085;
    y += (targetY - y) * .085;
    layers.forEach(layer => {
      const depth = Number(layer.dataset.depth);
      layer.style.transform = `translate3d(${x * depth}px, ${y * depth}px, 0)`;
    });
    if (Math.abs(targetX - x) + Math.abs(targetY - y) > .02) frame = requestAnimationFrame(draw);
  }

  function aim(nextX, nextY) {
    if (reduced.matches || document.hidden) return;
    targetX = nextX;
    targetY = nextY;
    if (!frame) frame = requestAnimationFrame(draw);
  }

  window.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch') aim((event.clientX / innerWidth - .5) * 10, (event.clientY / innerHeight - .5) * 8);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => aim(0, 0));
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  reduced.addEventListener('change', reset);

  // Use tilt only where the platform provides it without a permission prompt.
  if ('DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission !== 'function') {
    window.addEventListener('deviceorientation', event => {
      if (event.gamma != null && event.beta != null) {
        aim(Math.max(-5, Math.min(5, event.gamma / 5)), Math.max(-4, Math.min(4, (event.beta - 45) / 8)));
      }
    }, { passive: true });
  }
})();
