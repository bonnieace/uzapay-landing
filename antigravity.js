(() => {
  const hero = document.querySelector(".hero");
  const canvas = document.getElementById("antigravityCanvas");
  if (!hero || !canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const pointer = { x: 0, y: 0, active: false, seen: false };
  const target = { x: 0, y: 0 };
  const idle = { x: 0, y: 0 };

  const mobile = window.matchMedia("(max-width: 640px)").matches;
  const count = mobile ? 90 : 190;
  const magnetRadius = mobile ? 110 : 145;
  const ringRadius = mobile ? 42 : 58;
  const lerp = 0.085;
  const particles = [];
  let width = 1;
  let height = 1;
  let dpr = 1;

  const random = (min, max) => min + Math.random() * (max - min);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Rest in the open lower-right portion of the hero.
    idle.x = width * 0.70;
    idle.y = height * 0.72;

    if (!pointer.seen) {
      target.x = idle.x;
      target.y = idle.y;
    }
  }

  function seed() {
    particles.length = 0;

    // Dense around the resting field, sparse toward the center where the copy/product live.
    for (let i = 0; i < count; i += 1) {
      const x = random(width * 0.38, width * 0.98);
      const y = random(height * 0.46, height * 0.94);
      particles.push({
        homeX: x,
        homeY: y,
        x,
        y,
        size: random(0.8, 2.0),
        alpha: random(0.18, 0.72),
        speed: random(0.004, 0.014),
        phase: random(0, Math.PI * 2),
        radiusOffset: random(-10, 10)
      });
    }
  }

  function pointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    pointer.active = true;
    pointer.seen = true;
    pointer.x = Math.max(0, Math.min(width, x));
    pointer.y = Math.max(0, Math.min(height, y));
  }

  hero.addEventListener("pointermove", pointerMove, { passive: true });
  hero.addEventListener("pointerenter", () => { pointer.active = true; });
  hero.addEventListener("pointerleave", () => { pointer.active = false; });

  const observer = new ResizeObserver(() => {
    resize();
    seed();
  });
  observer.observe(canvas);

  resize();
  seed();

  function frame(time) {
    const seconds = time * 0.001;
    ctx.clearRect(0, 0, width, height);

    const destination = pointer.active ? pointer : idle;
    target.x += (destination.x - target.x) * (pointer.active ? 0.11 : 0.035);
    target.y += (destination.y - target.y) * (pointer.active ? 0.11 : 0.035);

    for (const particle of particles) {
      const dx = particle.x - target.x;
      const dy = particle.y - target.y;
      const distance = Math.hypot(dx, dy);

      let nextX = particle.homeX + Math.cos(seconds * particle.speed * 70 + particle.phase) * 4;
      let nextY = particle.homeY + Math.sin(seconds * particle.speed * 55 + particle.phase) * 4;
      let scale = particle.size;

      if (pointer.active && distance < magnetRadius) {
        const angle = Math.atan2(dy, dx) + Math.sin(seconds * 0.55) * 0.22;
        const wave = Math.sin(seconds * 3.2 + particle.phase) * 8;
        const ring = ringRadius + particle.radiusOffset * 0.22 + wave;
        nextX = target.x + Math.cos(angle) * ring;
        nextY = target.y + Math.sin(angle) * ring;
        scale *= 1.2;
      }

      particle.x += (nextX - particle.x) * lerp;
      particle.y += (nextY - particle.y) * lerp;

      const ringDistance = Math.abs(Math.hypot(particle.x - target.x, particle.y - target.y) - ringRadius);
      const proximity = pointer.active
        ? Math.max(0, 1 - ringDistance / 80)
        : 0.35;

      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(Math.atan2(particle.y - target.y, particle.x - target.x) + Math.PI / 2);

      const glow = pointer.active ? 8 + proximity * 10 : 5;
      ctx.shadowBlur = glow;
      ctx.shadowColor = "rgba(200,255,95,0.65)";
      ctx.fillStyle = `rgba(200,255,95,${Math.min(0.9, particle.alpha + proximity * 0.32)})`;

      const h = Math.max(4, scale * 5);
      const w = Math.max(1.2, scale * 1.55);
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, w);
      ctx.fill();
      ctx.restore();
    }

    if (pointer.active) {
      const gradient = ctx.createRadialGradient(
        target.x, target.y, ringRadius * 0.4,
        target.x, target.y, magnetRadius
      );
      gradient.addColorStop(0, "rgba(200,255,95,0.035)");
      gradient.addColorStop(0.65, "rgba(200,255,95,0.018)");
      gradient.addColorStop(1, "rgba(200,255,95,0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(target.x, target.y, magnetRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
