(async () => {
  const EDIT_UNLOCK_STORAGE_KEY = "wedding-planner-edit-unlocked";

  function injectEditingLock(html) {
    let editingUnlocked = false;
    try {
      editingUnlocked =
        localStorage.getItem(EDIT_UNLOCK_STORAGE_KEY) === "true";
    } catch (storageError) {
      console.warn("Could not read the editing unlock state.", storageError);
    }

    if (editingUnlocked) {
      html = html.replace(
        /<html\b/i,
        '<html data-edit-unlocked="true"',
      );
    }

    const lockStyles = `
<style id="editingLockStyles">
  html:not([data-edit-unlocked="true"]) button:not([data-readonly-visible="true"]) {
    display: none !important;
  }
</style>`;

    const lockScript = `
<script id="editingLockScript">
(() => {
  const STORAGE_KEY = ${JSON.stringify(EDIT_UNLOCK_STORAGE_KEY)};
  const UNLOCK_WORD = "unlock";
  let typed = "";

  const exactVisibleLabels = new Set([
    "help",
    "export",
    "print",
    "cancel",
    "close",
    "dismiss",
    "seating",
    "floor planning",
    "day agenda",
    "download",
    "copy",
    "×",
    "✕",
    "✖",
  ]);

  function normalize(value) {
    return String(value || "").trim().replace(/\\s+/g, " ").toLowerCase();
  }

  function isReadonlyVisibleButton(button) {
    if (button.matches(".view-tab, [data-close]")) return true;

    const id = normalize(button.id);
    const className = normalize(button.className);
    const label = normalize(
      button.getAttribute("aria-label") ||
        button.getAttribute("title") ||
        button.textContent,
    );

    if (exactVisibleLabels.has(label)) return true;
    if (/help|export|print/.test(id)) return true;
    if (/spotify|music|player/.test(id + " " + className)) return true;
    if (button.closest('[class*="spotify"], [class*="music-player"]')) return true;

    return false;
  }

  function classifyButtons(root = document) {
    const buttons = [];
    if (root instanceof HTMLButtonElement) buttons.push(root);
    if (root.querySelectorAll) buttons.push(...root.querySelectorAll("button"));

    for (const button of buttons) {
      if (isReadonlyVisibleButton(button)) {
        button.setAttribute("data-readonly-visible", "true");
      } else {
        button.removeAttribute("data-readonly-visible");
      }
    }
  }

  function showUnlockedNotice() {
    const notice = document.createElement("div");
    notice.textContent = "Editing unlocked";
    Object.assign(notice.style, {
      position: "fixed",
      right: "20px",
      bottom: "20px",
      zIndex: "9999",
      padding: "11px 14px",
      borderRadius: "10px",
      background: "#26354a",
      color: "#fff",
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px",
      fontWeight: "700",
      boxShadow: "0 12px 30px rgba(31, 41, 55, 0.22)",
    });
    document.body.appendChild(notice);
    setTimeout(() => notice.remove(), 2200);
  }

  function unlockEditing() {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch (storageError) {
      console.warn("Could not persist the editing unlock state.", storageError);
    }
    document.documentElement.setAttribute("data-edit-unlocked", "true");
    showUnlockedNotice();
  }

  classifyButtons();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) classifyButtons(node);
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener(
    "keydown",
    (event) => {
      if (document.documentElement.dataset.editUnlocked === "true") return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const key = String(event.key || "").toLowerCase();
      if (/^[a-z]$/.test(key)) {
        typed = (typed + key).slice(-UNLOCK_WORD.length);
        if (typed === UNLOCK_WORD) unlockEditing();
      } else if (key === "escape") {
        typed = "";
      }
    },
    true,
  );
})();
<\/script>`;

    html = html.replace(/<\/head>/i, `${lockStyles}\n</head>`);
    html = html.replace(/<\/body>/i, `${lockScript}\n</body>`);
    return html;
  }

  try {
    const b64 = window.__WEDDING_APP_GZ || "";
    const bytes = Uint8Array.from(atob(b64), (character) =>
      character.charCodeAt(0),
    );
    const stream = new Blob([bytes])
      .stream()
      .pipeThrough(new DecompressionStream("gzip"));
    let html = await new Response(stream).text();

    try {
      const response = await fetch("base-config.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Base configuration request failed: ${response.status}`);
      }

      const config = await response.json();
      const basePlan = config?.plan ?? config;
      if (!basePlan || typeof basePlan !== "object") {
        throw new Error("Base configuration does not contain a valid plan.");
      }

      const initialPlanPattern =
        /(<script\b[^>]*\bid=["']initialPlan["'][^>]*>)[\s\S]*?(<\/script>)/i;
      if (!initialPlanPattern.test(html)) {
        throw new Error("The application does not expose an initialPlan block.");
      }

      const serializedPlan = JSON.stringify(basePlan, null, 2).replace(
        /</g,
        "\\u003c",
      );
      html = html.replace(
        initialPlanPattern,
        `$1\n${serializedPlan}\n$2`,
      );
    } catch (configError) {
      console.warn(
        "Could not load base-config.json; using the embedded base configuration.",
        configError,
      );
    }

    html = injectEditingLock(html);

    document.open();
    document.write(html);
    document.close();
  } catch (error) {
    document.body.innerHTML = `<main style="font-family:system-ui;padding:2rem"><h1>Wedding Planner</h1><p>The application could not be loaded in this browser.</p><pre>${String(error)}</pre></main>`;
  }
})();
