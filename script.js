const root = document.documentElement;
root.classList.add("motion-ready");
const canvas = document.getElementById("signal-canvas");
const ctx = canvas.getContext("2d");

let width = 0;
let height = 0;
let dpr = 1;
let nodes = [];
let scrollRatio = 0;

function resizeCanvas() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const count = Math.max(64, Math.min(118, Math.floor((width * height) / 15000)));
  nodes = Array.from({ length: count }, (_, index) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    z: Math.random() * 1.6 + 0.35,
    phase: Math.random() * Math.PI * 2,
    speed: 0.24 + Math.random() * 0.44,
    index,
  }));
}

function updateScroll() {
  const max = Math.max(document.body.scrollHeight - window.innerHeight, 1);
  scrollRatio = window.scrollY / max;
  root.style.setProperty("--scroll", scrollRatio.toFixed(4));
}

function draw(time) {
  const t = time * 0.001;
  ctx.clearRect(0, 0, width, height);

  const scanY = (scrollRatio * 1.35 * height + Math.sin(t * 0.35) * 80) % (height + 220);
  const palette = [
    [61, 217, 214],
    [242, 169, 59],
    [116, 214, 128],
    [255, 107, 107],
  ];

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (let i = 0; i < nodes.length; i += 1) {
    const a = nodes[i];
    const ax = a.x + Math.cos(t * a.speed + a.phase) * 22 * a.z;
    const ay = a.y + Math.sin(t * (a.speed * 0.8) + a.phase) * 18 * a.z + scrollRatio * 80 * (a.z - 1);

    for (let j = i + 1; j < nodes.length; j += 1) {
      const b = nodes[j];
      const bx = b.x + Math.cos(t * b.speed + b.phase) * 22 * b.z;
      const by = b.y + Math.sin(t * (b.speed * 0.8) + b.phase) * 18 * b.z + scrollRatio * 80 * (b.z - 1);
      const dx = ax - bx;
      const dy = ay - by;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 145) {
        const nearScan = Math.max(0, 1 - Math.abs((ay + by) / 2 - scanY) / 190);
        const alpha = (1 - dist / 145) * (0.14 + nearScan * 0.36);
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
    ctx.fillStyle = `rgba(${nodeColor[0]}, ${nodeColor[1]}, ${nodeColor[2]}, ${0.26 + pulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(ax, ay, 1.1 + a.z * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  const beam = ctx.createLinearGradient(0, scanY - 120, 0, scanY + 120);
  beam.addColorStop(0, "rgba(61, 217, 214, 0)");
  beam.addColorStop(0.5, "rgba(61, 217, 214, 0.13)");
  beam.addColorStop(1, "rgba(242, 169, 59, 0)");
  ctx.fillStyle = beam;
  ctx.fillRect(0, scanY - 120, width, 240);

  ctx.restore();
  requestAnimationFrame(draw);
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

window.addEventListener("resize", resizeCanvas);
window.addEventListener("scroll", updateScroll, { passive: true });

resizeCanvas();
updateScroll();
requestAnimationFrame(draw);
