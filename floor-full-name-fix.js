(() => {
  const originalResponseText = Response.prototype.text;

  const styles = `
<style id="floorFullNameReadabilityFix">
  html.floor-full-names .floor-seat-marker[data-floor-full-name] {
    width: 23px !important;
    min-width: 23px !important;
    max-width: 23px !important;
    height: 23px !important;
    padding: 0 !important;
    border-radius: 50% !important;
    overflow: visible !important;
    white-space: nowrap !important;
    font-size: 0 !important;
    line-height: 23px !important;
  }

  html.floor-full-names .floor-seat-marker[data-floor-full-name]::before {
    content: "•";
    display: block;
    width: 23px;
    height: 23px;
    line-height: 21px;
    text-align: center;
    font-size: 13px;
    font-weight: 800;
    color: inherit;
  }

  .floor-full-name-overlay {
    position: absolute;
    inset: 0;
    z-index: 100;
    pointer-events: none;
    overflow: visible;
    visibility: hidden;
  }

  html.floor-full-names .floor-full-name-overlay {
    visibility: visible;
  }

  .floor-full-name-label {
    position: absolute;
    width: max-content;
    max-width: 150px;
    padding: 2px 5px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.97);
    color: #172231;
    border: 1px solid rgba(38, 53, 74, 0.18);
    box-shadow: 0 1px 3px rgba(17, 24, 39, 0.12);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 10px;
    font-weight: 700;
    line-height: 1.2;
    white-space: nowrap;
    text-align: center;
    will-change: left, top;
    z-index: 3;
  }

  .floor-full-name-label[data-side="top"] { transform: translate(-50%, -100%); }
  .floor-full-name-label[data-side="bottom"] { transform: translate(-50%, 0); }
  .floor-full-name-label[data-side="left"] { transform: translate(-100%, -50%); }
  .floor-full-name-label[data-side="right"] { transform: translate(0, -50%); }

  html.floor-full-names .floor-stage,
  html.floor-full-names .floor-stage-shell,
  html.floor-full-names .floor-table,
  html.floor-full-names .floor-seat-anchor,
  html.floor-full-names .floor-seat-offset {
    overflow: visible !important;
  }

  html[data-pdf-export="true"] .floor-full-name-label {
    background: #fff;
    box-shadow: none;
  }
</style>`;

  const script = `
<script id="floorFullNamePositionScript">
(() => {
  let rafId = 0;
  let refreshing = false;

  function normalize(value) {
    return String(value || "").replace(/\\s+/g, " ").trim();
  }

  function guestNameOnly(value) {
    let text = normalize(value);
    if (!text) return "";
    text = text.replace(/,\\s*(?:head|foot|left\\s*\\d+|right\\s*\\d+)\\s*,\\s*table\\s*\\d+.*$/i, "");
    text = text.replace(/,\\s*table\\s*\\d+.*$/i, "");
    text = text.replace(/\\s*[·|]\\s*(?:head|foot|left\\s*\\d+|right\\s*\\d+)(?:\\s*[·|,]\\s*table\\s*\\d+)?$/i, "");
    text = normalize(text);
    if (/^empty(?:\\s|$)/i.test(text)) return "";
    return text;
  }

  function getName(marker) {
    const candidates = [
      marker.dataset.floorFullName,
      marker.dataset.fullName,
      marker.dataset.guestName,
      marker.getAttribute("data-guest"),
      marker.getAttribute("aria-label"),
      marker.getAttribute("title"),
    ];
    for (const candidate of candidates) {
      const name = guestNameOnly(candidate);
      if (name && name !== "+" && name !== "•" && name !== ".") return name;
    }
    return "";
  }

  function ensureOverlay(stage) {
    let overlay = stage.querySelector(":scope > .floor-full-name-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "floor-full-name-overlay";
      stage.appendChild(overlay);
    }
    return overlay;
  }

  function sideFor(markerRect, tableRect) {
    const mx = markerRect.left + markerRect.width / 2;
    const my = markerRect.top + markerRect.height / 2;
    const tx = tableRect.left + tableRect.width / 2;
    const ty = tableRect.top + tableRect.height / 2;
    const dx = mx - tx;
    const dy = my - ty;
    const nx = Math.abs(dx) / Math.max(tableRect.width / 2, 1);
    const ny = Math.abs(dy) / Math.max(tableRect.height / 2, 1);
    if (ny >= nx) return dy < 0 ? "top" : "bottom";
    return dx < 0 ? "left" : "right";
  }

  function overlap(a, b, padding = 3) {
    return !(a.right + padding <= b.left || b.right + padding <= a.left || a.bottom + padding <= b.top || b.bottom + padding <= a.top);
  }

  function resolveCollisions(labels) {
    const placed = [];
    for (const label of labels) {
      const baseLeft = Number(label.dataset.baseLeft || 0);
      const baseTop = Number(label.dataset.baseTop || 0);
      const side = label.dataset.side;
      const horizontal = side === "top" || side === "bottom";
      const outward = side === "top" || side === "left" ? -1 : 1;

      label.style.left = baseLeft + "px";
      label.style.top = baseTop + "px";

      for (let attempt = 0; attempt < 20; attempt += 1) {
        const rect = label.getBoundingClientRect();
        if (!placed.some((item) => overlap(rect, item.rect))) break;

        const lane = Math.floor(attempt / 2) + 1;
        const sign = attempt % 2 === 0 ? 1 : -1;
        const along = 12 * lane * sign;
        const out = attempt >= 8 ? 15 * Math.floor((attempt - 6) / 4) * outward : 0;

        if (horizontal) {
          label.style.left = baseLeft + along + "px";
          label.style.top = baseTop + out + "px";
        } else {
          label.style.top = baseTop + along + "px";
          label.style.left = baseLeft + out + "px";
        }
      }
      placed.push({ rect: label.getBoundingClientRect() });
    }
  }

  function markerKey(marker, table, index) {
    const tableId = table.dataset.tableId || table.id || normalize(table.querySelector(".floor-table-label")?.textContent) || "table";
    return tableId + "|" + index;
  }

  function refresh() {
    rafId = 0;
    if (refreshing) return;
    refreshing = true;

    try {
      const stage = document.querySelector(".floor-stage");
      if (!stage) return;
      const overlay = ensureOverlay(stage);

      const stageRect = stage.getBoundingClientRect();
      if (!stageRect.width || !stageRect.height) return;
      const scaleX = stageRect.width / Math.max(stage.offsetWidth, 1);
      const scaleY = stageRect.height / Math.max(stage.offsetHeight, 1);

      const existing = new Map(
        Array.from(overlay.querySelectorAll(".floor-full-name-label[data-label-key]")).map((label) => [label.dataset.labelKey, label]),
      );
      const used = new Set();
      const labels = [];
      const tableCounters = new Map();

      for (const marker of stage.querySelectorAll(".floor-seat-marker")) {
        const table = marker.closest(".floor-table");
        if (!table) continue;

        const count = tableCounters.get(table) || 0;
        tableCounters.set(table, count + 1);
        const key = markerKey(marker, table, count);

        const name = getName(marker);
        if (!name) continue;
        used.add(key);

        let label = existing.get(key);
        if (!label) {
          label = document.createElement("div");
          label.className = "floor-full-name-label";
          label.dataset.labelKey = key;
          overlay.appendChild(label);
        }
        if (label.textContent !== name) label.textContent = name;

        const markerRect = marker.getBoundingClientRect();
        const tableRect = table.getBoundingClientRect();
        if (!markerRect.width || !markerRect.height) continue;

        const side = sideFor(markerRect, tableRect);
        const centerX = (markerRect.left + markerRect.width / 2 - stageRect.left) / scaleX;
        const centerY = (markerRect.top + markerRect.height / 2 - stageRect.top) / scaleY;
        const gapX = (markerRect.width / 2 + 8) / scaleX;
        const gapY = (markerRect.height / 2 + 8) / scaleY;

        let left = centerX;
        let top = centerY;
        if (side === "top") top -= gapY;
        else if (side === "bottom") top += gapY;
        else if (side === "left") left -= gapX;
        else left += gapX;

        label.dataset.side = side;
        label.dataset.baseLeft = String(left);
        label.dataset.baseTop = String(top);
        label.style.left = left + "px";
        label.style.top = top + "px";
        labels.push(label);
      }

      for (const [key, label] of existing) {
        if (!used.has(key)) label.remove();
      }

      if (document.documentElement.classList.contains("floor-full-names")) {
        resolveCollisions(labels);
      }
    } finally {
      refreshing = false;
    }
  }

  function schedule() {
    if (rafId) return;
    rafId = requestAnimationFrame(refresh);
  }

  const observer = new MutationObserver((mutations) => {
    let relevant = false;
    for (const mutation of mutations) {
      const target = mutation.target;
      if (target instanceof Element && target.closest(".floor-full-name-overlay")) continue;
      relevant = true;
      break;
    }
    if (relevant) schedule();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "data-floor-full-name"],
  });

  window.addEventListener("resize", schedule);
  document.addEventListener("click", () => setTimeout(schedule, 20), true);
  document.addEventListener("pointerup", () => setTimeout(schedule, 20), true);
  document.addEventListener("change", () => setTimeout(schedule, 20), true);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule, { once: true });
  else schedule();
})();
<\/script>`;

  function inject(html) {
    if (typeof html !== "string" || !html.includes('id="initialPlan"') || !html.includes("function normalizePlan")) return html;
    if (!html.includes('id="floorFullNameReadabilityFix"')) html = html.replace(/<\/head>/i, styles + "\n</head>");
    if (!html.includes('id="floorFullNamePositionScript"')) html = html.replace(/<\/body>/i, script + "\n</body>");
    return html;
  }

  Response.prototype.text = async function (...args) {
    const text = await originalResponseText.apply(this, args);
    return inject(text);
  };
})();