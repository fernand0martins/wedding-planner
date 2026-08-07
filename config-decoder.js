(() => {
  const originalJson = Response.prototype.json;

  Response.prototype.json = async function (...args) {
    const parsed = await originalJson.apply(this, args);

    if (
      !parsed ||
      parsed.schema !== "wedding-seating-planner-config-manifest" ||
      parsed.encoding !== "gzip-base64" ||
      typeof parsed.data !== "string"
    ) {
      return parsed;
    }

    const bytes = Uint8Array.from(atob(parsed.data), (character) =>
      character.charCodeAt(0),
    );
    const stream = new Blob([bytes])
      .stream()
      .pipeThrough(new DecompressionStream("gzip"));
    const text = await new Response(stream).text();
    return JSON.parse(text);
  };
})();
