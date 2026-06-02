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

// WebGL ambient network over the hero (degrades gracefully if the library fails to load)
if (!reduceMotion && window.VANTA && typeof window.VANTA.NET === "function") {
  try {
    window.VANTA.NET({
      el: ".hero-fx",
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200.0,
      minWidth: 200.0,
      scale: 1.0,
      scaleMobile: 1.0,
      color: 0x3ee8df,
      backgroundAlpha: 0.0,
      points: 12.0,
      maxDistance: 23.0,
      spacing: 16.0,
      showDots: true,
    });
  } catch (error) {
    /* ignore WebGL init failures — the photo backdrop remains */
  }
}

// Subtle 3D tilt on the hero portrait
const heroVisual = document.querySelector(".hero-visual");
const portrait = document.querySelector(".portrait-frame");
if (!reduceMotion && heroVisual && portrait) {
  heroVisual.addEventListener("pointermove", (event) => {
    const rect = portrait.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    portrait.style.transform = `perspective(900px) rotateY(${px * 9}deg) rotateX(${py * -9}deg)`;
  });
  heroVisual.addEventListener("pointerleave", () => {
    portrait.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg)";
  });
}
