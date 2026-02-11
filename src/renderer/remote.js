const fetch = require("node-fetch");

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, timer };
}

async function renderPumlRemote({ pumlText, format, server, timeoutMs }) {
  if (!server) {
    throw new Error("Remote renderer URL is not configured. Set --server or PLANTUML_REMOTE_URL.");
  }

  const base = server.replace(/\/+$/, "");
  const url = `${base}/plantuml/${format}`;
  const { controller, timer } = withTimeout(timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      body: pumlText,
      headers: { "Content-Type": "text/plain" },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Remote render failed (${response.status}): ${body.slice(0, 400)}`);
    }

    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Remote render timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  async isAvailable({ server }) {
    return Boolean(server);
  },

  async renderPumlToPng({ pumlText, server, timeoutMs }) {
    return renderPumlRemote({ pumlText, format: "png", server, timeoutMs });
  },

  async renderPumlToSvg({ pumlText, server, timeoutMs }) {
    return renderPumlRemote({ pumlText, format: "svg", server, timeoutMs });
  },
};
