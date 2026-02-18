export class PumlExport extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.svg = "";
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .wrap { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        button {
          border: 1px solid #16a34a;
          background: #f0fdf4;
          color: #166534;
          border-radius: 8px;
          font: 600 12px/1 ui-sans-serif, system-ui;
          padding: 8px 10px;
          cursor: pointer;
        }
        .hint { color: #64748b; font: 500 11px/1.2 ui-sans-serif, system-ui; }
      </style>
      <div class="wrap">
        <button id="downloadSvg">Download SVG</button>
        <button id="downloadPng">Download PNG</button>
        <span class="hint">Export static assets for GitHub Markdown.</span>
      </div>
    `;
  }

  connectedCallback() {
    this.shadowRoot.getElementById("downloadSvg").addEventListener("click", () => {
      if (!this.svg) return;
      const blob = new Blob([this.svg], { type: "image/svg+xml;charset=utf-8" });
      this.downloadBlob(blob, "diagram.svg");
    });

    this.shadowRoot.getElementById("downloadPng").addEventListener("click", async () => {
      if (!this.svg) return;
      const blob = await this.svgToPngBlob(this.svg);
      if (!blob) return;
      this.downloadBlob(blob, "diagram.png");
    });
  }

  set content(value) {
    this.svg = value || "";
  }

  downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 250);
  }

  async svgToPngBlob(svgText) {
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    try {
      const img = new Image();
      const load = new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      img.src = url;
      await load;

      const width = img.naturalWidth || 1200;
      const height = img.naturalHeight || 800;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0);

      return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

customElements.define("puml-export", PumlExport);
