export class PumlPreview extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; height: 100%; }
        .wrap { display: flex; flex-direction: column; height: 100%; }
        .title { font: 600 12px/1.2 ui-sans-serif, system-ui; color: #1f2937; margin-bottom: 8px; }
        .canvas {
          flex: 1;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          overflow: auto;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          padding: 12px;
        }
        .canvas svg { max-width: 100%; height: auto; display: block; }
      </style>
      <div class="wrap">
        <div class="title">Live Preview</div>
        <div class="canvas"></div>
      </div>
    `;
    this.canvas = this.shadowRoot.querySelector(".canvas");
  }

  set svg(value) {
    this.canvas.innerHTML = value || "";
  }
}

customElements.define("puml-preview", PumlPreview);
