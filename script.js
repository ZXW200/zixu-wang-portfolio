const root = document.documentElement;
root.classList.add("motion-ready");

const canvas = document.getElementById("signal-canvas");
const ctx = canvas.getContext("2d");
const storySection = document.querySelector(".scroll-story");
const storySteps = Array.from(document.querySelectorAll(".story-step"));
const storyTitle = document.getElementById("story-active-title");
const storyCopy = document.getElementById("story-active-copy");

let width = 0;
let height = 0;
let dpr = 1;
let nodes = [];
let scrollRatio = 0;
let storyProgress = 0;
let activeStoryIndex = 0;
let targetMouseX = 0;
let targetMouseY = 0;
let mouseX = 0;
let mouseY = 0;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resizeCanvas() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const count = Math.max(74, Math.min(132, Math.floor((width * height) / 13500)));
  nodes = Array.from({ length: count }, (_, index) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    z: Math.random() * 1.8 + 0.3,
    phase: Math.random() * Math.PI * 2,
    speed: 0.18 + Math.random() * 0.46,
    index,
  }));
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

function updateScroll() {
  const max = Math.max(document.body.scrollHeight - window.innerHeight, 1);
  scrollRatio = window.scrollY / max;
  root.style.setProperty("--scroll", scrollRatio.toFixed(4));

  if (storySection) {
    const rect = storySection.getBoundingClientRect();
    const distance = Math.max(rect.height - window.innerHeight, 1);
    storyProgress = clamp(-rect.top / distance, 0, 1);
    root.style.setProperty("--story-progress", storyProgress.toFixed(4));

    const nextIndex = clamp(Math.floor(storyProgress * storySteps.length), 0, Math.max(storySteps.length - 1, 0));
    setActiveStory(nextIndex);
  }
}

function updatePointer(event) {
  const x = event.clientX / Math.max(window.innerWidth, 1);
  const y = event.clientY / Math.max(window.innerHeight, 1);
  targetMouseX = (x - 0.5) * 2;
  targetMouseY = (y - 0.5) * 2;
}

function drawBackground(time) {
  const t = time * 0.001;
  ctx.clearRect(0, 0, width, height);

  mouseX += (targetMouseX - mouseX) * 0.045;
  mouseY += (targetMouseY - mouseY) * 0.045;
  root.style.setProperty("--mx", mouseX.toFixed(4));
  root.style.setProperty("--my", mouseY.toFixed(4));

  const scanY = (scrollRatio * 1.35 * height + Math.sin(t * 0.35) * 80) % (height + 220);
  const focusX = width * (0.66 + mouseX * 0.035);
  const focusY = height * (0.48 + mouseY * 0.035 - scrollRatio * 0.06);
  const palette = [
    [62, 232, 223],
    [242, 178, 75],
    [121, 230, 141],
    [255, 109, 114],
  ];

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (let i = 0; i < nodes.length; i += 1) {
    const a = nodes[i];
    const ax = a.x + Math.cos(t * a.speed + a.phase) * 28 * a.z + mouseX * 18 * a.z;
    const ay = a.y + Math.sin(t * (a.speed * 0.8) + a.phase) * 22 * a.z + scrollRatio * 96 * (a.z - 1) + mouseY * 12 * a.z;

    for (let j = i + 1; j < nodes.length; j += 1) {
      const b = nodes[j];
      const bx = b.x + Math.cos(t * b.speed + b.phase) * 28 * b.z + mouseX * 18 * b.z;
      const by = b.y + Math.sin(t * (b.speed * 0.8) + b.phase) * 22 * b.z + scrollRatio * 96 * (b.z - 1) + mouseY * 12 * b.z;
      const dx = ax - bx;
      const dy = ay - by;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 150) {
        const nearScan = Math.max(0, 1 - Math.abs((ay + by) / 2 - scanY) / 190);
        const nearFocus = Math.max(0, 1 - Math.hypot((ax + bx) / 2 - focusX, (ay + by) / 2 - focusY) / 380);
        const alpha = (1 - dist / 150) * (0.13 + nearScan * 0.36 + nearFocus * 0.2);
        const color = palette[(a.index + b.index) % palette.length];
        ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
    }

    const nodeColor = palette[a.index % palette.length];
    const pulse = 0.5 + Math.sin(t * 1.8 + a.phase) * 0.5;
    ctx.fillStyle = `rgba(${nodeColor[0]}, ${nodeColor[1]}, ${nodeColor[2]}, ${0.22 + pulse * 0.32})`;
    ctx.beginPath();
    ctx.arc(ax, ay, 1 + a.z * 0.95, 0, Math.PI * 2);
    ctx.fill();
  }

  const beam = ctx.createLinearGradient(0, scanY - 125, 0, scanY + 125);
  beam.addColorStop(0, "rgba(62, 232, 223, 0)");
  beam.addColorStop(0.5, "rgba(62, 232, 223, 0.13)");
  beam.addColorStop(1, "rgba(242, 178, 75, 0)");
  ctx.fillStyle = beam;
  ctx.fillRect(0, scanY - 125, width, 250);

  const focus = ctx.createRadialGradient(focusX, focusY, 0, focusX, focusY, Math.min(width, height) * 0.42);
  focus.addColorStop(0, "rgba(62, 232, 223, 0.10)");
  focus.addColorStop(0.46, "rgba(62, 232, 223, 0.035)");
  focus.addColorStop(1, "rgba(62, 232, 223, 0)");
  ctx.fillStyle = focus;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
  requestAnimationFrame(drawBackground);
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

window.addEventListener("resize", () => {
  resizeCanvas();
  updateScroll();
});
window.addEventListener("scroll", updateScroll, { passive: true });
window.addEventListener("pointermove", updatePointer, { passive: true });

resizeCanvas();
updateScroll();
setActiveStory(0);
requestAnimationFrame(drawBackground);
