(() => {
  const originalResponseText = Response.prototype.text;

  const styles = `
<style id="floorLabelConnectorStyles">
  .floor-full-name-connectors {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
    z-index: 0;
  }

  .floor-full-name-label {
    z-index: 2;
  }

  .floor-full-name-connector {
    stroke: rgba(38, 53, 74, 0.62);
    stroke-width: 1.2;
    vector-effect: non-scaling-stroke;
  }

  .floor-full-name-connector-dot {
    fill: rgba(38, 53, 74, 0.82);
  }

  html:not(.floor-full-names) .floor-full-name-connectors {
    display: none;
  }

  html[data-pdf-export="true"] .floor-full-name-connector {
    stroke: rgba(38, 53, 74, 0.72);
  }
</style>`;

  const script = `
<script id="floorLabelConnectorScript">
(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
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

  function ensureSvg(overlay, stage) {
    let svg = overlay.querySelector(":scope > .floor-full-name-connectors");
    if (!svg) {
      svg = document.createElementNS(SVG_NS, "svg");
      svg.classList.add("floor-full-name-connectors");
      svg.setAttribute("aria-hidden", "true");
      overlay.prepend(svg);
    }

    const width = Math.max(stage.offsetWidth, 1);
    const height = Math.max(stage.offsetHeight, 1);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    return svg;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function connectorEnd(labelRect, seatXClient, seatYClient) {
    const centerX = (labelRect.left + labelRect.right) / 2;
    const centerY = (labelRect.top + labelRect.bottom) / 2;
    const dx = seatXClient - centerX;
    const dy = seatYClient - centerY;

    if (Math.abs(dx) > Math.abs(dy)) {
      return {
        x: dx < 0 ? labelRect.left : labelRect.right,
        y: clamp(seatYClient, labelRect.top + 3, labelRect.bottom - 3),
      };
    }

    return {
      x: clamp(seatXClient, labelRect.left + 3, labelRect.right - 3),
      y: dy < 0 ? labelRect.top : labelRect.bottom,
    };
  }

  function ensureConnector(svg, key) {
    let group = Array.from(svg.children).find(
      (child) => child.dataset?.connectorKey === key,
    );
    if (group) return group;

    group = document.createElementNS(SVG_NS, "g");
    group.dataset.connectorKey = key;

    const line = document.createElementNS(SVG_NS, "line");
    line.classList.add("floor-full-name-connector");

    const dot = document.createElementNS(SVG_NS, "circle");
    dot.classList.add("floor-full-name-connector-dot");
    dot.setAttribute("r", "1.9");

    group.append(line, dot);
    svg.appendChild(group);
    return group;
  }

  function refresh() {
    rafId = 0;

    const stage = document.querySelector(".floor-stage");
    const overlay = stage?.querySelector(":scope > .floor-full-name-overlay");
    if (!stage || !overlay) return;

    const svg = ensureSvg(overlay, stage);
    if (!document.documentElement.classList.contains("floor-full-names")) return;

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
      if (!label || !label.textContent.trim()) continue;

      const markerRect = marker.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      if (!markerRect.width || !markerRect.height || !labelRect.width || !labelRect.height) continue;

      const seatXClient = markerRect.left + markerRect.width / 2;
      const seatYClient = markerRect.top + markerRect.height / 2;
      const endClient = connectorEnd(labelRect, seatXClient, seatYClient);

      const x1 = (seatXClient - stageRect.left) * scaleX;
      const y1 = (seatYClient - stageRect.top) * scaleY;
      const x2 = (endClient.x - stageRect.left) * scaleX;
      const y2 = (endClient.y - stageRect.top) * scaleY;

      const group = ensureConnector(svg, key);
      used.add(key);

      const line = group.querySelector("line");
      const dot = group.querySelector("circle");
      line.setAttribute("x1", x1.toFixed(2));
      line.setAttribute("y1", y1.toFixed(2));
      line.setAttribute("x2", x2.toFixed(2));
      line.setAttribute("y2", y2.toFixed(2));
      dot.setAttribute("cx", x1.toFixed(2));
      dot.setAttribute("cy", y1.toFixed(2));
    }

    for (const group of Array.from(svg.children)) {
      const key = group.dataset?.connectorKey;
      if (key && !used.has(key)) group.remove();
    }
  }

  function schedule() {
    if (rafId) return;
    rafId = requestAnimationFrame(refresh);
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const target = mutation.target;
      if (!(target instanceof Element)) {
        schedule();
        return;
      }
      if (target.closest(".floor-full-name-connectors")) continue;
      if (
        target.matches(".floor-full-name-label, .floor-seat-marker, .floor-table, .floor-stage") ||
        target.closest(".floor-full-name-label, .floor-table")
      ) {
        schedule();
        return;
      }
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