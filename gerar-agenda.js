// Monta o agenda.ics a partir do evento.js.  Uso:  node gerar-agenda.js
// O arquivo fica estático no site: o iPhone abre direto no Calendário, e no Android abre no app de agenda escolhido.
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "evento.js"), "utf8");
const EVENTO = new Function(`${src}; return EVENTO;`)();

const ini = new Date(EVENTO.inicio);
const fim = new Date(ini.getTime() + EVENTO.duracaoMin * 60000);
const utc = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);

// a regra do formato: no máximo 75 bytes por linha; o resto continua na linha de baixo, começando com espaço
function dobrar(linha) {
  const partes = [];
  let atual = "";
  for (const ch of linha) {
    const limite = partes.length === 0 ? 75 : 74;
    if (Buffer.byteLength(atual + ch, "utf8") > limite) { partes.push(atual); atual = ""; }
    atual += ch;
  }
  partes.push(atual);
  return partes.join("\r\n ");
}

const link = EVENTO.linkTeams;
const linhas = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//Enabley//Webinar//PT-BR",
  "CALSCALE:GREGORIAN",
  "METHOD:PUBLISH",
  "BEGIN:VEVENT",
  `UID:webinar-${utc(ini)}@enabley.io`,
  `DTSTAMP:${utc(new Date())}`,
  `DTSTART:${utc(ini)}`,
  `DTEND:${utc(fim)}`,
  `SUMMARY:${esc(`Webinar: ${EVENTO.titulo}`)}`,
  `LOCATION:${esc(`Microsoft Teams: ${link}`)}`,
  `URL:${link}`,
  `DESCRIPTION:${esc(`Para entrar no webinar pelo Microsoft Teams, toque no link:\n${link}`)}`,
  `X-MICROSOFT-SKYPETEAMSMEETINGURL:${link}`,
  "BEGIN:VALARM",
  "TRIGGER:-PT15M",
  "ACTION:DISPLAY",
  "DESCRIPTION:O webinar começa em 15 minutos",
  "END:VALARM",
  "END:VEVENT",
  "END:VCALENDAR",
];

const saida = path.join(__dirname, EVENTO.arquivoAgenda);
fs.writeFileSync(saida, linhas.map(dobrar).join("\r\n") + "\r\n", "utf8");
console.log(`ok: ${saida}`);
if (link.includes("COLE-AQUI")) console.warn("atenção: o link do Teams ainda é o provisório (evento.js > linkTeams)");
