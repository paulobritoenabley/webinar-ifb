"use strict";

/* Inscrição no webinar · IFB × Enabley
 * Boas-vindas, 5 perguntas (uma por tela), envio e agradecimento.
 * A inscrição e os cliques da agenda vão para a planilha do Google (endereço no planilha.js), que alimenta
 * o painel. Sem endereço, o envio é simulado e os dados ficam no navegador (localStorage), e o painel
 * aberto no mesmo navegador mostra esses dados de teste.
 */

// dados do webinar (título, data, link do Teams) ficam no evento.js; o endereço da planilha, no planilha.js
const CONFIG = {
  webinar: EVENTO,
  endpoint: PLANILHA.url,
  modoTeste: !PLANILHA.url,         // mostra no fim os dados que seriam enviados
  bloquearEmailPessoal: true,       // recusa Gmail, Hotmail e parecidos
  origemPadrao: "qr-deck-ifb",
};

// o painel lê estas mesmas chaves no modo de teste
const CHAVE_LOCAL = "inscricoes-webinar-ifb";
const CHAVE_CLIQUES = "inscricoes-webinar-ifb-cliques";
const CHAVE_PARCIAIS = "inscricoes-webinar-ifb-parciais";

/* ── regras de cada campo ─────────────────────────── */

const PARTICULAS = new Set(["da", "das", "de", "di", "do", "dos", "du", "e", "del", "della", "van", "von", "y"]);

// DDDs que existem no Brasil
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

const EMAIL_PESSOAL = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.com.br", "outlook.com", "outlook.com.br",
  "live.com", "live.com.br", "msn.com", "yahoo.com", "yahoo.com.br", "ymail.com", "rocketmail.com",
  "icloud.com", "me.com", "mac.com", "bol.com.br", "uol.com.br", "terra.com.br", "ig.com.br",
  "globomail.com", "zipmail.com.br", "aol.com", "protonmail.com", "proton.me", "gmx.com", "gmx.net",
  "mail.com", "yandex.com", "zoho.com", "tutanota.com",
]);

// finais que quase sempre são erro de digitação
const FINAL_ERRADO = /\.(con|cmo|comm|coom|vom|xom|cpm|om|con\.br|com\.bt|com\.rb|combr)$/;

const limpar = (v) => v.trim().replace(/\s+/g, " ");
const contar = (v, re) => (v.match(re) || []).length;

function validarNome(v) {
  const t = limpar(v);
  if (!t) return "Escreva seu nome e sobrenome.";
  const partes = t.toLocaleLowerCase("pt-BR").split(" ").filter((p) => !PARTICULAS.has(p));
  if (partes.length < 2) return "Falta o sobrenome.";
  if (partes.filter((p) => contar(p, /\p{L}/gu) >= 2).length < 2) return "Escreva o sobrenome completo, não só a inicial.";
  if (/(\p{L})\1\1/u.test(t.toLocaleLowerCase("pt-BR"))) return "Confira se o nome está certo.";
  return "";
}

function normalizarNome(v) {
  return limpar(v)
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((p, i) => (i > 0 && PARTICULAS.has(p)) ? p : p.replace(/(^|[-'’])(\p{L})/gu, (_, s, l) => s + l.toLocaleUpperCase("pt-BR")))
    .join(" ");
}

function validarCargo(v) {
  const t = limpar(v);
  if (!t) return "Escreva seu cargo.";
  if (contar(t, /\p{L}/gu) < 2) return "Escreva o cargo com letras.";
  if (/([\p{L}\p{N}])\1{3,}/u.test(t.toLocaleLowerCase("pt-BR"))) return "Confira se o cargo está certo.";
  return "";
}

function validarEmpresa(v) {
  const t = limpar(v);
  if (!t) return "Escreva o nome da empresa.";
  if (contar(t, /[\p{L}\p{N}]/gu) < 2) return "Confira o nome da empresa.";
  if (/([\p{L}\p{N}])\1{3,}/u.test(t.toLocaleLowerCase("pt-BR"))) return "Confira o nome da empresa.";
  return "";
}

function validarEmail(v) {
  const t = v.trim().toLowerCase();
  if (!t) return "Escreva seu e-mail.";
  const arrobas = contar(t, /@/g);
  if (arrobas === 0) return "Falta o @ no e-mail.";
  if (arrobas > 1) return "O e-mail tem mais de um @.";
  const [local, dominio] = t.split("@");
  if (!local) return "Falta a parte antes do @.";
  if (!/^[a-z0-9._%+-]{1,64}$/.test(local) || /^\.|\.$|\.\./.test(local)) return "Confira a parte antes do @.";
  if (!dominio) return "Falta o endereço depois do @.";
  if (!/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(dominio)) {
    return dominio.includes(".") ? "Confira o endereço depois do @." : "Falta o final do e-mail, como .com.br.";
  }
  if (FINAL_ERRADO.test(dominio)) return "O final do e-mail parece ter um erro de digitação.";
  if (CONFIG.bloquearEmailPessoal && EMAIL_PESSOAL.has(dominio)) return "Use o e-mail da empresa. Gmail, Hotmail e parecidos não valem aqui.";
  return "";
}

function validarWhatsapp(v) {
  const d = v.replace(/\D/g, "");
  if (!d) return "Escreva seu WhatsApp com DDD.";
  if (d.length < 11) return "Faltam números: são 2 do DDD e 9 do celular.";
  if (!DDDS.has(Number(d.slice(0, 2)))) return "Esse DDD não existe. Confira os 2 primeiros números.";
  if (d[2] !== "9") return "Celular começa com 9 depois do DDD.";
  if (/^(\d)\1+$/.test(d.slice(2))) return "Confira se o número está certo.";
  return "";
}

// DDD-NNNNN-NNNN, montado conforme a pessoa digita
function formatarTelefone(d) {
  if (d.length <= 2) return d;
  if (d.length <= 7) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

const primeiroNome = (nome) => (nome || "").split(" ")[0];

const PERGUNTAS = [
  {
    id: "nome",
    titulo: () => "Qual é o seu nome e sobrenome?",
    ajuda: "É assim que vamos te chamar no convite.",
    placeholder: "Ex.: Maria Souza",
    atributos: { type: "text", inputmode: "text", autocomplete: "name", autocapitalize: "words", maxlength: "80" },
    filtro: /[^\p{L}\s'’.-]/gu,
    avisoFiltro: "No nome vão só letras.",
    validar: validarNome,
    normalizar: normalizarNome,
  },
  {
    id: "cargo",
    titulo: (d) => `${primeiroNome(d.nome)}, qual é o seu cargo?`,
    ajuda: "O cargo que você ocupa hoje na empresa.",
    placeholder: "Ex.: Gerente de Treinamento",
    atributos: { type: "text", inputmode: "text", autocomplete: "organization-title", autocapitalize: "sentences", maxlength: "60" },
    filtro: /[^\p{L}\p{N}\s&.,'’()/+ºª°-]/gu,
    avisoFiltro: "Esse caractere não vale no cargo.",
    validar: validarCargo,
    normalizar: limpar,
  },
  {
    id: "empresa",
    titulo: () => "Em qual empresa você trabalha?",
    ajuda: "O nome da rede, da marca ou do grupo.",
    placeholder: "Ex.: Rede Sabor da Casa",
    atributos: { type: "text", inputmode: "text", autocomplete: "organization", autocapitalize: "words", maxlength: "80" },
    filtro: /[^\p{L}\p{N}\s&.,'’()/+!-]/gu,
    avisoFiltro: "Esse caractere não vale no nome da empresa.",
    validar: validarEmpresa,
    normalizar: limpar,
  },
  {
    id: "email",
    titulo: () => "Qual é o seu e-mail corporativo?",
    ajuda: "É para ele que vamos mandar o convite.",
    placeholder: "voce@suaempresa.com.br",
    atributos: { type: "text", inputmode: "email", autocomplete: "email", autocapitalize: "none", autocorrect: "off", spellcheck: "false", maxlength: "120" },
    minusculas: true,
    filtro: /[^a-z0-9@._%+-]/g,
    avisoFiltro: "E-mail não leva espaço nem acento.",
    validar: validarEmail,
    normalizar: (v) => v.trim().toLowerCase(),
  },
  {
    id: "whatsapp",
    titulo: () => "Por último, qual é o seu WhatsApp?",
    ajuda: "Com DDD. Vamos usar só para lembrar você do webinar.",
    placeholder: "11-91234-5678",
    prefixo: "+55",
    atributos: { type: "tel", inputmode: "numeric", autocomplete: "tel-national", autocorrect: "off" },
    mascara: true,
    avisoFiltro: "Aqui vão só números.",
    validar: validarWhatsapp,
    normalizar: (v) => formatarTelefone(v.replace(/\D/g, "")),
  },
];

/* ── estado ──────────────────────────────────────── */

const dados = {};
const tentou = {};
// o mesmo id liga as respostas parciais à inscrição completa
const sessao = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let registro = null;
let suspeito = false;
let inicioEm = 0;

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const telas = () => document.querySelectorAll(".tela");
const progresso = $("#progresso");

/* ── montagem das perguntas ──────────────────────── */

const ICONE_CERTO = '<svg class="certo" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICONE_SETA = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function montarPergunta(p, i) {
  const ultima = i === PERGUNTAS.length - 1;
  const form = document.createElement("form");
  form.className = "tela pergunta";
  form.id = `tela-${p.id}`;
  form.hidden = true;
  form.noValidate = true;
  form.autocomplete = "on";
  form.innerHTML = `
    <label class="pergunta-titulo" for="campo-${p.id}"></label>
    <p class="ajuda" id="ajuda-${p.id}"></p>
    <div class="campo${p.prefixo ? " tem-prefixo" : ""}">
      ${p.prefixo ? `<span class="prefixo" aria-hidden="true">${p.prefixo}</span>` : ""}
      <input id="campo-${p.id}" name="${p.id}" aria-describedby="ajuda-${p.id} erro-${p.id}" required>
      ${ICONE_CERTO}
    </div>
    <p class="erro" id="erro-${p.id}" aria-live="polite"></p>
    ${ultima ? `
      <p class="consentimento">Ao concluir, você concorda em receber o convite e os lembretes do webinar por e-mail e WhatsApp.</p>
      <div class="isca" aria-hidden="true"><label>Não preencha<input name="nao_preencher" tabindex="-1" autocomplete="off"></label></div>` : ""}
    <button class="botao" type="submit" aria-disabled="true">${ultima ? "Concluir inscrição" : "Continuar"} ${ICONE_SETA}</button>`;

  $(".ajuda", form).textContent = p.ajuda;
  const input = $("input", form);
  for (const [k, v] of Object.entries(p.atributos)) input.setAttribute(k, v);
  input.placeholder = p.placeholder;
  input.enterKeyHint = ultima ? "done" : "next";

  input.addEventListener("input", (ev) => {
    if (p.mascara) mascarar(input, ev, p); else filtrar(input, p);
    atualizar(p);
  });
  input.addEventListener("blur", () => {
    if (input.value.trim()) { tentou[p.id] = true; atualizar(p); }
  });
  form.addEventListener("submit", (ev) => { ev.preventDefault(); responder(p, i); });

  return form;
}

// tira o que não vale enquanto a pessoa digita, sem pular o cursor
function filtrar(input, p) {
  const v = input.value;
  const pos = input.selectionStart ?? v.length;
  const tratar = (s) => {
    let r = p.minusculas ? s.toLocaleLowerCase("pt-BR") : s;
    r = r.replace(p.filtro, "");
    return r.replace(/^\s+/, "").replace(/\s{2,}/g, " ");
  };
  const novo = tratar(v);
  if (novo === v) return;
  const tirouAlgo = (p.minusculas ? v.toLocaleLowerCase("pt-BR") : v).replace(p.filtro, "").length < v.length;
  input.value = novo;
  const c = Math.min(tratar(v.slice(0, pos)).length, novo.length);
  input.setSelectionRange(c, c);
  if (tirouAlgo) avisar(p, p.avisoFiltro);
}

function mascarar(input, ev, p) {
  const anterior = input.dataset.anterior || "";
  const bruto = input.value;
  const pos = input.selectionStart ?? bruto.length;
  let digitos = bruto.replace(/\D/g, "");
  let antes = bruto.slice(0, pos).replace(/\D/g, "").length;

  // apagou só um hífen: apaga também o número antes dele
  if (ev.inputType === "deleteContentBackward" && digitos === anterior.replace(/\D/g, "") && antes > 0) {
    digitos = digitos.slice(0, antes - 1) + digitos.slice(antes);
    antes -= 1;
  }
  // colou com +55 ou com 0 na frente do DDD
  if (digitos.length === 13 && digitos.startsWith("55")) { digitos = digitos.slice(2); antes = Math.max(0, antes - 2); }
  else if (digitos.length === 12 && digitos.startsWith("0")) { digitos = digitos.slice(1); antes = Math.max(0, antes - 1); }

  if (/[^\d\s()+-]/.test(bruto)) avisar(p, p.avisoFiltro);

  digitos = digitos.slice(0, 11);
  antes = Math.min(antes, digitos.length);
  const formatado = formatarTelefone(digitos);
  input.value = formatado;
  input.dataset.anterior = formatado;

  let i = 0;
  for (let n = 0; i < formatado.length && n < antes; i++) if (/\d/.test(formatado[i])) n++;
  if (document.activeElement === input) input.setSelectionRange(i, i);
}

function avisar(p, texto) {
  const erro = $(`#erro-${p.id}`);
  if (erro.textContent && !erro.classList.contains("aviso")) return;
  erro.textContent = texto;
  erro.classList.add("aviso");
  clearTimeout(erro._t);
  erro._t = setTimeout(() => { if (erro.classList.contains("aviso")) { erro.textContent = ""; erro.classList.remove("aviso"); } }, 2600);
}

function atualizar(p) {
  const form = $(`#tela-${p.id}`);
  const input = $("input", form);
  const msg = p.validar(input.value);
  const campo = $(".campo", form);
  campo.classList.toggle("valido", !msg);
  $(".botao", form).setAttribute("aria-disabled", String(Boolean(msg)));
  const mostrar = Boolean(msg) && Boolean(tentou[p.id]);
  campo.classList.toggle("com-erro", mostrar);
  input.setAttribute("aria-invalid", String(mostrar));
  const erro = $(`#erro-${p.id}`);
  if (mostrar) { erro.textContent = msg; erro.classList.remove("aviso"); }
  else if (!erro.classList.contains("aviso")) erro.textContent = "";
  return msg;
}

/* ── navegação ───────────────────────────────────── */

function mostrar(id, { volta = false } = {}) {
  let alvo = null;
  for (const t of telas()) {
    const esta = t.id === `tela-${id}`;
    t.hidden = !esta;
    if (esta) alvo = t;
  }
  alvo.classList.remove("entra", "entra-volta");
  void alvo.offsetWidth;
  alvo.classList.add(volta ? "entra-volta" : "entra");
  window.scrollTo(0, 0);

  const i = PERGUNTAS.findIndex((p) => p.id === id);
  progresso.hidden = i < 0;
  if (i >= 0) {
    const p = PERGUNTAS[i];
    $(".pergunta-titulo", alvo).textContent = p.titulo(dados);
    $("#barra").style.width = `${((i + 1) / PERGUNTAS.length) * 100}%`;
    $("#passo").textContent = `${i + 1} de ${PERGUNTAS.length}`;
    // foco na mesma volta do toque: assim o teclado do celular abre sozinho
    $("input", alvo).focus({ preventScroll: true });
  } else {
    const h1 = $("h1", alvo);
    if (h1) h1.focus({ preventScroll: true });
  }
}

function responder(p, i) {
  tentou[p.id] = true;
  const form = $(`#tela-${p.id}`);
  const input = $("input", form);
  if (atualizar(p)) {
    const campo = $(".campo", form);
    campo.classList.remove("treme");
    void campo.offsetWidth;
    campo.classList.add("treme");
    input.focus();
    return;
  }
  dados[p.id] = p.normalizar(input.value);
  input.value = dados[p.id];

  if (i < PERGUNTAS.length - 1) {
    salvarParcial(PERGUNTAS[i + 1].id);
    return mostrar(PERGUNTAS[i + 1].id);
  }
  concluir();
}

/* ── respostas parciais ──────────────────────────── */
// A cada etapa vencida, guarda até onde a pessoa chegou. Se ela não concluir, o painel mostra
// os dados para o time tentar contato. A inscrição completa apaga a parcial (mesmo id).

let ultimaParcial = "";

function salvarParcial(parouEm) {
  if (registro) return;
  const corpo = { id: sessao, parouEm, ...lerOrigem() };
  for (const p of PERGUNTAS) corpo[p.id] = dados[p.id] || "";
  const assinatura = JSON.stringify(corpo);
  if (assinatura === ultimaParcial) return;
  ultimaParcial = assinatura;
  enviar("parcial", corpo).catch(console.error);
}

// fechou a aba ou trocou de app no meio de uma pergunta: guarda também o que já está válido no campo
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "hidden" || registro) return;
  const p = PERGUNTAS.find((q) => !$(`#tela-${q.id}`).hidden);
  if (!p) return;
  const input = $(`#tela-${p.id} input`);
  if (!p.validar(input.value)) dados[p.id] = p.normalizar(input.value);
  if (dados.nome) salvarParcial(p.id);
});

$("#voltar").addEventListener("click", () => {
  const atual = [...telas()].find((t) => !t.hidden);
  const i = PERGUNTAS.findIndex((p) => `tela-${p.id}` === atual.id);
  mostrar(i > 0 ? PERGUNTAS[i - 1].id : "inicio", { volta: true });
});

$("#comecar").addEventListener("click", () => {
  if (!inicioEm) inicioEm = Date.now();
  mostrar(PERGUNTAS[0].id);
});

/* ── envio ───────────────────────────────────────── */

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// um só ponto de saída: com o endereço da planilha manda de verdade, sem ele simula
async function enviar(tipo, corpo) {
  const pacote = { tipo, ...corpo, em: new Date().toISOString() };
  if (CONFIG.endpoint) {
    // vai como texto simples, sem cabeçalho: o Apps Script não responde à consulta prévia que o JSON puxaria.
    // keepalive deixa o clique (e a parcial de quem fecha a aba) chegar mesmo se a pessoa sair da página logo depois
    const r = await fetch(CONFIG.endpoint, { method: "POST", body: JSON.stringify(pacote), keepalive: tipo !== "inscricao" });
    if (!r.ok) throw new Error(`Falha no envio (${r.status})`);
    const resposta = await r.json().catch(() => ({}));
    if (resposta.ok === false) throw new Error(`Planilha recusou (${resposta.erro})`);
    return;
  }
  await espera(tipo === "inscricao" ? 1100 : 0);
  console.info("[teste] seria enviado:", pacote);
  if (tipo === "clique") guardarLocal(CHAVE_CLIQUES, pacote);
  if (tipo === "parcial") guardarLocal(CHAVE_PARCIAIS, pacote, true);
}

// porId: troca o item de mesmo id em vez de juntar outro (a parcial é uma linha por pessoa)
function guardarLocal(chave, item, porId = false) {
  try {
    const lista = JSON.parse(localStorage.getItem(chave) || "[]");
    const i = porId ? lista.findIndex((x) => x.id === item.id) : -1;
    if (i >= 0) lista[i] = item; else lista.push(item);
    localStorage.setItem(chave, JSON.stringify(lista));
  } catch (_) { /* navegador sem armazenamento: segue sem guardar */ }
}

// acao: abriu-agenda, escolheu-app (app: apple, google, outlook, outro) ou copiou-link
function registrarClique(acao, app = "") {
  if (!registro || suspeito) return;
  enviar("clique", { id: registro.id, acao, app }).catch(console.error);
}

function lerOrigem() {
  const q = new URLSearchParams(location.search);
  const utm = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) if (q.get(k)) utm[k] = q.get(k);
  return { origem: q.get("origem") || CONFIG.origemPadrao, utm };
}

async function concluir() {
  suspeito = $('input[name="nao_preencher"]').value !== "" || Date.now() - inicioEm < 2500;
  const d = dados.whatsapp.replace(/\D/g, "");
  registro = {
    id: sessao,
    nome: dados.nome,
    cargo: dados.cargo,
    empresa: dados.empresa,
    email: dados.email,
    whatsapp: dados.whatsapp,
    whatsappInternacional: `+55${d}`,
    webinar: CONFIG.webinar.titulo,
    dataWebinar: CONFIG.webinar.inicio,
    ...lerOrigem(),
    inscritoEm: new Date().toISOString(),
  };

  mostrar("enviando");
  try {
    // robô: mostra o fim normalmente, mas não envia nem guarda nada
    if (suspeito) await espera(1100);
    else {
      await enviar("inscricao", registro);
      if (!CONFIG.endpoint) guardarLocal(CHAVE_LOCAL, registro);
    }
  } catch (e) {
    console.error(e);
    mostrar("whatsapp", { volta: true });
    const erro = $("#erro-whatsapp");
    erro.classList.remove("aviso");
    erro.textContent = "Não conseguimos enviar agora. Confira a internet e toque em Concluir de novo.";
    return;
  }
  prepararFim();
  mostrar("fim");
}

/* ── tela final ──────────────────────────────────── */

function prepararFim() {
  const titulo = $("#fim-titulo");
  titulo.textContent = "Tudo certo, ";
  const nome = document.createElement("span");
  nome.className = "destaque";
  nome.textContent = primeiroNome(registro.nome);
  titulo.append(nome, "!");

  if (CONFIG.modoTeste) {
    $("#painel-teste").hidden = false;
    $("#dados-teste").textContent = JSON.stringify(registro, null, 2);
  }
}

/* ── agenda ──────────────────────────────────────── */
// O botão abre uma folha com os apps de agenda, na ordem mais provável do aparelho.
// Todos levam o link do webinar no Teams: Google e Outlook por link pronto; Apple e os outros pelo agenda.ics.
// No celular, Google (Android) e Outlook (Android e iPhone) tentam abrir o app já com o evento. Nada disso
// é documentado pelo Google ou pela Microsoft, então a folha sempre oferece "Abrir no navegador" como saída.

const ua = navigator.userAgent;
const APARELHO = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  ? "ios" : /Android/i.test(ua) ? "android" : "computador";

function linksAgenda() {
  const w = CONFIG.webinar;
  const ini = new Date(w.inicio);
  const fim = new Date(ini.getTime() + w.duracaoMin * 60000);
  const utc = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const iso = (d) => d.toISOString().replace(/\.\d{3}/, "");
  const query = (p) => Object.entries(p).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  const titulo = `Webinar: ${w.titulo}`;
  const detalhes = `Para entrar no webinar pelo Microsoft Teams, toque no link:\n${w.linkTeams}`;
  const evGoogle = query({
    action: "TEMPLATE", text: titulo, dates: `${utc(ini)}/${utc(fim)}`,
    details: detalhes, location: w.linkTeams, ctz: "America/Sao_Paulo",
  });
  const evOutlookApp = query({ title: titulo, start: iso(ini), end: iso(fim), location: "Microsoft Teams", description: detalhes });
  const google = `https://calendar.google.com/calendar/render?${evGoogle}`;
  const outlook = `https://outlook.office.com/calendar/action/compose?${query({
    rru: "addevent", subject: titulo, startdt: iso(ini), enddt: iso(fim),
    body: detalhes, location: "Microsoft Teams",
  })}`;
  // Android: intent do Chrome com o pacote do app; sem o app instalado, o próprio Chrome abre o fallback
  const intent = (caminho, esquema, pacote, fallback) =>
    `intent://${caminho}#Intent;scheme=${esquema};package=${pacote};S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
  return {
    google,
    outlook,
    ics: w.arquivoAgenda,
    // o app Google Agenda atende os links antigos www.google.com/calendar/event
    googleAndroid: intent(`www.google.com/calendar/event?${evGoogle}`, "https", "com.google.android.calendar", google),
    outlookAndroid: intent(`events/new?${evOutlookApp}`, "ms-outlook", "com.microsoft.office.outlook", outlook),
    outlookIos: `ms-outlook://events/new?${evOutlookApp}`,
  };
}

// qual link cada botão usa neste aparelho; "web" existe quando o botão tenta o app primeiro
function linkDoApp(id, links) {
  if (id === "google" && APARELHO === "android") return { href: links.googleAndroid, web: links.google };
  if (id === "outlook" && APARELHO === "android") return { href: links.outlookAndroid, web: links.outlook };
  if (id === "outlook" && APARELHO === "ios") return { href: links.outlookIos, web: links.outlook };
  return { href: links[APPS[id].link] };
}

const APPS = {
  apple: { nome: "Agenda do iPhone", sub: "App Calendário da Apple", link: "ics" },
  google: {
    nome: "Google Agenda", sub: APARELHO === "android" ? "Abre no app Google Agenda" : "Abre com a sua conta Google",
    link: "google", novaAba: true, logo: "assets/logos/agenda-google.png",
  },
  outlook: {
    nome: "Outlook", sub: APARELHO === "computador" ? "Conta da empresa (Microsoft 365)" : "Abre no app Outlook",
    link: "outlook", novaAba: true, logo: "assets/logos/agenda-outlook.webp",
  },
  outro: { nome: "Outro app de agenda", sub: APARELHO === "computador" ? "Apple, Outlook do computador e outros (.ics)" : "Samsung e outros (arquivo .ics)", link: "ics" },
};
const ORDEM = {
  ios: ["apple", "google", "outlook"],
  android: ["google", "outlook", "outro"],
  computador: ["outlook", "google", "outro"],
};

function montarFolhaAgenda() {
  const links = linksAgenda();
  const lista = $("#opcoes-agenda");
  lista.replaceChildren();
  for (const id of ORDEM[APARELHO]) {
    const app = APPS[id];
    const { href, web } = linkDoApp(id, links);
    const a = document.createElement("a");
    a.className = "app-agenda";
    a.href = href;
    // o link que chama o app fica na mesma aba: numa aba nova sobraria uma aba vazia
    if (app.novaAba && !web) { a.target = "_blank"; a.rel = "noopener"; }
    const icone = app.logo
      ? `<img src="${app.logo}" alt="" width="30" height="30">`
      : `<svg viewBox="0 0 24 24" width="22" height="22"><rect x="3.5" y="5" width="17" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
    a.innerHTML = `<span class="app-icone" aria-hidden="true">${icone}</span>
      <span class="app-texto"><span class="app-nome"></span><span class="app-sub"></span></span>`;
    $(".app-nome", a).textContent = app.nome;
    $(".app-sub", a).textContent = app.sub;
    a.addEventListener("click", () => {
      registrarClique("escolheu-app", id);
      if (web) return oferecerNavegador(app.nome, web);
      setTimeout(() => $("#folha-agenda").close(), 300);
    });
    lista.append(a);
  }
}

// a folha fica aberta com a saída pelo navegador; se o app abrir (a página sai da tela), ela fecha
function oferecerNavegador(nome, web) {
  $("#nome-app").textContent = nome;
  $("#abrir-navegador").href = web;
  $("#nota-app").hidden = false;
  const aoSair = () => {
    if (!document.hidden) return;
    $("#folha-agenda").close();
    document.removeEventListener("visibilitychange", aoSair);
  };
  document.addEventListener("visibilitychange", aoSair);
}

$("#abrir-navegador").addEventListener("click", () => setTimeout(() => $("#folha-agenda").close(), 300));

$("#agenda").addEventListener("click", () => {
  montarFolhaAgenda();
  $("#nota-copia").hidden = true;
  $("#nota-app").hidden = true;
  $("#folha-agenda").showModal();
  registrarClique("abriu-agenda");
});
$("#fechar-agenda").addEventListener("click", () => $("#folha-agenda").close());
// toque fora da folha fecha
$("#folha-agenda").addEventListener("click", (ev) => { if (ev.target === ev.currentTarget) ev.currentTarget.close(); });

$("#copiar-teams").addEventListener("click", async () => {
  const link = CONFIG.webinar.linkTeams;
  try {
    await navigator.clipboard.writeText(link);
  } catch (_) {
    // navegador sem área de transferência liberada: copia pelo jeito antigo
    const t = document.createElement("textarea");
    t.value = link;
    document.body.append(t);
    t.select();
    document.execCommand("copy");
    t.remove();
  }
  const nota = $("#nota-copia");
  nota.textContent = "Link do webinar copiado.";
  nota.hidden = false;
  registrarClique("copiou-link");
});

if (CONFIG.webinar.linkTeams.includes("COLE-AQUI")) console.warn("evento.js: o link do Teams ainda é o provisório.");

$("#reiniciar").addEventListener("click", () => location.reload());

/* ── início ──────────────────────────────────────── */

for (const el of document.querySelectorAll('[data-webinar="data"]')) el.textContent = CONFIG.webinar.dataTexto;
for (const el of document.querySelectorAll('[data-webinar="titulo"]')) el.textContent = CONFIG.webinar.titulo;

const caixa = $("#perguntas");
PERGUNTAS.forEach((p, i) => caixa.append(montarPergunta(p, i)));
