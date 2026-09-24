document.addEventListener("DOMContentLoaded", () => {
  const io = new IntersectionObserver(
    entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("on");
        io.unobserve(entry.target);
      }
    }),
    { threshold: 0.12 }
  );

  document.querySelectorAll(".reveal").forEach(node => io.observe(node));

  // React Bits-inspired Click Spark, adapted for the static UzaPay site.
  // Uses a single fixed canvas so clicks can animate anywhere on the page.
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const canvas = document.createElement("canvas");
    canvas.className = "click-spark-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d", { alpha: true });
    const sparks = [];
    const settings = {
      sparkColor: "#c8ff5f",
      sparkSize: 10,
      sparkRadius: 18,
      sparkCount: 8,
      duration: 420,
      maxSparks: 96
    };

    let dpr = 1;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationId = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const easeOut = t => t * (2 - t);

    const draw = timestamp => {
      ctx.clearRect(0, 0, width, height);

      let active = false;

      for (let i = sparks.length - 1; i >= 0; i--) {
        const spark = sparks[i];
        const elapsed = timestamp - spark.startTime;

        if (elapsed >= settings.duration) {
          sparks.splice(i, 1);
          continue;
        }

        active = true;

        const progress = elapsed / settings.duration;
        const eased = easeOut(progress);
        const distance = eased * settings.sparkRadius;
        const lineLength = settings.sparkSize * (1 - eased);
        const fade = 1 - progress;

        const x1 = spark.x + distance * Math.cos(spark.angle);
        const y1 = spark.y + distance * Math.sin(spark.angle);
        const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
        const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

        ctx.save();
        ctx.globalAlpha = fade;
        ctx.strokeStyle = settings.sparkColor;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(200,255,95,.55)";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
      }

      if (active) {
        animationId = requestAnimationFrame(draw);
      } else {
        animationId = 0;
      }
    };

    const burst = event => {
      if (event.pointerType !== "mouse") return;

      for (let i = 0; i < settings.sparkCount; i++) {
        sparks.push({
          x: event.clientX,
          y: event.clientY,
          angle: (Math.PI * 2 * i) / settings.sparkCount,
          startTime: performance.now()
        });
      }

      if (sparks.length > settings.maxSparks) {
        sparks.splice(0, sparks.length - settings.maxSparks);
      }

      if (!animationId) {
        animationId = requestAnimationFrame(draw);
      }
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("pointerdown", burst, { passive: true });
  }

  const form = document.getElementById("waitlistForm");
  if (!form) return;

  const success = document.getElementById("success");
  const submit = document.getElementById("submitBtn");
  const email = document.getElementById("email");
  const phone = document.getElementById("phone");
  const honeypot = document.getElementById("website");

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (honeypot?.value) return;

    const value = email.value.trim().toLowerCase();
    if (!value) return;

    const rawPhone = (phone?.value || "").trim();
    submit.disabled = true;
    submit.textContent = "Joining…";

    try {
      const response = await fetch("/.netlify/functions/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, phone: rawPhone })
      });

      let data = {};
      try {
        data = await response.json();
      } catch {}

      if (!response.ok) {
        throw new Error(data.message || "Unable to join the waitlist");
      }

      form.style.display = "none";
      success?.classList.add("show");
    } catch (error) {
      submit.disabled = false;
      submit.textContent = "Join the waitlist →";
      alert(error.message || "Something went wrong. Please try again.");
    }
  });
});
