(() => {
  const originalResponseText = Response.prototype.text;

  const extraStyles = `
<style id="shareExportStyles">
  .floor-full-names-control {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 34px;
    padding: 6px 10px;
    border: 1px solid rgba(38, 53, 74, 0.18);
    border-radius: 9px;
    background: #fff;
    color: #26354a;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    user-select: none;
  }

  .floor-full-names-control input {
    width: 16px;
    height: 16px;
    margin: 0;
  }

  html.floor-full-names .floor-seat-marker[data-floor-full-name] {
    width: auto !important;
    min-width: 23px;
    max-width: 150px;
    padding: 2px 5px !important;
    border-radius: 999px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 9px !important;
    line-height: 18px !important;
    z-index: 6;
  }

  html[data-pdf-export="true"] .toolbar,
  html[data-pdf-export="true"] .view-tabs,
  html[data-pdf-export="true"] .sidebar,
  html[data-pdf-export="true"] .floor-sidebar,
  html[data-pdf-export="true"] .agenda-sidebar,
  html[data-pdf-export="true"] .floor-toolbar,
  html[data-pdf-export="true"] .panel-actions,
  html[data-pdf-export="true"] .merge-actions,
  html[data-pdf-export="true"] .modal-backdrop,
  html[data-pdf-export="true"] .toast,
  html[data-pdf-export="true"] #editingLockNotice,
  html[data-pdf-export="true"] .floor-rotate,
  html[data-pdf-export="true"] .floor-edit,
  html[data-pdf-export="true"] .agenda-event-buttons,
  html[data-pdf-export="true"] .floor-full-names-control,
  html[data-pdf-export="true"] button,
  html[data-pdf-export="true"] input,
  html[data-pdf-export="true"] select,
  html[data-pdf-export="true"] textarea,
  html[data-pdf-export="true"] [data-config-control="true"] {
    display: none !important;
  }

  html[data-pdf-export="true"] .workspace,
  html[data-pdf-export="true"] .floor-workspace,
  html[data-pdf-export="true"] .agenda-workspace {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  html[data-pdf-export="true"] main,
  html[data-pdf-export="true"] .canvas,
  html[data-pdf-export="true"] .floor-canvas-panel,
  html[data-pdf-export="true"] .agenda-canvas-panel {
    width: 100% !important;
    max-width: none !important;
  }
</style>`;

  const extraScript = `
<script id="shareExportScript">
(() => {
  const FULL_NAMES_CLASS = "floor-full-names";
  const HTML2CANVAS_URL = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
  const JSPDF_URL = "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js";
  let exportInProgress = false;
  let refreshTimer = null;

  function normalizeText(value) {
    return String(value || "").replace(/\\s+/g, " ").trim();
  }

  function looksLikePersonName(value) {
    const text = normalizeText(value);
    if (!text || text.length < 3 || text.length > 90) return false;
    if (/^(head|foot|left|right|seat|table|empty|available|unassigned)\\b/i.test(text)) return false;
    return text.split(" ").filter(Boolean).length >= 2;
  }

  function cleanNameCandidate(value) {
    let text = normalizeText(value);
    if (!text) return "";

    const labelled = text.match(/(?:guest|name)\\s*[:·|]\\s*(.+)$/i);
    if (labelled && looksLikePersonName(labelled[1])) return normalizeText(labelled[1]);

    const afterSeat = text.match(/^(?:head|foot|left\\s*\\d+|right\\s*\\d+|seat[^:·|]*)\\s*[:·|\\-]\\s*(.+)$/i);
    if (afterSeat && looksLikePersonName(afterSeat[1])) return normalizeText(afterSeat[1]);

    const parts = text.split(/[·|]/).map(normalizeText).filter(Boolean);
    for (const part of parts) {
      if (looksLikePersonName(part)) return part;
    }

    return looksLikePersonName(text) ? text : "";
  }

  function fullNameForMarker(marker) {
    const directValues = [
      marker.dataset.fullName,
      marker.dataset.guestName,
      marker.dataset.name,
      marker.getAttribute("data-guest"),
      marker.getAttribute("aria-label"),
      marker.getAttribute("title"),
    ];

    for (const value of directValues) {
      const candidate = cleanNameCandidate(value);
      if (candidate) return candidate;
    }

    const containers = [
      marker.closest(".floor-seat-anchor"),
      marker.closest(".floor-seat-offset"),
      marker.parentElement,
    ].filter(Boolean);

    for (const container of containers) {
      const values = [
        container.dataset?.fullName,
        container.dataset?.guestName,
        container.dataset?.name,
        container.getAttribute?.("data-guest"),
        container.getAttribute?.("aria-label"),
        container.getAttribute?.("title"),
      ];
      for (const value of values) {
        const candidate = cleanNameCandidate(value);
        if (candidate) return candidate;
      }

      const namedChild = container.querySelector?.("[data-guest-name], .guest-name, .name");
      if (namedChild) {
        const candidate = cleanNameCandidate(
          namedChild.getAttribute("data-guest-name") || namedChild.textContent,
        );
        if (candidate) return candidate;
      }
    }

    return "";
  }

  function applyFullNames() {
    const enabled = document.documentElement.classList.contains(FULL_NAMES_CLASS);
    const markers = document.querySelectorAll(".floor-seat-marker");

    for (const marker of markers) {
      if (!marker.dataset.floorShortLabel) {
        marker.dataset.floorShortLabel = normalizeText(marker.textContent);
      }

      const fullName = fullNameForMarker(marker);
      if (fullName) marker.dataset.floorFullName = fullName;

      const desired = enabled && marker.dataset.floorFullName
        ? marker.dataset.floorFullName
        : marker.dataset.floorShortLabel;

      if (normalizeText(marker.textContent) !== desired) {
        marker.textContent = desired;
      }
    }
  }

  function installFullNameToggle() {
    const toolbar = document.querySelector(".floor-toolbar");
    if (!toolbar || document.getElementById("floorFullNamesToggle")) return;

    const label = document.createElement("label");
    label.className = "floor-full-names-control";
    label.setAttribute("data-config-control", "true");
    label.innerHTML = '<input id="floorFullNamesToggle" type="checkbox"> <span>Full names</span>';
    toolbar.appendChild(label);

    const checkbox = label.querySelector("input");
    checkbox.checked = document.documentElement.classList.contains(FULL_NAMES_CLASS);
    checkbox.addEventListener("change", () => {
      document.documentElement.classList.toggle(FULL_NAMES_CLASS, checkbox.checked);
      applyFullNames();
    });
  }

  function findPrintButton() {
    const byId = Array.from(document.querySelectorAll("button[id]"))
      .find((button) => /print/i.test(button.id));
    if (byId) return byId;

    return Array.from(document.querySelectorAll("button")).find((button) => {
      const label = normalizeText(button.textContent).toLowerCase();
      return label === "print" || label === "pdf" || label === "download pdf";
    });
  }

  function installPdfButton() {
    const button = findPrintButton();
    if (!button) return;
    button.dataset.pdfExportButton = "true";
    button.setAttribute("data-readonly-visible", "true");
    if (normalizeText(button.textContent).toLowerCase() === "print") {
      button.textContent = "PDF";
    }
    button.title = "Download the current view as PDF";
  }

  function loadScriptOnce(src, ready) {
    if (ready()) return Promise.resolve();
    const existing = document.querySelector('script[src="' + src + '"]');
    if (existing) {
      return new Promise((resolve, reject) => {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.crossOrigin = "anonymous";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Could not load PDF export dependency: " + src));
      document.head.appendChild(script);
    });
  }

  function visibleContentRoot() {
    return document.querySelector("main") || document.body;
  }

  function currentViewName() {
    const activeTab = document.querySelector(".view-tab.active, .view-tab[aria-selected='true']");
    const label = normalizeText(activeTab?.textContent || "wedding-planner").toLowerCase();
    return label.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "wedding-planner";
  }

  async function exportCurrentViewPdf() {
    if (exportInProgress) return;
    exportInProgress = true;

    const button = findPrintButton();
    const previousText = button ? button.textContent : "";
    if (button) {
      button.disabled = true;
      button.textContent = "Creating PDF…";
    }

    try {
      await loadScriptOnce(HTML2CANVAS_URL, () => typeof window.html2canvas === "function");
      await loadScriptOnce(
        JSPDF_URL,
        () => Boolean(window.jspdf && window.jspdf.jsPDF),
      );

      const target = visibleContentRoot();
      document.documentElement.setAttribute("data-pdf-export", "true");
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const canvas = await window.html2canvas(target, {
        backgroundColor: "#ffffff",
        scale: Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: Math.max(target.scrollWidth, document.documentElement.clientWidth),
        windowHeight: Math.max(target.scrollHeight, document.documentElement.clientHeight),
        onclone: (clonedDocument) => {
          clonedDocument.documentElement.setAttribute("data-pdf-export", "true");
          const removable = clonedDocument.querySelectorAll(
            ".toolbar,.view-tabs,.sidebar,.floor-sidebar,.agenda-sidebar,.floor-toolbar," +
            ".panel-actions,.merge-actions,.modal-backdrop,.toast,#editingLockNotice," +
            ".floor-rotate,.floor-edit,.agenda-event-buttons,.floor-full-names-control," +
            "button,input,select,textarea,[data-config-control='true']",
          );
          removable.forEach((element) => element.remove());
        },
      });

      const jsPDF = window.jspdf.jsPDF;
      const orientation = canvas.width >= canvas.height ? "landscape" : "portrait";
      const pdf = new jsPDF({ orientation, unit: "mm", format: "a4", compress: true });
      const margin = 8;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;
      const imageWidth = availableWidth;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;
      const imageData = canvas.toDataURL("image/jpeg", 0.94);

      let renderedHeight = 0;
      let pageIndex = 0;
      while (renderedHeight < imageHeight - 0.1) {
        if (pageIndex > 0) pdf.addPage();
        const y = margin - renderedHeight;
        pdf.addImage(imageData, "JPEG", margin, y, imageWidth, imageHeight, undefined, "FAST");
        renderedHeight += availableHeight;
        pageIndex += 1;
      }

      pdf.save("wedding-planner-" + currentViewName() + ".pdf");
    } catch (error) {
      console.error("PDF export failed.", error);
      if (typeof window.showToast === "function") {
        window.showToast("Could not create the PDF.", true);
      } else {
        alert("Could not create the PDF. Please check your connection and try again.");
      }
    } finally {
      document.documentElement.removeAttribute("data-pdf-export");
      if (button) {
        button.disabled = false;
        button.textContent = previousText || "PDF";
      }
      exportInProgress = false;
    }
  }

  function refreshEnhancements() {
    installFullNameToggle();
    installPdfButton();
    applyFullNames();
  }

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshEnhancements, 40);
  }

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest?.("button");
      if (!button) return;
      const isPdfButton =
        button.dataset.pdfExportButton === "true" ||
        /print/i.test(button.id || "") ||
        ["print", "pdf", "download pdf"].includes(normalizeText(button.textContent).toLowerCase());
      if (!isPdfButton) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      exportCurrentViewPdf();
    },
    true,
  );

  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refreshEnhancements, { once: true });
  } else {
    refreshEnhancements();
  }
})();
<\/script>`;

  function injectShareEnhancements(html) {
    if (
      typeof html !== "string" ||
      !html.includes('id="initialPlan"') ||
      !html.includes("function normalizePlan")
    ) {
      return html;
    }

    if (!html.includes('id="shareExportStyles"')) {
      html = html.replace(/<\/head>/i, extraStyles + "\n</head>");
    }
    if (!html.includes('id="shareExportScript"')) {
      html = html.replace(/<\/body>/i, extraScript + "\n</body>");
    }
    return html;
  }

  Response.prototype.text = async function (...args) {
    const text = await originalResponseText.apply(this, args);
    return injectShareEnhancements(text);
  };
})();
