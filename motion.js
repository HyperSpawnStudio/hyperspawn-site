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

  const floor = document.querySelector('.grid-floor');
  const grid = floor.querySelector('svg');
  const svgNS = 'http://www.w3.org/2000/svg';
  const gridEpoch = document.timeline.currentTime;
  let gridSize, gridAnimations = [];

  function renderGrid(size) {
    gridSize = size;
    gridAnimations.forEach(animation => animation.cancel());
    gridAnimations = [];
    const { width, height } = size;
    if (!width || !height) return;

    // World cells are 1 × 1. Project a level camera above the floor:
    // screenX = center + worldX * focal / depth; screenY = cameraHeight * focal / depth.
    // Size the nearest cells for this viewport, without stretching the SVG afterward.
    const cellWidth = Math.max(42, Math.min(90, width / 20));
    const cameraHeight = height / cellWidth;
    const focal = height;
    const projection = cameraHeight * focal;
    const railCount = Math.ceil(width / (2 * cellWidth * .2));
    grid.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const rails = document.createElementNS(svgNS, 'path');
    rails.setAttribute('class', 'grid-rails');
    rails.setAttribute('d', Array.from({ length: railCount * 2 + 1 }, (_, i) =>
      `M${width / 2} 0L${width / 2 + (i - railCount) * cellWidth} ${height}`
    ).join(' '));
    const paths = [rails];

    // Include one extra row below the crop and one inside the transparent horizon.
    // After eight seconds depth n becomes n - 1, exactly its neighbour's old position.
    const nearest = Math.max(2, Math.floor(cameraHeight));
    const farthest = Math.ceil(cameraHeight / .08) + 1;
    for (let depth = nearest; depth <= farthest; depth++) {
      const row = document.createElementNS(svgNS, 'path');
      row.setAttribute('class', 'grid-row');
      row.setAttribute('d', `M0 0H${width}`);
      row.style.transform = `translateY(${projection / depth}px)`;
      paths.push(row);
      if (!reduced.matches) {
        const keyframes = Array.from({ length: 65 }, (_, step) => ({
          transform: `translateY(${projection / (depth - step / 64)}px)`,
          offset: step / 64,
        }));
        const animation = row.animate(keyframes, { duration: 8000, iterations: Infinity });
        animation.startTime = gridEpoch;
        gridAnimations.push(animation);
      }
    }
    grid.replaceChildren(...paths);
  }

  new ResizeObserver(([entry]) => renderGrid(entry.contentRect)).observe(floor);
  reduced.addEventListener('change', () => { if (gridSize) renderGrid(gridSize); });

})();
