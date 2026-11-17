"use strict";

/* Painel de inscrições · IFB × Enabley
 * Lê as abas "Inscrições" e "Cliques" da planilha (endereço no planilha.js) com a senha do painel.
 * Sem endereço, mostra os dados de teste deste navegador (as mesmas chaves que o app.js grava).
 */

const TESTE = !PLANILHA.url;
const CHAVE_SENHA = "painel-webinar-ifb-senha";
const ATUALIZA_A_CADA = 60000;

const APPS = [
  { id: "google", nome: "Google Agenda", logo: "../assets/logos/agenda-google.png" },
  { id: "outlook", nome: "Outlook", logo: "../assets/logos/agenda-outlook.webp" },
  { id: "apple", nome: "Agenda do iPhone" },
  { id: "outro", nome: "Outro app" },
];
const NOME_APP = Object.fromEntries(APPS.map((a) => [a.id, a.nome]));
const ICONE_AGENDA = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

const $ = (sel, raiz = document) => raiz.querySelector(sel);

let senha = lerGuardado(CHAVE_SENHA) || "";
let pessoas = [];
let atualizando = false;

/* ── guardar no navegador ───────────────────────────── */

function lerGuardado(chave) {
  try { return localStorage.getItem(chave); } catch (_) { return null; }
}
function guardar(chave, valor) {
  try { if (valor) localStorage.setItem(chave, valor); else localStorage.removeItem(chave); } catch (_) { /* sem armazenamento */ }
}

/* ── buscar ─────────────────────────────────────────── */

async function buscar() {
  if (TESTE) {
    const lista = (chave) => { try { return JSON.parse(lerGuardado(chave) || "[]"); } catch (_) { return []; } };
    return { inscricoes: lista("inscricoes-webinar-ifb"), cliques: lista("inscricoes-webinar-ifb-cliques") };
  }
  // texto simples, igual ao app.js: o Apps Script não aceita a consulta prévia do JSON
  const r = await fetch(PLANILHA.url, { method: "POST", body: JSON.stringify({ tipo: "painel", senha }) });
  if (!r.ok) throw new Error(`A planilha respondeu ${r.status}`);
  const d = await r.json();
  if (!d.ok) throw Object.assign(new Error(`Planilha recusou (${d.erro})`), { senhaErrada: d.erro === "senha" });
  return d;
}

// junta cada inscrição com os cliques dela
function juntar({ inscricoes, cliques }) {
  const porId = new Map();
  for (const c of cliques) {
    if (!porId.has(c.id)) porId.set(c.id, []);
    porId.get(c.id).push(c);
  }
  return inscricoes
    .map((p) => {
      const meus = porId.get(p.id) || [];
      return {
        ...p,
        abriuAgenda: meus.some((c) => c.acao === "abriu-agenda"),
        apps: [...new Set(meus.filter((c) => c.acao === "escolheu-app").map((c) => c.app))],
        copiouLink: meus.some((c) => c.acao === "copiou-link"),
      };
    })
    .sort((a, b) => String(b.inscritoEm).localeCompare(String(a.inscritoEm)));
}

async function atualizar() {
  if (atualizando) return;
  atualizando = true;
  const botao = $("#atualizar");
  botao.disabled = true;
  botao.textContent = "Atualizando…";
  try {
    pessoas = juntar(await buscar());
    desenhar();
    $("#entrar").hidden = true;
    $("#conteudo").hidden = false;
    $("#sair").hidden = TESTE;
    $("#atualizado").textContent = `Atualizado às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  } catch (e) {
    console.error(e);
    if (e.senhaErrada) {
      senha = "";
      guardar(CHAVE_SENHA, "");
      pedirSenha("Senha errada. Confira e tente de novo.");
    } else {
      $("#atualizado").textContent = "Não consegui atualizar. Confira a internet e o endereço no planilha.js.";
    }
  } finally {
    atualizando = false;
    botao.disabled = false;
    botao.textContent = "Atualizar";
  }
}

/* ── desenhar ───────────────────────────────────────── */

function criar(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto != null) el.textContent = texto;
  return el;
}

const parte = (n, total) => (total ? `${Math.round((n / total) * 100)}% dos inscritos` : "—");

function desenhar() {
  const total = pessoas.length;
  const abriram = pessoas.filter((p) => p.abriuAgenda).length;
  const escolheram = pessoas.filter((p) => p.apps.length).length;
  const copiaram = pessoas.filter((p) => p.copiouLink).length;

  const numeros = $("#numeros");
  numeros.replaceChildren();
  for (const [valor, nome, nota] of [
    [total, "Inscritos", hojeTexto()],
    [abriram, "Abriram “Adicionar à agenda”", parte(abriram, total)],
    [escolheram, "Escolheram um app de agenda", parte(escolheram, total)],
    [copiaram, "Copiaram o link do webinar", parte(copiaram, total)],
  ]) {
    const n = criar("div", "numero");
    n.append(criar("span", "numero-valor", valor), criar("span", "numero-nome", nome), criar("span", "numero-parte", nota));
    numeros.append(n);
  }

  const apps = $("#apps");
  apps.replaceChildren();
  for (const app of APPS) {
    const qtd = pessoas.filter((p) => p.apps.includes(app.id)).length;
    const linha = criar("div", "app-linha");
    const icone = criar("span", "app-icone");
    if (app.logo) {
      const img = criar("img");
      img.src = app.logo;
      img.alt = "";
      icone.append(img);
    } else {
      icone.innerHTML = ICONE_AGENDA;
    }
    const trilho = criar("span", "app-trilho");
    const barra = criar("span", "app-barra");
    barra.style.width = total ? `${(qtd / total) * 100}%` : "0";
    trilho.append(barra);
    linha.append(icone, criar("span", "app-linha-nome", app.nome), trilho, criar("span", "app-valor", qtd));
    apps.append(linha);
  }

  desenharLista();
}

function hojeTexto() {
  const hoje = new Date().toDateString();
  const n = pessoas.filter((p) => new Date(p.inscritoEm).toDateString() === hoje).length;
  return n ? `${n} hoje` : "nenhuma hoje";
}

function filtradas() {
  const termo = normalizar($("#busca").value);
  if (!termo) return pessoas;
  return pessoas.filter((p) => normalizar([p.nome, p.cargo, p.empresa, p.email, p.whatsapp].join(" ")).includes(termo));
}

const normalizar = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

function quando(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function desenharLista() {
  const lista = filtradas();
  $("#contagem").textContent = lista.length === pessoas.length ? `(${pessoas.length})` : `(${lista.length} de ${pessoas.length})`;

  const linhas = $("#linhas");
  linhas.replaceChildren();
  for (const p of lista) {
    const linha = criar("div", "linha");

    const pessoa = criar("div");
    pessoa.append(criar("div", "pessoa-nome", p.nome), criar("div", "pessoa-cargo", [p.cargo, p.empresa].filter(Boolean).join(" · ")));

    const contato = criar("div", "contato");
    const email = criar("a", "", p.email);
    email.href = `mailto:${p.email}`;
    contato.append(email);
    const numero = String(p.whatsappInternacional || "").replace(/\D/g, "");
    if (numero) {
      const whats = criar("a", "whats", `WhatsApp ${p.whatsapp}`);
      whats.href = `https://wa.me/${numero}`;
      whats.target = "_blank";
      whats.rel = "noopener";
      contato.append(whats);
    }

    const selos = criar("div", "selos");
    for (const app of p.apps) selos.append(criar("span", "selo", NOME_APP[app] || app));
    if (p.copiouLink) selos.append(criar("span", "selo neutro", "Copiou o link"));
    if (p.abriuAgenda && !p.apps.length && !p.copiouLink) selos.append(criar("span", "selo neutro", "Abriu, não escolheu"));
    if (!p.abriuAgenda && !p.apps.length && !p.copiouLink) selos.append(criar("span", "selo apagado", "Não abriu a agenda"));

    linha.append(pessoa, contato, selos, criar("div", "quando", quando(p.inscritoEm)));
    linhas.append(linha);
  }

  const vazio = $("#vazio");
  vazio.hidden = lista.length > 0;
  vazio.textContent = pessoas.length ? "Ninguém com esse nome, empresa ou e-mail." : "Ninguém se inscreveu ainda.";
}

/* ── baixar planilha ────────────────────────────────── */

function baixarCsv() {
  // ponto e vírgula e BOM: o Excel em português abre com as colunas e os acentos certos
  const celula = (v) => {
    let t = String(v == null ? "" : v);
    if (/^[=+\-@]/.test(t)) t = `'${t}`;
    return `"${t.replace(/"/g, '""')}"`;
  };
  const cabecalho = ["Inscrito em", "Nome", "Cargo", "Empresa", "E-mail", "WhatsApp", "Origem", "Abriu a agenda", "App escolhido", "Copiou o link"];
  const linhas = filtradas().map((p) => [
    quando(p.inscritoEm), p.nome, p.cargo, p.empresa, p.email, p.whatsapp, p.origem,
    p.abriuAgenda ? "sim" : "não", p.apps.map((a) => NOME_APP[a] || a).join(", "), p.copiouLink ? "sim" : "não",
  ]);
  const csv = "﻿" + [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `inscricoes-webinar-ifb-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ── senha ──────────────────────────────────────────── */

function pedirSenha(erro = "") {
  $("#conteudo").hidden = true;
  $("#sair").hidden = true;
  $("#entrar").hidden = false;
  $("#erro-senha").textContent = erro;
  $("#atualizado").textContent = "";
  $("#senha").value = "";
  $("#senha").focus();
}

$("#entrar").addEventListener("submit", (ev) => {
  ev.preventDefault();
  senha = $("#senha").value.trim();
  if (!senha) return;
  guardar(CHAVE_SENHA, senha);
  $("#erro-senha").textContent = "";
  atualizar();
});

$("#sair").addEventListener("click", () => {
  senha = "";
  pessoas = [];
  guardar(CHAVE_SENHA, "");
  pedirSenha();
});

/* ── início ─────────────────────────────────────────── */

for (const el of document.querySelectorAll('[data-webinar="data"]')) el.textContent = EVENTO.dataTexto;
for (const el of document.querySelectorAll('[data-webinar="titulo"]')) el.textContent = EVENTO.titulo;

$("#atualizar").addEventListener("click", () => (TESTE || senha ? atualizar() : pedirSenha()));
$("#busca").addEventListener("input", desenharLista);
$("#baixar").addEventListener("click", baixarCsv);

if (TESTE) {
  $("#aviso-teste").hidden = false;
  // uma inscrição feita em outra aba deste navegador aparece na hora
  window.addEventListener("storage", (ev) => { if (ev.key && ev.key.startsWith("inscricoes-webinar-ifb")) atualizar(); });
}

if (TESTE || senha) atualizar(); else pedirSenha();

setInterval(() => { if (!document.hidden && (TESTE || senha)) atualizar(); }, ATUALIZA_A_CADA);
