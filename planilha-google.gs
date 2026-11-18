/* Inscrição no webinar · IFB × Enabley — o "backend", dentro de uma planilha do Google.
 *
 * Onde colar: na planilha, Extensões > Apps Script. Apague o que estiver lá e cole este arquivo inteiro.
 * Senha do painel: Configurações do projeto (engrenagem) > Propriedades do script > SENHA_PAINEL.
 * Publicar: Implantar > Nova implantação > App da Web, executar como "Eu", acesso "Qualquer pessoa".
 * O endereço que terminar em /exec vai no planilha.js da página.
 * Antes da primeira publicação com convite: escolha "prepararAgenda" ao lado de Depuração, clique em Executar
 * e autorize o acesso à agenda. Isso cria a agenda "Webinar IFB × Enabley", de onde saem os convites.
 * Em Serviços (+ no editor), adicione "Google Calendar API": é ele que tira o Google Meet do convite.
 *
 * Recebe da página:
 *   inscricao  → uma linha na aba "Inscrições" e um convite de agenda para o e-mail, com o link do Teams
 *   parcial    → a aba "Não concluíram": uma linha por pessoa, atualizada a cada etapa que ela vence;
 *                some quando a mesma pessoa conclui a inscrição
 *   clique     → uma linha na aba "Cliques" (abriu-agenda, escolheu-app, copiou-link)
 *   painel     → devolve as três abas, só com a senha certa
 */

const ABA_INSCRICOES = "Inscrições";
const ABA_PARCIAIS = "Não concluíram";
const ABA_CLIQUES = "Cliques";
const COLUNAS_INSCRICAO = ["inscritoEm", "nome", "cargo", "empresa", "email", "whatsapp", "whatsappInternacional", "origem", "utm", "webinar", "id"];
const COLUNAS_PARCIAL = ["em", "nome", "cargo", "empresa", "email", "whatsapp", "parouEm", "origem", "utm", "id"];
const COLUNAS_CLIQUE = ["em", "id", "acao", "app"];
const ETAPAS = ["nome", "cargo", "empresa", "email", "whatsapp"];
const ACOES = ["abriu-agenda", "escolheu-app", "copiou-link"];
const APPS = ["", "apple", "google", "outlook", "outro"];

// o convite usa só estes dados fixos (nada vem da página), para ninguém mandar outro texto em nome da Enabley.
// Mudou o link ou o horário? Troque aqui e no evento.js da página.
const EVENTO = {
  titulo: "Webinar: Como aumentar a eficiência do seu onboarding e o seu ROI",
  inicio: "2026-11-27T10:00:00-03:00",
  duracaoMin: 60,
  linkTeams: "https://teams.microsoft.com/meet/3432261999992135?p=HTwgj74uhz8xvmEBtq",
};
const NOME_AGENDA = "Webinar IFB × Enabley";

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (_) { return responder({ ok: false, erro: "formato" }); }

  if (d.tipo === "painel") {
    const senha = PropertiesService.getScriptProperties().getProperty("SENHA_PAINEL");
    if (!senha || d.senha !== senha) return responder({ ok: false, erro: "senha" });
    return responder({ ok: true, inscricoes: ler(ABA_INSCRICOES), parciais: ler(ABA_PARCIAIS), cliques: ler(ABA_CLIQUES) });
  }

  // uma escrita por vez, para duas inscrições ao mesmo tempo não caírem na mesma linha
  const trava = LockService.getScriptLock();
  trava.waitLock(10000);
  let convidar = "";
  try {
    if (d.tipo === "inscricao") {
      if (!d.id || !d.nome || !d.email) return responder({ ok: false, erro: "campos" });
      // um convite por e-mail: quem se inscreve de novo não recebe outro
      if (!acharLinha(ABA_INSCRICOES, COLUNAS_INSCRICAO, d.email, "email")) convidar = d.email;
      d.utm = Object.keys(d.utm || {}).length ? JSON.stringify(d.utm) : "";
      anotar(ABA_INSCRICOES, COLUNAS_INSCRICAO, d);
      const linha = acharLinha(ABA_PARCIAIS, COLUNAS_PARCIAL, d.id);
      if (linha) aba(ABA_PARCIAIS, COLUNAS_PARCIAL).deleteRow(linha);
    } else if (d.tipo === "parcial" && d.id && d.nome && ETAPAS.includes(d.parouEm)) {
      // quem já concluiu não volta para a lista (uma parcial atrasada pode chegar depois da inscrição)
      if (acharLinha(ABA_INSCRICOES, COLUNAS_INSCRICAO, d.id)) return responder({ ok: true });
      d.utm = Object.keys(d.utm || {}).length ? JSON.stringify(d.utm) : "";
      const valores = COLUNAS_PARCIAL.map((c) => limpar(d[c]));
      const a = aba(ABA_PARCIAIS, COLUNAS_PARCIAL);
      const linha = acharLinha(ABA_PARCIAIS, COLUNAS_PARCIAL, d.id);
      if (linha) a.getRange(linha, 1, 1, valores.length).setValues([valores]);
      else a.appendRow(valores);
    } else if (d.tipo === "clique" && d.id && ACOES.includes(d.acao) && APPS.includes(d.app || "")) {
      anotar(ABA_CLIQUES, COLUNAS_CLIQUE, d);
    } else {
      return responder({ ok: false, erro: "tipo" });
    }
  } finally {
    trava.releaseLock();
  }
  // fora da trava; se o convite falhar, a inscrição já está salva e a página segue normalmente
  if (convidar) {
    try { mandarConvite(convidar); } catch (erro) { console.error("convite não enviado", convidar, erro); }
  }
  return responder({ ok: true });
}

// um evento por pessoa, na agenda própria do webinar: cada um recebe o seu convite e ninguém vê os outros inscritos.
// A conta põe Google Meet sozinha em todo evento novo; por isso o evento nasce sem convidado, o Meet sai,
// e só então a pessoa entra e recebe o convite, apenas com o link do Teams.
// Usa o serviço avançado "Google Calendar API" (Serviços > + no editor).
function mandarConvite(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  const inicio = new Date(EVENTO.inicio);
  const fim = new Date(inicio.getTime() + EVENTO.duracaoMin * 60000);
  const agenda = agendaDoWebinar();
  const evento = agenda.createEvent(EVENTO.titulo, inicio, fim, {
    description: `Para entrar no webinar pelo Microsoft Teams, clique no link:\n${EVENTO.linkTeams}`,
    location: EVENTO.linkTeams,
  });
  const id = evento.getId().replace(/@google\.com$/, "");
  Calendar.Events.patch({ conferenceData: null }, agenda.getId(), id, { conferenceDataVersion: 1, sendUpdates: "none" });
  Calendar.Events.patch(
    { attendees: [{ email }], guestsCanSeeOtherGuests: false, guestsCanInviteOthers: false },
    agenda.getId(), id, { sendUpdates: "all" },
  );
}

function agendaDoWebinar() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty("AGENDA_ID");
  const existente = id && CalendarApp.getCalendarById(id);
  if (existente) return existente;
  const nova = CalendarApp.createCalendar(NOME_AGENDA, { timeZone: "America/Sao_Paulo" });
  props.setProperty("AGENDA_ID", nova.getId());
  return nova;
}

// rodar uma vez pelo editor: pede a autorização da agenda e cria a agenda do webinar
function prepararAgenda() {
  console.log("Agenda pronta:", agendaDoWebinar().getName());
}

// abrir o endereço no navegador só confirma que está no ar
function doGet() {
  return responder({ ok: true, servico: "inscricao-webinar-ifb" });
}

function anotar(nomeAba, colunas, d) {
  aba(nomeAba, colunas).appendRow(colunas.map((c) => limpar(d[c])));
}

// cria a aba com o cabeçalho na primeira vez
function aba(nome, colunas) {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  let a = planilha.getSheetByName(nome);
  if (!a) {
    a = planilha.insertSheet(nome);
    a.appendRow(colunas);
    a.setFrozenRows(1);
    a.getRange(1, 1, 1, colunas.length).setFontWeight("bold");
  }
  return a;
}

// número da linha com esse valor na coluna pedida (o id, se nada for dito), ou 0
function acharLinha(nomeAba, colunas, valor, campo = "id") {
  const a = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nomeAba);
  if (!a || a.getLastRow() < 2) return 0;
  const coluna = colunas.indexOf(campo) + 1;
  const achado = a.getRange(2, coluna, a.getLastRow() - 1, 1).createTextFinder(String(valor)).matchEntireCell(true).matchCase(false).findNext();
  return achado ? achado.getRow() : 0;
}

function ler(nome) {
  const a = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome);
  if (!a || a.getLastRow() < 2) return [];
  const [cabecalho, ...linhas] = a.getDataRange().getValues();
  return linhas.map((l) => Object.fromEntries(cabecalho.map((c, i) => [c, l[i] instanceof Date ? l[i].toISOString() : l[i]])));
}

// texto curto, e nada que a planilha leia como fórmula (= + - @ no começo)
function limpar(v) {
  const t = v == null ? "" : String(v).slice(0, 300);
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
