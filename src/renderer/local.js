module.exports = {
  async isAvailable() {
    return false;
  },

  async renderPumlToPng() {
    throw new Error(
      "Local renderer unavailable: this build does not include a local PlantUML engine. Configure --server (or PLANTUML_REMOTE_URL) for remote rendering."
    );
  },

  async renderPumlToSvg() {
    throw new Error(
      "Local renderer unavailable: this build does not include a local PlantUML engine. Configure --server (or PLANTUML_REMOTE_URL) for remote rendering."
    );
  },
};
