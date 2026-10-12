(() => {
  if (window.__mangaFlowInstalled) return;
  window.__mangaFlowInstalled = true;

  const defaults = { speed: 35, mode: "continuous", pauseHover: true, floating: true };
  let settings = { ...defaults };
  let running = false;
  let raf = null;
  let lastTime = 0;
  let hoverPaused = false;
  let overlay = null;
  let button = null;
  let speedLabel = null;

  chrome.storage.sync.get(defaults).then(async saved => {
    settings = { ...defaults, ...saved };
    buildOverlay();
    const { mangaflowEnabledOrigins = [] } = await chrome.storage.local.get({ mangaflowEnabledOrigins: [] });
    if (mangaflowEnabledOrigins.includes(location.origin)) start();
  });

  function scrollTarget() {
    // Most sites scroll the document. For custom readers, prefer the element that
    // actually owns the page's scroll range when the document itself cannot scroll.
    const doc = document.scrollingElement || document.documentElement;
    if (doc && doc.scrollHeight > doc.clientHeight + 4) return doc;
    const candidates = [...document.querySelectorAll("main, article, [class*=reader i], [class*=scroll i], [id*=reader i]")];
    return candidates.find(el => el.scrollHeight > el.clientHeight + 30 && getComputedStyle(el).overflowY !== "hidden") || doc;
  }

  function doScroll(timestamp) {
    if (!running) return;
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min(timestamp - lastTime, 80);
    lastTime = timestamp;
    if (!hoverPaused) {
      if (settings.mode === "page") {
        // Small repeated steps preserve a gradual movement while making page mode quicker.
        window.scrollBy({ top: settings.speed * 0.035, behavior: "instant" });
      } else {
        const target = scrollTarget();
        if (target === document.scrollingElement || target === document.documentElement || target === document.body) {
          window.scrollBy({ top: settings.speed * dt / 1000, behavior: "instant" });
        } else {
          target.scrollTop += settings.speed * dt / 1000;
        }
      }
    }
    raf = requestAnimationFrame(doScroll);
  }

  async function setOriginEnabled(enabled) {
    const key = "mangaflowEnabledOrigins";
    const data = await chrome.storage.local.get({ [key]: [] });
    const origins = new Set(data[key]);
    if (enabled) origins.add(location.origin);
    else origins.delete(location.origin);
    await chrome.storage.local.set({ [key]: [...origins] });
  }

  async function start() {
    if (running) return;
    running = true; lastTime = 0;
    await setOriginEnabled(true);
    updateOverlay();
    raf = requestAnimationFrame(doScroll);
  }
  async function stop() {
    running = false; lastTime = 0;
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
    await setOriginEnabled(false);
    updateOverlay();
  }
  function toggle() { running ? stop() : start(); }

  function buildOverlay() {
    if (overlay) overlay.remove();
    if (!settings.floating) return;
    overlay = document.createElement("div");
    overlay.id = "mangaflow-overlay";
    overlay.innerHTML = `
      <div class="mf-brand"><span class="mf-mark">≋</span><span>MangaFlow</span></div>
      <button class="mf-toggle" title="Start or pause scrolling" aria-label="Start or pause scrolling">▶</button>
      <button class="mf-stop" title="Stop scrolling" aria-label="Stop scrolling">■</button>
      <span class="mf-speed"></span>
      <button class="mf-hide" title="Hide controls" aria-label="Hide controls">×</button>`;
    const style = document.createElement("style");
    style.textContent = `
      #mangaflow-overlay{position:fixed;z-index:2147483647;right:14px;bottom:16px;display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(15,20,29,.94);color:#f4f7fb;border:1px solid #344153;border-radius:15px;box-shadow:0 8px 30px #0005;font:600 12px/1.2 system-ui,sans-serif;backdrop-filter:blur(12px)}
      #mangaflow-overlay *{box-sizing:border-box}#mangaflow-overlay button{cursor:pointer;border:1px solid #344153;background:#222c3a;color:#fff;border-radius:10px;width:30px;height:30px;font-size:12px}
      #mangaflow-overlay button:hover{background:#34445b}#mangaflow-overlay .mf-toggle{background:#3478f6;border-color:#3478f6}
      #mangaflow-overlay .mf-brand{display:flex;align-items:center;gap:5px;padding-right:3px;white-space:nowrap}
      #mangaflow-overlay .mf-mark{font-size:22px;color:#79a8ff}#mangaflow-overlay .mf-speed{white-space:nowrap;color:#cbd7e8;font-weight:500}
      #mangaflow-overlay .mf-hide{width:24px;height:24px;border:0;background:transparent;font-size:18px;color:#aab6c7}
      @media(max-width:480px){#mangaflow-overlay{right:8px;bottom:8px;gap:5px;padding:6px 7px}#mangaflow-overlay .mf-brand{font-size:11px}#mangaflow-overlay .mf-speed{font-size:11px}}`;
    document.documentElement.appendChild(style);
    document.documentElement.appendChild(overlay);
    button = overlay.querySelector(".mf-toggle");
    speedLabel = overlay.querySelector(".mf-speed");
    button.addEventListener("click", toggle);
    overlay.querySelector(".mf-stop").addEventListener("click", stop);
    overlay.querySelector(".mf-hide").addEventListener("click", () => {
      overlay.remove(); overlay = null;
    });
    overlay.addEventListener("mouseenter", () => {
      if (settings.pauseHover && running) hoverPaused = true;
    });
    overlay.addEventListener("mouseleave", () => { hoverPaused = false; });
    updateOverlay();
  }

  function updateOverlay() {
    if (!overlay) return;
    if (button) button.textContent = running ? "Ⅱ" : "▶";
    if (speedLabel) speedLabel.textContent = `${settings.speed} px/s`;
  }

  document.addEventListener("keydown", event => {
    if (event.altKey && event.key.toLowerCase() === "s") { event.preventDefault(); toggle(); }
    if (event.altKey && event.key === "ArrowUp") {
      settings.speed = Math.min(200, settings.speed + 5);
      chrome.storage.sync.set({ speed: settings.speed }); updateOverlay();
    }
    if (event.altKey && event.key === "ArrowDown") {
      settings.speed = Math.max(5, settings.speed - 5);
      chrome.storage.sync.set({ speed: settings.speed }); updateOverlay();
    }
  }, true);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "MANGAFLOW_TOGGLE") toggle();
    if (message.type === "MANGAFLOW_STOP") stop();
    if (message.type === "MANGAFLOW_SETTINGS") {
      settings = { ...settings, ...message.settings };
      if (message.settings.speed !== undefined) chrome.storage.sync.set({ speed: settings.speed });
      if (settings.floating && !overlay) buildOverlay();
      if (!settings.floating && overlay) { overlay.remove(); overlay = null; }
      updateOverlay();
    }
    if (message.type === "MANGAFLOW_GET_STATE") {
      sendResponse({ running, speed: settings.speed });
      return true;
    }
    if (message.type === "MANGAFLOW_TOGGLE" || message.type === "MANGAFLOW_STOP" || message.type === "MANGAFLOW_SETTINGS") {
      sendResponse({ running, speed: settings.speed });
    }
    return true;
  });

  // Keep the requested run state when the tab is backgrounded.
  // Browsers may throttle animation frames in background tabs; scrolling resumes when visible.
})();