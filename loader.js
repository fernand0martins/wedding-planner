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

  html,
  body {
    max-width: 100%;
  }

  body {
    overflow-x: hidden;
  }

  img,
  iframe {
    max-width: 100%;
  }

  @media (max-width: 900px) {
    .header-row {
      width: 100%;
      padding: 10px 12px;
      gap: 10px;
      align-items: flex-start;
    }

    .brand {
      min-width: 0;
      max-width: 100%;
    }

    .brand h1 {
      font-size: 18px;
    }

    .brand p {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .toolbar {
      width: 100%;
      max-width: 100%;
      flex-wrap: nowrap;
      overflow-x: auto;
      overflow-y: hidden;
      padding-bottom: 4px;
      scrollbar-width: thin;
      -webkit-overflow-scrolling: touch;
    }

    .toolbar .btn {
      flex: 0 0 auto;
      min-height: 40px;
      white-space: nowrap;
    }

    main {
      width: 100%;
      min-width: 0;
      padding: 12px;
    }

    .view-tabs {
      display: flex;
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: thin;
      -webkit-overflow-scrolling: touch;
    }

    .view-tab {
      flex: 0 0 auto;
      min-height: 44px;
      white-space: nowrap;
    }

    .workspace,
    .floor-workspace,
    .agenda-workspace {
      width: 100%;
      min-width: 0;
      grid-template-columns: minmax(0, 1fr) !important;
    }

    .sidebar,
    .floor-sidebar,
    .agenda-sidebar {
      position: static !important;
      width: 100%;
      min-width: 0;
      max-height: none !important;
      overflow: visible;
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }

    .canvas,
    .floor-canvas-panel,
    .agenda-canvas-panel,
    .panel,
    .table-card {
      width: 100%;
      min-width: 0;
    }

    .tables-grid {
      grid-template-columns: minmax(0, 1fr) !important;
    }

    .table-card.wide {
      grid-column: auto !important;
    }

    .table-body {
      max-width: 100%;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
    }

    .double-layout {
      min-width: 0;
      grid-template-columns: minmax(0, 1fr) !important;
    }

    .floor-stage-shell {
      width: 100%;
      max-width: 100%;
      padding: 10px;
      overflow: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
    }

    .floor-stage {
      min-width: 680px;
    }

    .agenda-shell {
      width: 100%;
      max-width: 100%;
      height: calc(100dvh - 210px);
      min-height: 520px;
      padding: 8px;
      overflow: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
    }

    .agenda-calendar-header,
    .agenda-timeline {
      min-width: 972px !important;
    }

    .agenda-calendar-header {
      grid-template-columns: 72px repeat(3, minmax(300px, 1fr)) !important;
    }

    .modal-backdrop {
      padding: 10px;
    }

    .modal {
      width: 100%;
      max-width: 100%;
      max-height: calc(100dvh - 20px);
    }

    .modal-content {
      overflow-wrap: anywhere;
    }

    input,
    select,
    textarea {
      font-size: 16px;
    }
  }

  @media (max-width: 640px) {
    .header-row {
      padding: 9px 10px;
    }

    .brand h1 {
      font-size: 16px;
    }

    .brand p {
      font-size: 11px;
    }

    main {
      padding: 9px;
    }

    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 8px;
    }

    .metric {
      min-width: 0;
      padding: 10px;
    }

    .metric .label {
      font-size: 10px;
    }

    .metric .value {
      font-size: 21px;
    }

    .sidebar,
    .floor-sidebar,
    .agenda-sidebar {
      display: flex !important;
      flex-direction: column;
      gap: 10px;
    }

    .canvas-head,
    .table-head {
      align-items: flex-start;
      flex-direction: column;
    }

    .head-right,
    .legend {
      width: 100%;
      justify-content: flex-start;
    }

    .table-body {
      padding: 10px;
    }

    .physical-component {
      min-width: 0;
      padding: 8px;
    }

    .standard-layout {
      min-width: 320px;
      grid-template-columns:
        minmax(82px, 1fr) minmax(130px, 1.35fr)
        minmax(82px, 1fr) !important;
      gap: 5px;
    }

    .standard-layout.horizontal {
      min-width: 630px;
      grid-template-columns: auto repeat(4, minmax(105px, 1fr)) auto !important;
    }

    .seat {
      min-height: 48px;
      padding: 4px;
    }

    .guest {
      padding: 6px;
    }

    .guest .name {
      font-size: 11px;
    }

    .guest .household {
      font-size: 9px;
    }

    .merge-row,
    .form-grid,
    .dimension-grid {
      grid-template-columns: minmax(0, 1fr) !important;
    }

    .form-grid .wide {
      grid-column: auto !important;
    }

    .panel-actions,
    .merge-actions,
    .modal-actions,
    .floor-toolbar {
      flex-wrap: wrap;
    }

    .panel-actions .btn,
    .merge-actions .btn,
    .modal-actions .btn,
    .floor-toolbar .btn {
      flex: 1 1 140px;
      min-height: 42px;
    }

    .modal-actions {
      padding: 0 12px 12px;
    }

    .modal-actions .btn {
      width: 100%;
    }

    .floor-stage-shell {
      padding: 6px;
      border-radius: 10px;
    }

    .floor-stage {
      min-width: 620px;
    }

    .floor-rotate,
    .floor-edit {
      width: 28px;
      height: 28px;
      line-height: 28px;
    }

    .floor-edit {
      right: 34px;
    }

    .floor-table-label,
    .floor-table.show-guests .floor-table-label {
      padding-right: 68px;
    }

    .floor-seat-offset,
    .floor-seat-anchor .floor-seat-marker,
    .floor-seat-marker {
      width: 23px;
      height: 23px;
    }

    .agenda-shell {
      height: calc(100dvh - 175px);
      min-height: 500px;
      padding: 5px;
      border-radius: 10px;
    }

    .agenda-calendar-header,
    .agenda-timeline {
      min-width: 840px !important;
    }

    .agenda-calendar-header {
      grid-template-columns: 72px repeat(3, minmax(256px, 1fr)) !important;
    }

    .agenda-calendar-header > div {
      padding: 9px 7px;
      font-size: 10px;
    }

    .agenda-event-block {
      padding: 6px 7px;
    }

    .agenda-event-title {
      font-size: 11px;
    }

    .agenda-event-title small {
      font-size: 9px;
    }

    html[data-edit-unlocked="true"] .agenda-event-block {
      padding-top: 39px;
    }

    html[data-edit-unlocked="true"] .agenda-event-buttons {
      left: 5px;
      top: 5px;
      width: calc(100% - 10px);
      flex-direction: row;
      overflow-x: auto;
      overflow-y: hidden;
    }

    html[data-edit-unlocked="true"] .agenda-event-buttons button {
      width: auto;
      min-width: max-content;
      min-height: 27px;
    }

    .agenda-music-indicator {
      width: 30px;
      height: 30px;
      right: 5px;
    }

    .spotify-floating-widget {
      left: 8px !important;
      right: 8px !important;
      bottom: 8px !important;
      width: auto !important;
      max-height: calc(100dvh - 16px);
    }

    .spotify-hover-preview {
      display: none !important;
    }

    .toast,
    #editingLockNotice {
      right: 10px !important;
      bottom: 10px !important;
      width: calc(100vw - 20px);
      max-width: none !important;
    }
  }
</style>`;

    const lockScript = `
<script id="editingLockScript">
(() => {
  const STORAGE_KEY = ${JSON.stringify(EDIT_UNLOCK_STORAGE_KEY)};
  const UNLOCK_WORD = "unlock";
  const LOCK_WORD = "lock";
  const MAX_COMMAND_LENGTH = Math.max(UNLOCK_WORD.length, LOCK_WORD.length);
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

  function showEditingNotice(message) {
    document.getElementById("editingLockNotice")?.remove();

    const notice = document.createElement("div");
    notice.id = "editingLockNotice";
    notice.textContent = message;
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
    typed = "";
    showEditingNotice("Editing unlocked");
  }

  function lockEditing() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (storageError) {
      console.warn("Could not persist the editing lock state.", storageError);
    }
    document.documentElement.removeAttribute("data-edit-unlocked");
    typed = "";
    showEditingNotice("Editing locked");
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
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const key = String(event.key || "").toLowerCase();
      if (/^[a-z]$/.test(key)) {
        typed = (typed + key).slice(-MAX_COMMAND_LENGTH);
        const editingUnlocked =
          document.documentElement.dataset.editUnlocked === "true";

        if (!editingUnlocked && typed.endsWith(UNLOCK_WORD)) {
          unlockEditing();
        } else if (editingUnlocked && typed.endsWith(LOCK_WORD)) {
          lockEditing();
        }
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
