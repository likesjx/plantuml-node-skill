const START = "@startuml";
const END = "@enduml";

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function idFromName(name) {
  return (
    normalizeName(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "node"
  );
}

function ensureParticipant(map, list, rawName) {
  const name = normalizeName(rawName);
  if (!name) {
    throw new Error("Participant name cannot be empty");
  }
  if (!map.has(name)) {
    map.set(name, { id: idFromName(name), name });
    list.push(map.get(name));
  }
  return map.get(name);
}

function parseSequencePuml(source) {
  const lines = source.split(/\r?\n/);
  const participants = [];
  const participantMap = new Map();
  const messages = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("'") || line === START || line === END) {
      continue;
    }

    const participantMatch = line.match(/^participant\s+(.+)$/i);
    if (participantMatch) {
      ensureParticipant(participantMap, participants, participantMatch[1]);
      continue;
    }

    const messageMatch = line.match(/^(.+?)\s*(--?>)\s*(.+?)\s*:\s*(.+)$/);
    if (messageMatch) {
      const from = ensureParticipant(participantMap, participants, messageMatch[1]);
      const to = ensureParticipant(participantMap, participants, messageMatch[3]);
      messages.push({
        id: `m_${messages.length + 1}`,
        from: from.id,
        to: to.id,
        arrow: messageMatch[2],
        text: messageMatch[4].trim(),
      });
      continue;
    }

    throw new Error(`Unsupported line in MVP parser: ${line}`);
  }

  return { participants, messages };
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function modelToSvg(model) {
  const laneWidth = 180;
  const top = 56;
  const headerHeight = 34;
  const rowHeight = 56;
  const rows = Math.max(model.messages.length, 1);
  const width = Math.max(model.participants.length, 1) * laneWidth + 80;
  const height = top + headerHeight + rows * rowHeight + 72;

  const defs = `
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
      <polygon points="0 0, 10 3.5, 0 7" fill="#0b1220" />
    </marker>
  </defs>`;

  const laneSvg = model.participants
    .map((participant, index) => {
      const x = 40 + index * laneWidth;
      const cx = x + laneWidth / 2;
      return `
      <g>
        <rect x="${x}" y="${top}" width="${laneWidth - 20}" height="${headerHeight}" rx="8" fill="#ecfeff" stroke="#0ea5e9" />
        <text x="${x + (laneWidth - 20) / 2}" y="${top + 22}" text-anchor="middle" fill="#082f49" font-size="13" font-weight="600">${esc(participant.name)}</text>
        <line x1="${cx}" y1="${top + headerHeight + 8}" x2="${cx}" y2="${height - 24}" stroke="#94a3b8" stroke-dasharray="6 5"/>
      </g>`;
    })
    .join("\n");

  const messageSvg = model.messages
    .map((message, idx) => {
      const fromIndex = model.participants.findIndex((p) => p.id === message.from);
      const toIndex = model.participants.findIndex((p) => p.id === message.to);
      if (fromIndex === -1 || toIndex === -1) return "";
      const y = top + headerHeight + 26 + idx * rowHeight;
      const fromX = 40 + fromIndex * laneWidth + laneWidth / 2;
      const toX = 40 + toIndex * laneWidth + laneWidth / 2;
      const labelX = (fromX + toX) / 2;
      const dashed = message.arrow === "-->" ? 'stroke-dasharray="6 4"' : "";
      const marker = 'marker-end="url(#arrowhead)"';
      return `
      <g>
        <line x1="${fromX}" y1="${y}" x2="${toX}" y2="${y}" stroke="#0b1220" stroke-width="1.8" ${dashed} ${marker}/>
        <text x="${labelX}" y="${y - 8}" text-anchor="middle" fill="#1e293b" font-size="12">${esc(message.text || "message")}</text>
      </g>`;
    })
    .join("\n");

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Sequence diagram">
  <rect width="100%" height="100%" fill="#f8fafc" rx="14" />
  ${defs}
  ${laneSvg}
  ${messageSvg}
</svg>`.trim();
}

module.exports = {
  parseSequencePuml,
  modelToSvg,
};
