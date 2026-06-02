const root = document.documentElement;
root.classList.add("motion-ready");

const storySection = document.querySelector(".scroll-story");
const storySteps = Array.from(document.querySelectorAll(".story-step"));
const storyTitle = document.getElementById("story-active-title");
const storyCopy = document.getElementById("story-active-copy");

let activeStoryIndex = -1;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setActiveStory(index) {
  if (!storySteps.length || index === activeStoryIndex) {
    return;
  }
  activeStoryIndex = index;
  storySteps.forEach((step, stepIndex) => {
    step.classList.toggle("active", stepIndex === activeStoryIndex);
  });
  const activeStep = storySteps[activeStoryIndex];
  if (storyTitle && storyCopy && activeStep) {
    storyTitle.textContent = activeStep.dataset.title || activeStep.textContent.trim();
    storyCopy.textContent = activeStep.dataset.copy || "";
  }
}

function updateStory() {
  if (!storySection) {
    return;
  }
  const rect = storySection.getBoundingClientRect();
  const distance = Math.max(rect.height - window.innerHeight, 1);
  const progress = clamp(-rect.top / distance, 0, 1);
  root.style.setProperty("--story-progress", progress.toFixed(4));
  const nextIndex = clamp(
    Math.floor(progress * storySteps.length),
    0,
    Math.max(storySteps.length - 1, 0)
  );
  setActiveStory(nextIndex);
}

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
      }
    }
  },
  { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
);

document.querySelectorAll(".reveal").forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index % 4, 3) * 80}ms`;
  observer.observe(element);
});

window.addEventListener("scroll", updateStory, { passive: true });
window.addEventListener("resize", updateStory);
updateStory();
setActiveStory(0);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- WebGL ember particle orb (the hero centerpiece) ---------- */
function makeEmberTexture(THREE) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0.0, "rgba(255, 226, 158, 1)");
  grd.addColorStop(0.28, "rgba(255, 150, 54, 0.92)");
  grd.addColorStop(0.6, "rgba(206, 74, 18, 0.38)");
  grd.addColorStop(1.0, "rgba(150, 40, 0, 0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.Texture(c);
  tex.needsUpdate = true;
  return tex;
}

function noise(x, y, z, t) {
  return (
    Math.sin(x * 1.7 + t) * 0.5 +
    Math.sin(y * 2.3 - t * 0.8) * 0.3 +
    Math.sin(z * 1.9 + t * 0.6) * 0.2 +
    Math.sin((x + y + z) * 1.3 + t * 0.45) * 0.22
  );
}

function initOrb(container) {
  if (!window.THREE || !container) return;
  const THREE = window.THREE;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  let w = container.clientWidth || 1;
  let h = container.clientHeight || 1;
  renderer.setSize(w, h);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.z = 3.25;

  const group = new THREE.Group();
  scene.add(group);

  const COUNT = 1200;
  const base = new Float32Array(COUNT * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < COUNT; i++) {
    const y = 1 - (i / (COUNT - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = golden * i;
    base[i * 3] = Math.cos(a) * r;
    base[i * 3 + 1] = y;
    base[i * 3 + 2] = Math.sin(a) * r;
  }

  // dark mesh points
  const posA = new Float32Array(base);
  const geoA = new THREE.BufferGeometry();
  geoA.setAttribute("position", new THREE.BufferAttribute(posA, 3));
  const matA = new THREE.PointsMaterial({
    color: 0x241f18,
    size: 0.02,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  });
  const meshPoints = new THREE.Points(geoA, matA);
  group.add(meshPoints);

  // neighbour edges (computed once on the base sphere)
  const edgeIdx = [];
  const THRESH = 0.16;
  for (let i = 0; i < COUNT; i++) {
    let made = 0;
    for (let j = i + 1; j < COUNT && made < 3; j++) {
      const dx = base[i * 3] - base[j * 3];
      const dy = base[i * 3 + 1] - base[j * 3 + 1];
      const dz = base[i * 3 + 2] - base[j * 3 + 2];
      if (dx * dx + dy * dy + dz * dz < THRESH) {
        edgeIdx.push(i, j);
        made++;
      }
    }
  }
  const linePos = new Float32Array(edgeIdx.length * 3);
  const geoL = new THREE.BufferGeometry();
  geoL.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
  const matL = new THREE.LineBasicMaterial({
    color: 0x3a322a,
    transparent: true,
    opacity: 0.28,
  });
  const lines = new THREE.LineSegments(geoL, matL);
  group.add(lines);

  // ember points (glowing subset)
  const emberIdx = [];
  for (let i = 0; i < COUNT; i++) if (i % 5 === 0) emberIdx.push(i);
  const posE = new Float32Array(emberIdx.length * 3);
  const geoE = new THREE.BufferGeometry();
  geoE.setAttribute("position", new THREE.BufferAttribute(posE, 3));
  const matE = new THREE.PointsMaterial({
    map: makeEmberTexture(THREE),
    color: 0xff8a32,
    size: 0.2,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.NormalBlending,
    sizeAttenuation: true,
  });
  const emberPoints = new THREE.Points(geoE, matE);
  group.add(emberPoints);

  let targetRX = 0;
  let targetRY = 0;
  container.addEventListener("pointermove", (e) => {
    const rect = container.getBoundingClientRect();
    targetRY = ((e.clientX - rect.left) / rect.width - 0.5) * 0.9;
    targetRX = ((e.clientY - rect.top) / rect.height - 0.5) * 0.6;
  });

  function resize() {
    w = container.clientWidth || 1;
    h = container.clientHeight || 1;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);

  function frame(ms) {
    const t = ms * 0.0006;
    for (let i = 0; i < COUNT; i++) {
      const bx = base[i * 3];
      const by = base[i * 3 + 1];
      const bz = base[i * 3 + 2];
      const n = noise(bx * 1.6, by * 1.6, bz * 1.6, t);
      const spike = Math.max(0, noise(bx * 3.1, by * 3.1, bz * 3.1, t * 1.4));
      const rad = 1 + n * 0.16 + spike * 0.1;
      posA[i * 3] = bx * rad;
      posA[i * 3 + 1] = by * rad;
      posA[i * 3 + 2] = bz * rad;
    }
    geoA.attributes.position.needsUpdate = true;

    for (let e = 0; e < edgeIdx.length; e++) {
      const p = edgeIdx[e];
      linePos[e * 3] = posA[p * 3];
      linePos[e * 3 + 1] = posA[p * 3 + 1];
      linePos[e * 3 + 2] = posA[p * 3 + 2];
    }
    geoL.attributes.position.needsUpdate = true;

    for (let k = 0; k < emberIdx.length; k++) {
      const p = emberIdx[k];
      posE[k * 3] = posA[p * 3];
      posE[k * 3 + 1] = posA[p * 3 + 1];
      posE[k * 3 + 2] = posA[p * 3 + 2];
    }
    geoE.attributes.position.needsUpdate = true;
    matE.size = 0.18 + Math.sin(t * 2.2) * 0.03;

    group.rotation.y += (targetRY - group.rotation.y) * 0.05 + 0.0016;
    group.rotation.x += (targetRX - group.rotation.x) * 0.05;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (!reduceMotion) {
  const orbEl = document.querySelector(".hero-orb");
  if (orbEl) {
    try {
      initOrb(orbEl);
    } catch (error) {
      /* WebGL unavailable — hero still shows the portrait */
    }
  }
}

/* Subtle 3D tilt on the hero portrait */
const heroVisual = document.querySelector(".hero-visual");
const portrait = document.querySelector(".hero-portrait");
if (!reduceMotion && heroVisual && portrait) {
  heroVisual.addEventListener("pointermove", (event) => {
    const rect = heroVisual.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    portrait.style.transform = `translate(-50%, -50%) perspective(900px) rotateY(${px * 7}deg) rotateX(${py * -7}deg)`;
  });
  heroVisual.addEventListener("pointerleave", () => {
    portrait.style.transform = "translate(-50%, -50%) perspective(900px) rotateY(0deg) rotateX(0deg)";
  });
}
