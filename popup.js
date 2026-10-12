const $ = (id) => document.getElementById(id);
const defaults = { speed: 35, mode: "continuous", pauseHover: true, floating: true };

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function authorizeCurrentSite() {
  const tab = await activeTab();
  if (!tab?.id || !tab.url || !/^https?:/.test(tab.url)) {
    $("status").textContent = "Open a regular webpage first";
    return false;
  }
  const origin = new URL(tab.url).origin;
  const pattern = `${origin}/*`;
  const alreadyGranted = await chrome.permissions.contains({ origins: [pattern] });
  if (!alreadyGranted) {
    const granted = await chrome.permissions.request({ origins: [pattern] });
    if (!granted) {
      $("status").textContent = "Site permission declined";
      return false;
    }
  }
  const registered = await chrome.runtime.sendMessage({ type: "MANGAFLOW_AUTHORIZE_SITE", origin });
  if (!registered?.ok) {
    $("status").textContent = "Could not enable this site";
    return false;
  }
  $("status").textContent = "Site authorized";
  return true;
}

async function sendToPage(message) {
  const tab = await activeTab();
  if (!tab?.id || !/^https?:/.test(tab.url || "")) {
    $("status").textContent = "Open a webpage first";
    return null;
  }
  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch {
      $("status").textContent = "Grant permission to this site first";
      return null;
    }
  }
}

async function loadSettings() {
  const saved = await chrome.storage.sync.get(defaults);
  $("speed").value = saved.speed;
  $("speedValue").textContent = saved.speed;
  $("mode").value = saved.mode;
  $("pauseHover").checked = saved.pauseHover;
  $("floating").checked = saved.floating;
}

async function saveAndSync() {
  const settings = {
    speed: Number($("speed").value),
    mode: $("mode").value,
    pauseHover: $("pauseHover").checked,
    floating: $("floating").checked
  };
  $("speedValue").textContent = settings.speed;
  await chrome.storage.sync.set(settings);
  await sendToPage({ type: "MANGAFLOW_SETTINGS", settings });
}

$("speed").addEventListener("input", saveAndSync);
$("mode").addEventListener("change", saveAndSync);
$("pauseHover").addEventListener("change", saveAndSync);
$("floating").addEventListener("change", saveAndSync);

$("toggle").addEventListener("click", async () => {
  const ok = await authorizeCurrentSite();
  if (!ok) return;
  // The registered script applies on future loads. Inject immediately for the current page too.
  await sendToPage({ type: "MANGAFLOW_SETTINGS", settings: await chrome.storage.sync.get(defaults) });
  const result = await sendToPage({ type: "MANGAFLOW_TOGGLE" });
  if (result) $("status").textContent = result.running ? "Scrolling" : "Paused";
});
$("stop").addEventListener("click", async () => {
  const result = await sendToPage({ type: "MANGAFLOW_STOP" });
  $("status").textContent = result ? "Stopped" : "Ready";
});

loadSettings().then(async () => {
  const tab = await activeTab();
  if (tab?.url && /^https?:/.test(tab.url)) {
    const pattern = `${new URL(tab.url).origin}/*`;
    const granted = await chrome.permissions.contains({ origins: [pattern] });
    if (granted) {
      $("status").textContent = "Site authorized";
      const result = await sendToPage({ type: "MANGAFLOW_GET_STATE" });
      if (result?.running) $("status").textContent = "Scrolling";
    } else {
      $("status").textContent = "Permission needed on this site";
    }
  }
});


$("disableSite").addEventListener("click", async () => {
  const result = await sendToPage({ type: "MANGAFLOW_DISABLE_SITE" });
  if (result?.ok) $("status").textContent = "Disabled on this site";
  else $("status").textContent = "Open the site and try again";
});
