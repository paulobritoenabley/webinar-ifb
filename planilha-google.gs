/* Inscrição no webinar · IFB × Enabley — o "backend", dentro de uma planilha do Google.
 *
 * Onde colar: na planilha, Extensões > Apps Script. Apague o que estiver lá e cole este arquivo inteiro.
 * Senha do painel: Configurações do projeto (engrenagem) > Propriedades do script > SENHA_PAINEL.
 * Publicar: Implantar > Nova implantação > App da Web, executar como "Eu", acesso "Qualquer pessoa".
 * O endereço que terminar em /exec vai no planilha.js da página.
 *
 * Recebe da página:
 *   inscricao  → uma linha na aba "Inscrições"
 *   clique     → uma linha na aba "Cliques" (abriu-agenda, escolheu-app, copiou-link)
 *   painel     → devolve as duas abas, só com a senha certa
 */

const ABA_INSCRICOES = "Inscrições";
const ABA_CLIQUES = "Cliques";
const COLUNAS_INSCRICAO = ["inscritoEm", "nome", "cargo", "empresa", "email", "whatsapp", "whatsappInternacional", "origem", "utm", "webinar", "id"];
const COLUNAS_CLIQUE = ["em", "id", "acao", "app"];
const ACOES = ["abriu-agenda", "escolheu-app", "copiou-link"];
const APPS = ["", "apple", "google", "outlook", "outro"];

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (_) { return responder({ ok: false, erro: "formato" }); }

  if (d.tipo === "painel") {
    const senha = PropertiesService.getScriptProperties().getProperty("SENHA_PAINEL");
    if (!senha || d.senha !== senha) return responder({ ok: false, erro: "senha" });
    return responder({ ok: true, inscricoes: ler(ABA_INSCRICOES), cliques: ler(ABA_CLIQUES) });
  }

  // uma escrita por vez, para duas inscrições ao mesmo tempo não caírem na mesma linha
  const trava = LockService.getScriptLock();
  trava.waitLock(10000);
  try {
    if (d.tipo === "inscricao") {
      if (!d.id || !d.nome || !d.email) return responder({ ok: false, erro: "campos" });
      d.utm = Object.keys(d.utm || {}).length ? JSON.stringify(d.utm) : "";
      anotar(ABA_INSCRICOES, COLUNAS_INSCRICAO, d);
    } else if (d.tipo === "clique" && d.id && ACOES.includes(d.acao) && APPS.includes(d.app || "")) {
      anotar(ABA_CLIQUES, COLUNAS_CLIQUE, d);
    } else {
      return responder({ ok: false, erro: "tipo" });
    }
  } finally {
    trava.releaseLock();
  }
  return responder({ ok: true });
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
