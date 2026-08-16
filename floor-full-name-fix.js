(() => {
  const originalResponseText = Response.prototype.text;

  const styles = `
<style id="floorFullNameReadabilityFix">
  html.floor-full-names .floor-seat-marker[data-floor-full-name] {
    position: relative !important;
    width: 23px !important;
    min-width: 23px !important;
    max-width: 23px !important;
    height: 23px !important;
    padding: 0 !important;
    border-radius: 50% !important;
    overflow: visible !important;
    text-overflow: clip !important;
    white-space: nowrap !important;
    font-size: 0 !important;
    line-height: 23px !important;
    z-index: 20 !important;
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

  html.floor-full-names .floor-seat-marker[data-floor-full-name]::after {
    content: attr(data-floor-full-name);
    position: absolute;
    width: max-content;
    max-width: 150px;
    padding: 2px 4px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.94);
    color: #182333;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 10px;
    font-weight: 700;
    line-height: 1.15;
    white-space: nowrap;
    overflow: visible;
    text-overflow: unset;
    text-align: center;
    pointer-events: none;
    z-index: 50;
    box-shadow: 0 1px 3px rgba(17, 24, 39, 0.14);
  }

  html.floor-full-names .floor-seat-marker[data-floor-label-side="top"]::after {
    left: 50%;
    bottom: calc(100% + 7px);
    transform: translateX(-50%);
  }

  html.floor-full-names .floor-seat-marker[data-floor-label-side="bottom"]::after {
    left: 50%;
    top: calc(100% + 7px);
    transform: translateX(-50%);
  }

  html.floor-full-names .floor-seat-marker[data-floor-label-side="left"]::after {
    right: calc(100% + 7px);
    top: 50%;
    transform: translateY(-50%);
  }

  html.floor-full-names .floor-seat-marker[data-floor-label-side="right"]::after {
    left: calc(100% + 7px);
    top: 50%;
    transform: translateY(-50%);
  }

  html.floor-full-names .floor-stage,
  html.floor-full-names .floor-stage-shell,
  html.floor-full-names .floor-table,
  html.floor-full-names .floor-seat-anchor,
  html.floor-full-names .floor-seat-offset {
    overflow: visible !important;
  }

  html[data-pdf-export="true"].floor-full-names .floor-seat-marker[data-floor-full-name]::after {
    background: #fff;
    box-shadow: none;
  }
</style>`;

  const script = `
<script id="floorFullNamePositionScript">
(() => {
  let scheduled = false;

  function classifyMarker(marker) {
    const table = marker.closest(".floor-table");
    if (!table || !marker.dataset.floorFullName) return;

    const markerRect = marker.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();
    if (!markerRect.width || !markerRect.height || !tableRect.width || !tableRect.height) return;

    const mx = markerRect.left + markerRect.width / 2;
    const my = markerRect.top + markerRect.height / 2;
    const tx = tableRect.left + tableRect.width / 2;
    const ty = tableRect.top + tableRect.height / 2;

    const dx = mx - tx;
    const dy = my - ty;
    const nx = Math.abs(dx) / Math.max(tableRect.width / 2, 1);
    const ny = Math.abs(dy) / Math.max(tableRect.height / 2, 1);

    let side;
    if (ny >= nx) side = dy < 0 ? "top" : "bottom";
    else side = dx < 0 ? "left" : "right";

    marker.dataset.floorLabelSide = side;
  }

  function refresh() {
    scheduled = false;
    document.querySelectorAll(".floor-seat-marker[data-floor-full-name]").forEach(classifyMarker);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(refresh);
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "data-floor-full-name"],
  });

  window.addEventListener("resize", schedule);
  document.addEventListener("click", () => setTimeout(schedule, 30), true);

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

    if (!html.includes('id="floorFullNameReadabilityFix"')) {
      html = html.replace(/<\/head>/i, styles + "\n</head>");
    }
    if (!html.includes('id="floorFullNamePositionScript"')) {
      html = html.replace(/<\/body>/i, script + "\n</body>");
    }
    return html;
  }

  Response.prototype.text = async function (...args) {
    const text = await originalResponseText.apply(this, args);
    return inject(text);
  };
})();