(async () => {
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

    document.open();
    document.write(html);
    document.close();
  } catch (error) {
    document.body.innerHTML = `<main style="font-family:system-ui;padding:2rem"><h1>Wedding Planner</h1><p>The application could not be loaded in this browser.</p><pre>${String(error)}</pre></main>`;
  }
})();
