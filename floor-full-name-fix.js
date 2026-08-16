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
    left: 50%;
    top: -7px;
    width: max-content;
    max-width: 118px;
    min-width: 54px;
    padding: 3px 5px;
    border: 1px solid rgba(38, 53, 74, 0.28);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.96);
    color: #182333;
    box-shadow: 0 1px 4px rgba(17, 24, 39, 0.16);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 8px;
    font-weight: 700;
    line-height: 1.15;
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
    text-align: left;
    transform: translate(9px, -100%) rotate(-38deg);
    transform-origin: left bottom;
    pointer-events: none;
    z-index: 50;
  }

  html.floor-full-names .floor-seat-anchor:nth-child(even) .floor-seat-marker[data-floor-full-name]::after,
  html.floor-full-names .floor-seat-offset:nth-child(even) .floor-seat-marker[data-floor-full-name]::after {
    transform: translate(9px, -100%) rotate(-52deg);
  }

  html.floor-full-names .floor-stage,
  html.floor-full-names .floor-stage-shell,
  html.floor-full-names .floor-table,
  html.floor-full-names .floor-seat-anchor,
  html.floor-full-names .floor-seat-offset {
    overflow: visible !important;
  }

  @media (min-width: 1100px) {
    html.floor-full-names .floor-seat-marker[data-floor-full-name]::after {
      max-width: 135px;
      font-size: 9px;
    }
  }

  html[data-pdf-export="true"].floor-full-names .floor-seat-marker[data-floor-full-name]::after {
    background: #fff;
    box-shadow: none;
    border-color: rgba(38, 53, 74, 0.38);
  }
</style>`;

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
    return html;
  }

  Response.prototype.text = async function (...args) {
    const text = await originalResponseText.apply(this, args);
    return inject(text);
  };
})();