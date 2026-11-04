(() => {
  const body = document.body;
  const query = new URLSearchParams(location.search);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const collapse = document.querySelector('.collapse');
  const controls = document.querySelector('#preview-controls');
  const note = document.querySelector('.motion-note');
  collapse.addEventListener('click', () => {
    controls.hidden = !controls.hidden;
    collapse.setAttribute('aria-expanded', String(!controls.hidden));
    collapse.textContent = controls.hidden ? 'Show controls' : 'Hide controls';
  });
  function reducedNote() { note.hidden = !reduced.matches; }
  reducedNote();
  reduced.addEventListener('change', reducedNote);
  function save(values) {
    const url = new URL(location.href);
    url.search = new URLSearchParams(values).toString();
    history.replaceState(null, '', url);
  }
  if (body.classList.contains('grid-preview')) {
    const keys = ['color', 'intensity', 'speed'];
    function apply() {
      const values = {};
      keys.forEach(key => {
        const value = document.querySelector(`#grid-${key}`).value;
        body.dataset[key === 'color' ? 'grid' : key] = value;
        values[key] = value;
      });
      save(values);
    }
    keys.forEach(key => {
      const select = document.querySelector(`#grid-${key}`);
      if ([...select.options].some(option => option.value === query.get(key))) select.value = query.get(key);
      select.addEventListener('change', apply);
    });
    apply();
    return;
  }
  const effects = ['breath', 'snap', 'glint', 'parallax'];
  const presets = { A: ['breath'], B: ['breath', 'snap'], C: ['breath', 'glint'], D: ['breath', 'parallax'] };
  const inputs = Object.fromEntries(effects.map(name => [name, document.getElementById(name)]));
  const replay = document.getElementById('replay');
  const layers = [...document.querySelectorAll('.parallax-layer')];
  let frame = 0, x = 0, y = 0, targetX = 0, targetY = 0, introFrame = 0;
  function resetParallax() {
    cancelAnimationFrame(frame); frame = 0;
    x = y = targetX = targetY = 0;
    layers.forEach(layer => layer.style.removeProperty('transform'));
  }
  function draw() {
    frame = 0;
    if (!inputs.parallax.checked || reduced.matches) return resetParallax();
    x += (targetX - x) * .085;
    y += (targetY - y) * .085;
    layers.forEach(layer => {
      const depth = Number(layer.dataset.depth);
      layer.style.transform = `translate3d(${x * depth}px, ${y * depth}px, 0)`;
    });
    if (Math.abs(targetX - x) + Math.abs(targetY - y) > .02) frame = requestAnimationFrame(draw);
  }
  function aim(nextX, nextY) {
    if (!inputs.parallax.checked || reduced.matches) return;
    targetX = nextX; targetY = nextY;
    if (!frame) frame = requestAnimationFrame(draw);
  }
  window.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch') aim((event.clientX / innerWidth - .5) * 10, (event.clientY / innerHeight - .5) * 8);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => aim(0, 0));
  window.addEventListener('blur', () => aim(0, 0));
  // Never request sensor permission. Platforms that require it retain the breathing idle.
  if ('DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission !== 'function') {
    window.addEventListener('deviceorientation', event => {
      if (event.gamma != null && event.beta != null) aim(Math.max(-5, Math.min(5, event.gamma / 5)), Math.max(-4, Math.min(4, (event.beta - 45) / 8)));
    }, { passive: true });
  }
  function intro() {
    cancelAnimationFrame(introFrame);
    body.classList.remove('is-snapping');
    if (reduced.matches || !inputs.snap.checked) return;
    introFrame = requestAnimationFrame(() => {
      introFrame = requestAnimationFrame(() => {
        if (inputs.snap.checked && !reduced.matches) body.classList.add('is-snapping');
      });
    });
  }
  document.querySelector('.assembly-flash').addEventListener('animationend', () => body.classList.remove('is-snapping'));
  function apply(play = false) {
    effects.forEach(name => body.classList.toggle(`has-${name}`, inputs[name].checked));
    replay.disabled = !inputs.snap.checked || reduced.matches;
    if (!inputs.parallax.checked || reduced.matches) resetParallax();
    if (!inputs.snap.checked || reduced.matches) body.classList.remove('is-snapping');
    document.querySelectorAll('[data-preset]').forEach(button => button.setAttribute('aria-pressed', String(effects.every(name => inputs[name].checked === presets[button.dataset.preset].includes(name)))));
    save(Object.fromEntries(effects.map(name => [name, inputs[name].checked ? '1' : '0'])));
    if (play) intro();
  }
  document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
    effects.forEach(name => { inputs[name].checked = presets[button.dataset.preset].includes(name); });
    apply(true);
  }));
  effects.forEach(name => inputs[name].addEventListener('change', () => apply(name === 'snap')));
  replay.addEventListener('click', intro);
  reduced.addEventListener('change', () => apply());
  effects.forEach(name => { inputs[name].checked = query.has(name) ? query.get(name) === '1' : (presets[query.get('preset')] || presets.A).includes(name); });
  apply(true);
})();
