const fs = require("fs");

const localRenderer = require("./local");
const remoteRenderer = require("./remote");

const DEFAULT_TIMEOUT_MS = 30000;
const STEP_LOG_FILE = "/tmp/plantuml-node-skill.log";

function writeStep(message, { verbose } = {}) {
  const line = `STEP: ${new Date().toISOString()} ${message}\n`;
  const shouldPersist = process.env.CI || process.env.PLANTUML_STEP_LOG === "1";

  if (verbose) {
    process.stderr.write(line);
  }

  if (shouldPersist) {
    try {
      fs.appendFileSync(STEP_LOG_FILE, line);
    } catch (_error) {
      // Non-fatal: step logging must not break rendering.
    }
  }
}

function normalizeOptions(options = {}) {
  const timeoutMs = Number.isFinite(options.timeoutMs)
    ? options.timeoutMs
    : DEFAULT_TIMEOUT_MS;

  return {
    format: options.format === "svg" ? "svg" : "png",
    forceRemote: Boolean(options.forceRemote),
    allowRemote: options.allowRemote !== false,
    remoteUrl: options.remoteUrl || null,
    timeoutMs,
    verbose: Boolean(options.verbose),
  };
}

function createRenderer(overrides = {}) {
  const local = overrides.localRenderer || localRenderer;
  const remote = overrides.remoteRenderer || remoteRenderer;

  return {
    async render(pumlText, rawOptions = {}) {
      const options = normalizeOptions(rawOptions);
      const renderLocal = options.format === "svg" ? local.renderPumlToSvg : local.renderPumlToPng;
      const renderRemote = options.format === "svg" ? remote.renderPumlToSvg : remote.renderPumlToPng;

      if (options.forceRemote) {
        if (!options.remoteUrl) {
          throw new Error("--force-remote requires --server or PLANTUML_REMOTE_URL.");
        }

        writeStep("remote.forced", options);
        const buffer = await renderRemote({
          pumlText,
          server: options.remoteUrl,
          timeoutMs: options.timeoutMs,
        });

        return { buffer, mode: "remote" };
      }

      if (await local.isAvailable()) {
        try {
          writeStep("local.render.start", options);
          const buffer = await renderLocal({ pumlText, timeoutMs: options.timeoutMs });
          writeStep("local.render.success", options);
          return { buffer, mode: "local" };
        } catch (error) {
          writeStep(`local.render.error ${error.message}`, options);

          if (!options.allowRemote || !options.remoteUrl) {
            throw new Error(
              `Local render failed and remote fallback is unavailable: ${error.message}`
            );
          }
        }
      }

      if (!options.allowRemote || !options.remoteUrl) {
        throw new Error(
          "No local renderer available and no remote URL configured. Set --server (or PLANTUML_REMOTE_URL), or install a local renderer."
        );
      }

      writeStep("remote.render.start", options);
      const buffer = await renderRemote({
        pumlText,
        server: options.remoteUrl,
        timeoutMs: options.timeoutMs,
      });
      writeStep("remote.render.success", options);

      return { buffer, mode: "remote" };
    },

    async isLocalAvailable() {
      return local.isAvailable();
    },
  };
}

module.exports = {
  createRenderer,
  DEFAULT_TIMEOUT_MS,
};
