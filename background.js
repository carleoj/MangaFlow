const ORIGINS_KEY = "mangaflowAuthorizedOrigins";

async function getAuthorizedOrigins() {
  const data = await chrome.storage.local.get({ [ORIGINS_KEY]: [] });
  return data[ORIGINS_KEY];
}

async function registerForOrigin(origin) {
  const urlPattern = `${origin}/*`;
  const id = `mangaflow-${btoa(origin).replace(/=/g, "").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
  if (!existing.length) {
    await chrome.scripting.registerContentScripts([{
      id,
      matches: [urlPattern],
      js: ["content.js"],
      runAt: "document_idle",
      persistAcrossSessions: true
    }]);
  }
}

async function registerAuthorizedOrigins() {
  for (const origin of await getAuthorizedOrigins()) {
    try {
      const granted = await chrome.permissions.contains({ origins: [`${origin}/*`] });
      if (granted) await registerForOrigin(origin);
    } catch (error) {
      console.warn("MangaFlow could not register site:", origin, error);
    }
  }
}

chrome.runtime.onInstalled.addListener(() => { registerAuthorizedOrigins(); });
chrome.runtime.onStartup.addListener(() => { registerAuthorizedOrigins(); });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "MANGAFLOW_AUTHORIZE_SITE" && message.origin) {
    (async () => {
      const origin = message.origin;
      const url = new URL(origin);
      if (!["http:", "https:"].includes(url.protocol)) {
        sendResponse({ ok: false, error: "Unsupported page" });
        return;
      }
      const pattern = `${origin}/*`;
      const granted = await chrome.permissions.contains({ origins: [pattern] });
      if (!granted) {
        sendResponse({ ok: false, error: "Site permission has not been granted" });
        return;
      }
      await registerForOrigin(origin);
      const origins = new Set(await getAuthorizedOrigins());
      origins.add(origin);
      await chrome.storage.local.set({ [ORIGINS_KEY]: [...origins] });
      sendResponse({ ok: true });
    })().catch(error => sendResponse({ ok: false, error: String(error) }));
    return true;
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id || !/^https?:/.test(tab.url || "")) return;
  const send = async (message) => {
    try {
      await chrome.tabs.sendMessage(tab.id, message);
    } catch {
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
        await chrome.tabs.sendMessage(tab.id, message);
      } catch {}
    }
  };
  if (command === "toggle-scrolling") await send({ type: "MANGAFLOW_TOGGLE" });
  if (command === "increase-speed" || command === "decrease-speed") {
    const { speed = 35 } = await chrome.storage.sync.get({ speed: 35 });
    const next = Math.max(5, Math.min(200, speed + (command === "increase-speed" ? 5 : -5)));
    await chrome.storage.sync.set({ speed: next });
    await send({ type: "MANGAFLOW_SETTINGS", settings: { speed: next } });
  }
});