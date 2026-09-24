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

  const motionOK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setupPillNav = () => {
    const nav = document.querySelector(".pill-nav");
    const items = [...document.querySelectorAll(".pill-nav .pill")];
    const menuButton = document.querySelector(".mobile-menu-button");
    const menu = document.querySelector(".mobile-menu-popover");
    if (!nav || !items.length) return;

    const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
    items.forEach(item => {
      const href = item.getAttribute("href") || "";
      const normalized = href.replace(/#.*$/, "").replace(/\/$/, "") || "/";
      if (href.startsWith("/") && normalized === currentPath) {
        item.classList.add("is-active");
      }
    });

    const layoutPills = () => {
      items.forEach(item => {
        const circle = item.querySelector(".hover-circle");
        if (!circle) return;

        const rect = item.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        const radius = ((w * w) / 4 + h * h) / (2 * h);
        const diameter = Math.ceil(radius * 2) + 2;
        const delta = Math.ceil(radius - Math.sqrt(Math.max(0, radius * radius - (w * w) / 4))) + 1;

        circle.style.width = diameter + "px";
        circle.style.height = diameter + "px";
        circle.style.bottom = "-" + delta + "px";
      });
    };

    items.forEach(item => {
      item.addEventListener("mouseenter", () => item.classList.add("is-hovered"));
      item.addEventListener("mouseleave", () => item.classList.remove("is-hovered"));
    });

    const setMenu = open => {
      menuButton?.setAttribute("aria-expanded", String(open));
      menu?.classList.toggle("is-open", open);
      menuButton?.classList.toggle("is-open", open);
    };

    menuButton?.addEventListener("click", () => {
      setMenu(menuButton.getAttribute("aria-expanded") !== "true");
    });

    document.addEventListener("click", event => {
      if (!menu || !menuButton) return;
      if (!menu.contains(event.target) && !menuButton.contains(event.target)) {
        setMenu(false);
      }
    });

    menu?.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => setMenu(false));
    });

    layoutPills();
    window.addEventListener("resize", layoutPills, { passive: true });
    document.fonts?.ready?.then(layoutPills).catch(() => {});
  };

  setupPillNav();

  const desktopPointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // React Bits-inspired Target Cursor.
  // Tracks the pointer globally, then frames CTA/button targets with four corners.
  if (motionOK && desktopPointer) {
    document.documentElement.classList.add("target-cursor-enabled");
    const cursor = document.createElement("div");
    cursor.className = "target-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML = `
      <span class="target-cursor-dot"></span>
      <span class="target-cursor-corner tl"></span>
      <span class="target-cursor-corner tr"></span>
      <span class="target-cursor-corner br"></span>
      <span class="target-cursor-corner bl"></span>
    `;
    document.body.appendChild(cursor);

    const dot = cursor.querySelector(".target-cursor-dot");
    const corners = [...cursor.querySelectorAll(".target-cursor-corner")];
    const targetSelector = ".btn, .button, .nav-cta, button";
    const cornerSize = 11;
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let visualX = mouseX;
    let visualY = mouseY;
    let activeTarget = null;
    let frame = 0;

    const pointerMove = event => {
      mouseX = event.clientX;
      mouseY = event.clientY;

      const target = event.target instanceof Element
        ? event.target.closest(targetSelector)
        : null;

      if (target !== activeTarget) {
        activeTarget = target;
        cursor.classList.toggle("is-targeting", Boolean(activeTarget));
      }

      const updateTarget = () => {
        visualX += (mouseX - visualX) * 0.18;
        visualY += (mouseY - visualY) * 0.18;

        cursor.style.transform = `translate3d(${visualX}px,${visualY}px,0) translate(-50%,-50%)`;

        if (activeTarget) {
          const rect = activeTarget.getBoundingClientRect();
          const cursorRect = cursor.getBoundingClientRect();

          const left = rect.left - visualX;
          const top = rect.top - visualY;
          const right = rect.right - visualX - cornerSize;
          const bottom = rect.bottom - visualY - cornerSize;

          const positions = [
            [left, top],
            [right, top],
            [right, bottom],
            [left, bottom]
          ];

          corners.forEach((corner, index) => {
            corner.style.transform = `translate3d(${positions[index][0]}px,${positions[index][1]}px,0)`;
          });
        } else {
          const positions = [
            [-cornerSize * 1.5, -cornerSize * 1.5],
            [cornerSize * 0.5, -cornerSize * 1.5],
            [cornerSize * 0.5, cornerSize * 0.5],
            [-cornerSize * 1.5, cornerSize * 0.5]
          ];

          corners.forEach((corner, index) => {
            corner.style.transform = `translate3d(${positions[index][0]}px,${positions[index][1]}px,0)`;
          });
        }

        frame = requestAnimationFrame(updateTarget);
      };

      if (!frame) frame = requestAnimationFrame(updateTarget);
    };

    const pointerDown = event => {
      if (!activeTarget) return;
      cursor.classList.add("is-pressed");
      if (dot) dot.style.transform = "translate(-50%,-50%) scale(.72)";
    };

    const pointerUp = () => {
      cursor.classList.remove("is-pressed");
      if (dot) dot.style.transform = "translate(-50%,-50%) scale(1)";
    };

    const leaveWindow = () => {
      cursor.classList.remove("is-visible");
      activeTarget = null;
      cursor.classList.remove("is-targeting");
    };

    const enterWindow = () => {
      cursor.classList.add("is-visible");
    };

    window.addEventListener("pointermove", event => {
      if (event.pointerType !== "mouse" && event.pointerType !== "") return;
      cursor.classList.add("is-visible");
      pointerMove(event);
    }, { passive: true });

    window.addEventListener("pointerdown", pointerDown, { passive: true });
    window.addEventListener("pointerup", pointerUp, { passive: true });
    window.addEventListener("mouseout", event => {
      if (!event.relatedTarget) leaveWindow();
    }, { passive: true });
    window.addEventListener("mouseover", enterWindow, { passive: true });

    // Recompute target geometry while scrolling/resizing.
    window.addEventListener("scroll", () => {
      if (activeTarget) {
        const event = new MouseEvent("mousemove", {
          clientX: mouseX,
          clientY: mouseY
        });
        pointerMove(event);
      }
    }, { passive: true });

    requestAnimationFrame(() => {
      cursor.classList.add("is-visible");
    });
  }

  // React Bits-inspired Click Spark, adapted for the static UzaPay site.
  // Uses a single fixed canvas so clicks can animate anywhere on the page.
  if (motionOK) {
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
