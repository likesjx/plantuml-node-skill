export class PumlSource extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; height: 100%; }
        .wrap { display: flex; flex-direction: column; height: 100%; }
        label { font: 600 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; color: #1f2937; margin-bottom: 8px; }
        textarea {
          flex: 1;
          width: 100%;
          resize: none;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 12px;
          font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
          background: #ffffff;
          color: #0f172a;
        }
      </style>
      <div class="wrap">
        <label>PlantUML Source</label>
        <textarea spellcheck="false"></textarea>
      </div>
    `;
    this.textarea = this.shadowRoot.querySelector("textarea");
  }

  connectedCallback() {
    this.textarea.addEventListener("input", () => {
      this.dispatchEvent(
        new CustomEvent("source-change", {
          bubbles: true,
          composed: true,
          detail: { source: this.textarea.value },
        })
      );
    });
  }

  set source(value) {
    if (this.textarea.value !== value) {
      this.textarea.value = value;
    }
  }
}

customElements.define("puml-source", PumlSource);
