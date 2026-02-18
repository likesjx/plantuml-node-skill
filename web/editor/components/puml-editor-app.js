import { createDefaultModel, modelToSvg, parseSequencePuml, stringifySequenceModel } from "../core/sequence.js";
import "./puml-source.js";
import "./puml-preview.js";
import "./puml-canvas.js";
import "./puml-export.js";

export class PumlEditorApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.model = createDefaultModel();
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; height: 100vh; }
        .layout {
          display: grid;
          grid-template-columns: 1.1fr 1fr 1fr;
          gap: 12px;
          height: 100%;
          padding: 12px;
          box-sizing: border-box;
          background: radial-gradient(circle at 20% 0%, #ecfeff 0%, #f8fafc 48%);
        }
        .card {
          background: #ffffff;
          border: 1px solid #dbeafe;
          border-radius: 14px;
          min-height: 0;
          padding: 10px;
        }
        .preview-card {
          display: grid;
          grid-template-rows: auto 1fr;
          gap: 10px;
          min-height: 0;
        }
        @media (max-width: 1180px) {
          .layout { grid-template-columns: 1fr; grid-template-rows: minmax(260px, 1fr) minmax(260px, 1fr) minmax(260px, 1fr); }
        }
      </style>
      <div class="layout">
        <div class="card"><puml-canvas></puml-canvas></div>
        <div class="card"><puml-source></puml-source></div>
        <div class="card preview-card">
          <puml-export></puml-export>
          <puml-preview></puml-preview>
        </div>
      </div>
    `;

    this.canvas = this.shadowRoot.querySelector("puml-canvas");
    this.source = this.shadowRoot.querySelector("puml-source");
    this.preview = this.shadowRoot.querySelector("puml-preview");
    this.exporter = this.shadowRoot.querySelector("puml-export");
  }

  connectedCallback() {
    this.canvas.addEventListener("model-change", (event) => {
      this.model = event.detail.model;
      this.refreshFromModel();
    });

    this.source.addEventListener("source-change", (event) => {
      try {
        const parsed = parseSequencePuml(event.detail.source);
        this.model = parsed;
        this.refreshFromModel();
      } catch (_error) {
        // Keep previous valid model while typing unsupported/incomplete source.
      }
    });

    this.refreshFromModel();
  }

  refreshFromModel() {
    const svg = modelToSvg(this.model);
    this.canvas.data = this.model;
    this.source.source = stringifySequenceModel(this.model);
    this.preview.svg = svg;
    this.exporter.content = svg;
  }
}

customElements.define("puml-editor-app", PumlEditorApp);
