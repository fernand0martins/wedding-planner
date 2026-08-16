(() => {
  const originalResponseText = Response.prototype.text;

  const styles = `
<style id="floorLabelConnectorStyles">
  .floor-full-name-connector-line {
    position: absolute;
    display: none;
    height: 1.5px;
    background: rgba(38, 53, 74, 0.72);
    transform-origin: 0 50%;
    pointer-events: none;
    z-index: 1;
  }

  .floor-full-name-connector-line::before {
    content: "";
    position: absolute;
    left: -2px;
    top: 50%;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(38, 53, 74, 0.82);
    transform: translateY(-50%);
  }

  html.floor-full-names .floor-full-name-connector-line {
    display: block;
  }

  .floor-full-name-label {
    z-index: 3;
  }

  html[data-pdf-export="true"] .floor-full-name-connector-line {
    background: rgba(38, 53, 74, 0.8);
  }
</style>`;

  const script = `
<script id="floorLabelConnectorScript">
(() => {
  let rafId = 0;

  function normalize(value) {
    return String(value || "").replace(/\\s+/g, " ").trim();
  }

  function markerKey(marker, table, index) {
    const tableId =
      table.dataset.tableId ||
      table.id ||
      normalize(table.querySelector(".floor-table-label")?.textContent) ||
      "table";
    return tableId + "|" + index;
  }

  function ensureLine(overlay, key) {
    let line = Array.from(overlay.querySelectorAll(":scope > .floor-full-name-connector-line"))
      .find((element) => element.dataset.connectorKey === key);
    if (!line) {
      line = document.createElement("div");
      line.className = "floor-full-name-connector-line";
      line.dataset.connectorKey = key;
      overlay.prepend(line);
    }
    return line;
  }

  function closestPointOnRect(rect, x, y) {
    const cx = (rect.left + rect.right) / 2;
    const cy = (rect.top + rect.bottom) / 2;
    const dx = x - cx;
    const dy = y - cy;

    if (Math.abs(dx) > Math.abs(dy)) {
      return {
        x: dx < 0 ? rect.left : rect.right,
        y: Math.max(rect.top + 2, Math.min(rect.bottom - 2, y)),
      };
    }

    return {
      x: Math.max(rect.left + 2, Math.min(rect.right - 2, x)),
      y: dy < 0 ? rect.top : rect.bottom,
    };
  }

  function refresh() {
    rafId = 0;
    const stage = document.querySelector(".floor-stage");
    const overlay = stage?.querySelector(":scope > .floor-full-name-overlay");
    if (!stage || !overlay) return;

    const stageRect = stage.getBoundingClientRect();
    if (!stageRect.width || !stageRect.height) return;

    const scaleX = stage.offsetWidth / stageRect.width;
    const scaleY = stage.offsetHeight / stageRect.height;
    const used = new Set();
    const tableCounters = new Map();

    for (const marker of stage.querySelectorAll(".floor-seat-marker")) {
      const table = marker.closest(".floor-table");
      if (!table) continue;

      const count = tableCounters.get(table) || 0;
      tableCounters.set(table, count + 1);
      const key = markerKey(marker, table, count);
      const label = overlay.querySelector(
        `.floor-full-name-label[data-label-key="${CSS.escape(key)}"]`,
      );
      if (!label || !label.textContent.trim() || /^empty(?:\\s|$)/i.test(label.textContent.trim())) continue;

      const markerRect = marker.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      if (!markerRect.width || !markerRect.height || !labelRect.width || !labelRect.height) continue;

      const seatX = markerRect.left + markerRect.width / 2;
      const seatY = markerRect.top + markerRect.height / 2;
      const end = closestPointOnRect(labelRect, seatX, seatY);

      const x1 = (seatX - stageRect.left) * scaleX;
      const y1 = (seatY - stageRect.top) * scaleY;
      const x2 = (end.x - stageRect.left) * scaleX;
      const y2 = (end.y - stageRect.top) * scaleY;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.hypot(dx, dy);
      if (length < 2) continue;

      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const line = ensureLine(overlay, key);
      used.add(key);
      line.style.left = x1 + "px";
      line.style.top = y1 + "px";
      line.style.width = length + "px";
      line.style.transform = `rotate(${angle}deg)`;
    }

    for (const line of overlay.querySelectorAll(":scope > .floor-full-name-connector-line")) {
      if (!used.has(line.dataset.connectorKey)) line.remove();
    }
  }

  function schedule() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => requestAnimationFrame(refresh));
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const target = mutation.target;
      if (target instanceof Element && target.closest(".floor-full-name-connector-line")) continue;
      if (target instanceof Element && target.closest(".floor-full-name-overlay")) {
        if (target.matches(".floor-full-name-label") || target.closest(".floor-full-name-label")) {
          schedule();
          return;
        }
        continue;
      }
      schedule();
      return;
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class", "data-label-key"],
  });

  window.addEventListener("resize", schedule);
  document.addEventListener("pointerup", () => setTimeout(schedule, 25), true);
  document.addEventListener("change", () => setTimeout(schedule, 25), true);
  document.addEventListener("click", () => setTimeout(schedule, 25), true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }
})();
<\/script>`;

  function inject(html) {
    if (
      typeof html !== "string" ||
      !html.includes('id="initialPlan"') ||
      !html.includes("function normalizePlan")
    ) {
      return html;
    }

    if (!html.includes('id="floorLabelConnectorStyles"')) {
      html = html.replace(/<\/head>/i, styles + "\n</head>");
    }
    if (!html.includes('id="floorLabelConnectorScript"')) {
      html = html.replace(/<\/body>/i, script + "\n</body>");
    }
    return html;
  }

  Response.prototype.text = async function (...args) {
    const text = await originalResponseText.apply(this, args);
    return inject(text);
  };
})();