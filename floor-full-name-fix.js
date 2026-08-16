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
  }

  .floor-full-name-label {
    position: absolute;
    display: none;
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
  }

  html.floor-full-names .floor-full-name-label {
    display: block;
  }

  .floor-full-name-label[data-side="top"] {
    transform: translate(-50%, -100%);
  }

  .floor-full-name-label[data-side="bottom"] {
    transform: translate(-50%, 0);
  }

  .floor-full-name-label[data-side="left"] {
    transform: translate(-100%, -50%);
  }

  .floor-full-name-label[data-side="right"] {
    transform: translate(0, -50%);
  }

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
  let scheduled = false;

  function normalize(value) {
    return String(value || "").replace(/\\s+/g, " ").trim();
  }

  function guestNameOnly(value) {
    let text = normalize(value);
    if (!text) return "";

    text = text.replace(
      /,\\s*(?:head|foot|left\\s*\\d+|right\\s*\\d+)\\s*,\\s*table\\s*\\d+.*$/i,
      "",
    );
    text = text.replace(/,\\s*table\\s*\\d+.*$/i, "");
    text = text.replace(
      /\\s*[·|]\\s*(?:head|foot|left\\s*\\d+|right\\s*\\d+)(?:\\s*[·|,]\\s*table\\s*\\d+)?$/i,
      "",
    );

    return normalize(text);
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
    return !(
      a.right + padding <= b.left ||
      b.right + padding <= a.left ||
      a.bottom + padding <= b.top ||
      b.bottom + padding <= a.top
    );
  }

  function resolveCollisions(labels) {
    const placed = [];

    for (const label of labels) {
      const side = label.dataset.side;
      const horizontal = side === "top" || side === "bottom";
      const direction = side === "top" || side === "left" ? -1 : 1;
      let attempts = 0;

      while (attempts < 18) {
        const rect = label.getBoundingClientRect();
        const collision = placed.find((item) => overlap(rect, item.rect));
        if (!collision) break;

        const step = 13 + Math.floor(attempts / 3) * 3;
        const lane = Math.floor(attempts / 2) + 1;
        const alternating = attempts % 2 === 0 ? 1 : -1;

        if (horizontal) {
          const currentLeft = parseFloat(label.style.left) || 0;
          label.style.left = currentLeft + alternating * lane * step + "px";
        } else {
          const currentTop = parseFloat(label.style.top) || 0;
          label.style.top = currentTop + alternating * lane * step + "px";
        }

        if (attempts >= 8) {
          if (horizontal) {
            const currentTop = parseFloat(label.style.top) || 0;
            label.style.top = currentTop + direction * 15 + "px";
          } else {
            const currentLeft = parseFloat(label.style.left) || 0;
            label.style.left = currentLeft + direction * 15 + "px";
          }
        }

        attempts += 1;
      }

      placed.push({ label, rect: label.getBoundingClientRect() });
    }
  }

  function refresh() {
    scheduled = false;

    const stage = document.querySelector(".floor-stage");
    if (!stage) return;

    const overlay = ensureOverlay(stage);
    overlay.replaceChildren();

    if (!document.documentElement.classList.contains("floor-full-names")) return;

    const stageRect = stage.getBoundingClientRect();
    const scaleX = stageRect.width / Math.max(stage.offsetWidth, 1);
    const scaleY = stageRect.height / Math.max(stage.offsetHeight, 1);
    const labels = [];

    const markers = stage.querySelectorAll(".floor-seat-marker");
    for (const marker of markers) {
      const name = getName(marker);
      if (!name) continue;

      const table = marker.closest(".floor-table");
      if (!table) continue;

      const markerRect = marker.getBoundingClientRect();
      const tableRect = table.getBoundingClientRect();
      if (!markerRect.width || !markerRect.height) continue;

      const side = sideFor(markerRect, tableRect);
      const centerX = (markerRect.left + markerRect.width / 2 - stageRect.left) / scaleX;
      const centerY = (markerRect.top + markerRect.height / 2 - stageRect.top) / scaleY;
      const gapX = (markerRect.width / 2 + 8) / scaleX;
      const gapY = (markerRect.height / 2 + 8) / scaleY;

      const label = document.createElement("div");
      label.className = "floor-full-name-label";
      label.dataset.side = side;
      label.textContent = name;

      if (side === "top") {
        label.style.left = centerX + "px";
        label.style.top = centerY - gapY + "px";
      } else if (side === "bottom") {
        label.style.left = centerX + "px";
        label.style.top = centerY + gapY + "px";
      } else if (side === "left") {
        label.style.left = centerX - gapX + "px";
        label.style.top = centerY + "px";
      } else {
        label.style.left = centerX + gapX + "px";
        label.style.top = centerY + "px";
      }

      overlay.appendChild(label);
      labels.push(label);
    }

    requestAnimationFrame(() => resolveCollisions(labels));
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => requestAnimationFrame(refresh));
  }

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) =>
      mutation.target.closest?.(".floor-full-name-overlay") ||
      (mutation.target.classList && mutation.target.classList.contains("floor-full-name-overlay"))
    )) return;
    schedule();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "data-floor-full-name"],
  });

  window.addEventListener("resize", schedule);
  document.addEventListener("click", () => setTimeout(schedule, 25), true);
  document.addEventListener("pointerup", () => setTimeout(schedule, 25), true);
  document.addEventListener("change", () => setTimeout(schedule, 25), true);

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