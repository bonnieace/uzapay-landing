import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js";

const hero = document.querySelector(".hero");
const canvas = document.getElementById("antigravityCanvas");

if (!hero || !canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  // Keep the hero static for reduced-motion users or unsupported markup.
} else {
  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch (error) {
    console.warn("UzaPay Antigravity: WebGL unavailable.", error);
  }

  if (renderer) {
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
    camera.position.z = 50;

    const scene = new THREE.Scene();
    const particleGroup = new THREE.Group();
    scene.add(particleGroup);

    const geometry = new THREE.CapsuleGeometry(0.1, 0.42, 4, 8);
    const material = new THREE.MeshBasicMaterial({
      color: "#c8ff5f",
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });

    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const particleCount = isMobile ? 105 : 210;
    const magnetRadius = isMobile ? 4.2 : 5.2;
    const ringRadius = isMobile ? 3.0 : 3.7;
    const lerpSpeed = 0.065;
    const waveSpeed = 0.7;
    const waveAmplitude = 0.8;
    const pulseSpeed = 2.4;
    const particleSize = isMobile ? 1.2 : 1.55;
    const fieldStrength = 10;

    let viewportWidth = 30;
    let viewportHeight = 20;

    const target = { x: 0, y: 0 };
    const idleTarget = { x: 0, y: 0 };
    let pointerInsideHero = false;
    let pointerSeen = false;

    const dummy = new THREE.Object3D();
    const particles = [];

    const randomRange = (min, max) => min + Math.random() * (max - min);

    function viewportSize() {
      const distance = camera.position.z;
      const vertical = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      return {
        width: vertical * camera.aspect,
        height: vertical,
      };
    }

    function setIdleTarget() {
      idleTarget.x = viewportWidth * 0.28;
      idleTarget.y = -viewportHeight * 0.27;
      if (!pointerSeen) {
        target.x = idleTarget.x;
        target.y = idleTarget.y;
      }
    }

    function reseedParticles() {
      particleGroup.clear();
      particles.length = 0;

      for (let i = 0; i < particleCount; i += 1) {
        // Bias the resting field toward the open lower-right area.
        const x = randomRange(-viewportWidth * 0.04, viewportWidth * 0.50);
        const y = randomRange(-viewportHeight * 0.50, viewportHeight * 0.08);
        const z = randomRange(-9, 9);

        particles.push({
          t: Math.random() * 100,
          speed: randomRange(0.006, 0.018),
          homeX: x,
          homeY: y,
          homeZ: z,
          x,
          y,
          z,
          radiusOffset: randomRange(-1, 1),
        });
      }

      const mesh = new THREE.InstancedMesh(geometry, material, particleCount);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.renderOrder = 2;
      mesh.frustumCulled = false;
      particleGroup.add(mesh);
      particleGroup.userData.mesh = mesh;
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height, false);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      const size = viewportSize();
      viewportWidth = size.width;
      viewportHeight = size.height;
      setIdleTarget();
    }

    function setPointerFromHero(event) {
      if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") return;

      pointerInsideHero = true;
      pointerSeen = true;

      const rect = canvas.getBoundingClientRect();
      const nx = THREE.MathUtils.clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const ny = THREE.MathUtils.clamp((event.clientY - rect.top) / rect.height, 0, 1);

      target.x = (nx - 0.5) * viewportWidth;
      target.y = (0.5 - ny) * viewportHeight;
    }

    hero.addEventListener("pointerenter", event => {
      if (!event.pointerType || event.pointerType === "mouse" || event.pointerType === "pen") {
        pointerInsideHero = true;
      }
    });

    hero.addEventListener("pointermove", setPointerFromHero, { passive: true });

    hero.addEventListener("pointerleave", event => {
      if (!event.pointerType || event.pointerType === "mouse" || event.pointerType === "pen") {
        pointerInsideHero = false;
      }
    });

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    function animate(now) {
      requestAnimationFrame(animate);

      const mesh = particleGroup.userData.mesh;
      if (!mesh) return;

      const destination = pointerInsideHero ? target : idleTarget;
      const idleEase = pointerInsideHero ? 0.11 : 0.045;

      target.x += (destination.x - target.x) * idleEase;
      target.y += (destination.y - target.y) * idleEase;

      const elapsed = now * 0.001;

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        particle.t += particle.speed;

        const dx = particle.x - target.x;
        const dy = particle.y - target.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let nextX = particle.homeX;
        let nextY = particle.homeY;
        let nextZ = particle.homeZ;

        if (distance < magnetRadius) {
          const angle = Math.atan2(dy, dx);

          const wave =
            Math.sin(particle.t * waveSpeed + angle) *
            (waveAmplitude * 0.5);

          const deviation = particle.radiusOffset * (5 / (fieldStrength + 0.1));
          const ring = ringRadius + wave + deviation;

          nextX = target.x + Math.cos(angle) * ring;
          nextY = target.y + Math.sin(angle) * ring;
          nextZ = particle.homeZ + Math.sin(particle.t * 1.2) * 0.55;
        }

        particle.x += (nextX - particle.x) * lerpSpeed;
        particle.y += (nextY - particle.y) * lerpSpeed;
        particle.z += (nextZ - particle.z) * lerpSpeed;

        const distanceToTarget = Math.hypot(
          particle.x - target.x,
          particle.y - target.y
        );

        const ringFalloff = THREE.MathUtils.clamp(
          1 - Math.abs(distanceToTarget - ringRadius) / 10,
          0,
          1
        );

        const pulse =
          0.8 + Math.sin(particle.t * pulseSpeed + elapsed * 0.2) * 0.2;

        const scale = Math.max(0.06, ringFalloff * pulse * particleSize);

        dummy.position.set(particle.x, particle.y, particle.z);
        dummy.lookAt(target.x, target.y, particle.z);
        dummy.rotateX(Math.PI / 2);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();

        mesh.setMatrixAt(i, dummy.matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
      renderer.render(scene, camera);
    }

    resize();
    animate(0);

    window.addEventListener("beforeunload", () => {
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    }, { once: true });
  }
}
