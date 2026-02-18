function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export class PumlCanvas extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.model = { participants: [], messages: [] };
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; height: 100%; }
        .wrap { display: flex; flex-direction: column; height: 100%; }
        .head { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
        .title { font: 600 12px/1.2 ui-sans-serif, system-ui; color: #1f2937; flex: 1; }
        button {
          border: 1px solid #0ea5e9;
          background: #e0f2fe;
          color: #075985;
          border-radius: 8px;
          font: 600 12px/1 ui-sans-serif, system-ui;
          padding: 8px 10px;
          cursor: pointer;
        }
        .panel {
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          background: #fff;
          padding: 10px;
          overflow: auto;
          flex: 1;
        }
        .sub { font: 600 11px/1.2 ui-sans-serif, system-ui; color: #475569; margin: 6px 0; }
        .chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
        .chip { border: 1px solid #bae6fd; background: #f0f9ff; color: #0c4a6e; border-radius: 20px; padding: 4px 8px; font: 500 11px/1 ui-sans-serif, system-ui; }
        .msg { display: grid; grid-template-columns: 1fr 78px 1fr 2fr auto; gap: 6px; margin-bottom: 8px; }
        select,input {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font: 12px/1.2 ui-sans-serif, system-ui;
          padding: 6px;
        }
        .danger { border-color: #fecaca; background: #fff1f2; color: #be123c; }
      </style>
      <div class="wrap">
        <div class="head">
          <div class="title">WYSIWYG Canvas (Sequence MVP)</div>
          <button id="addParticipant">+ Participant</button>
          <button id="addMessage">+ Message</button>
        </div>
        <div class="panel">
          <div class="sub">Participants</div>
          <div class="chips" id="chips"></div>
          <div class="sub">Messages</div>
          <div id="messages"></div>
        </div>
      </div>
    `;
  }

  connectedCallback() {
    this.shadowRoot.getElementById("addParticipant").addEventListener("click", () => {
      const name = `Actor ${this.model.participants.length + 1}`;
      const id = `actor_${Date.now()}`;
      this.model.participants.push({ id, name });
      this.emit();
    });

    this.shadowRoot.getElementById("addMessage").addEventListener("click", () => {
      if (this.model.participants.length < 2) return;
      this.model.messages.push({
        id: `m_${Date.now()}`,
        from: this.model.participants[0].id,
        to: this.model.participants[1].id,
        arrow: "->",
        text: "message",
      });
      this.emit();
    });
  }

  set data(model) {
    this.model = structuredClone(model);
    this.render();
  }

  render() {
    const chips = this.shadowRoot.getElementById("chips");
    chips.innerHTML = this.model.participants.map((p) => `<span class="chip">${esc(p.name)}</span>`).join("");

    const participantOptions = this.model.participants
      .map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`)
      .join("");

    const messages = this.shadowRoot.getElementById("messages");
    messages.innerHTML = this.model.messages
      .map(
        (m, idx) => `
      <div class="msg" data-id="${esc(m.id)}">
        <select data-field="from">${participantOptions}</select>
        <select data-field="arrow">
          <option value="->">-></option>
          <option value="-->">--></option>
        </select>
        <select data-field="to">${participantOptions}</select>
        <input data-field="text" value="${esc(m.text)}" />
        <button class="danger" data-delete="${idx}">X</button>
      </div>`
      )
      .join("");

    this.model.messages.forEach((message) => {
      const row = messages.querySelector(`[data-id="${message.id}"]`);
      if (!row) return;
      row.querySelector('[data-field="from"]').value = message.from;
      row.querySelector('[data-field="to"]').value = message.to;
      row.querySelector('[data-field="arrow"]').value = message.arrow === "-->" ? "-->" : "->";
    });

    messages.querySelectorAll("select,input").forEach((el) => {
      el.addEventListener("change", (event) => this.onEdit(event));
      el.addEventListener("input", (event) => this.onEdit(event));
    });

    messages.querySelectorAll("button[data-delete]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-delete"));
        this.model.messages.splice(idx, 1);
        this.emit();
      });
    });
  }

  onEdit(event) {
    const row = event.target.closest(".msg");
    if (!row) return;
    const id = row.getAttribute("data-id");
    const field = event.target.getAttribute("data-field");
    const message = this.model.messages.find((m) => m.id === id);
    if (!message || !field) return;
    message[field] = event.target.value;
    this.emit();
  }

  emit() {
    this.render();
    this.dispatchEvent(
      new CustomEvent("model-change", {
        bubbles: true,
        composed: true,
        detail: { model: structuredClone(this.model) },
      })
    );
  }
}

customElements.define("puml-canvas", PumlCanvas);
