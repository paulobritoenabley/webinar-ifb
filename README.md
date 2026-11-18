# Inscrição no webinar · IFB × Enabley

Página de celular para quem lê o QR code do slide de fechamento do deck do IFB (webinar de 19/11).
A pessoa se inscreve no webinar de **sexta, 27/11, às 10h**: "Como aumentar a eficiência do seu onboarding e o seu ROI".

## Como funciona

1. Boas-vindas rápidas com o cartão do webinar e o botão "Começar inscrição".
2. Cinco perguntas, uma por tela: nome e sobrenome, cargo, empresa, e-mail corporativo e WhatsApp.
3. "Confirmando sua inscrição…" (alguns segundos: é quando a planilha manda o convite).
4. Agradecimento com confetes, o aviso de que o convite foi para o e-mail, o cartão do webinar e o botão
   "Adicionar à agenda" (de reserva, para quem não achar o convite). Ele abre uma folha com os apps,
   cada um com o seu logo e nenhum em destaque, na ordem mais provável do aparelho
   (iPhone: Agenda do iPhone, Google, Outlook · Android: Google, Outlook, outro app · computador: Outlook,
   Google, outro app). Todos levam o link do webinar no Teams e um lembrete 15 min antes.
   Google e Outlook abrem o evento já preenchido; Apple e os outros apps usam o `agenda.ics`.
   Também tem "Copiar só o link do webinar".

A inscrição e cada clique da agenda (abriu "Adicionar à agenda", escolheu Google, Outlook, Agenda do iPhone
ou outro app, copiou o link) vão para uma planilha do Google. O **painel** (`/painel/`) lê essa planilha.

**Quem para no meio também fica guardado.** A cada pergunta respondida, a página salva até onde a pessoa
chegou na aba "Não concluíram" (uma linha por pessoa, atualizada a cada etapa). Se ela fechar a aba com a
resposta já digitada e válida, mas sem tocar em Continuar, essa resposta também vai. Quando a mesma pessoa
conclui, a linha dela sai dessa aba. A tela de boas-vindas avisa que as respostas ficam salvas a cada etapa.

**Convite automático.** A cada inscrição concluída, a planilha cria um evento na agenda principal da conta Google
dona da planilha (Contato Enabley) e convida o e-mail da pessoa: chega um convite de agenda com Sim/Não e só o
link do Teams. Um evento por pessoa, ninguém vê os outros inscritos, e o mesmo e-mail não recebe dois convites.
Título, horário e link do convite ficam fixos no `planilha-google.gs` (bloco `EVENTO`), não vêm da página.

## Painel de controle (`painel/`)

Abra `seu-site/painel/`. Pede a senha uma vez por aparelho (botão "Sair" esquece).

- Números: inscritos (e quantos hoje), quantos abriram a agenda, escolheram um app e copiaram o link.
- Apps de agenda escolhidos, com a quantidade de pessoas em cada um.
- Lista de inscritos, a mais nova em cima: nome, cargo, empresa, e-mail, WhatsApp (abre a conversa),
  o que a pessoa fez na agenda e a hora da inscrição. Tem busca e "Baixar planilha (.csv)" para o Excel.
- Não concluíram: quem começou e parou, com os dados até onde chegou e a etapa em que parou.
  Também baixa em .csv.
- Atualiza sozinho a cada minuto.

Os dados não ficam no GitHub: ficam só na planilha. O painel é público como endereço, mas sem a senha
não mostra nada. Ele não aparece no Google (noindex).

## Ligar a planilha (uma vez, uns 5 minutos)

1. Crie uma planilha nova no Google Drive. Nome sugerido: "Inscrições webinar IFB".
2. Na planilha: **Extensões > Apps Script**. Apague o que estiver lá, cole o arquivo `planilha-google.gs`
   inteiro e salve.
3. No Apps Script, engrenagem **Configurações do projeto > Propriedades do script > Adicionar propriedade**:
   nome `SENHA_PAINEL`, valor a senha que você quiser para o painel.
4. **Implantar > Nova implantação**. Tipo: **App da Web**. Executar como: **Eu**. Quem pode acessar:
   **Qualquer pessoa**. Autorize com a sua conta Google (vai aparecer um aviso de "app não verificado":
   Avançado > Acessar). Copie o endereço que termina em `/exec`.
5. Cole esse endereço no `planilha.js`, em `url: "..."`.
6. Para o convite automático: em **Serviços (+)** adicione **Google Calendar API**; depois escolha a função
   `prepararAgenda` ao lado de Depuração, clique em **Executar** e autorize o acesso à agenda.

As abas "Inscrições", "Não concluíram" e "Cliques" aparecem sozinhas no primeiro uso.

**Mudou o código do `planilha-google.gs`?** Cole o código novo no Apps Script (apague o antigo) e salve.
Depois **Implantar > Gerenciar implantações**, clique no lápis, em **Versão** escolha **Nova versão** e
clique em **Implantar**. Assim o endereço `/exec` continua o mesmo e não precisa mexer no `planilha.js`.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e suba **o conteúdo desta pasta** (o `index.html` fica na raiz).
2. No repositório: **Settings > Pages > Source: Deploy from a branch**, branch `main`, pasta `/ (root)`.
3. Em um ou dois minutos o site fica em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.
   O painel fica no mesmo endereço com `/painel/` no fim.
4. Teste com o celular: faça uma inscrição e veja ela chegar no painel.
5. Esse endereço é o que vai no QR code do slide 15 do deck.

O GitHub Pages já entrega o `agenda.ics` do jeito que o iPhone precisa.

## Travas

| Campo | O que barra |
|---|---|
| Nome | números e símbolos (nem entram); sem sobrenome; só a inicial; letras repetidas tipo "aaa". Arruma maiúsculas: "JOÃO DA silva" vira "João da Silva" |
| Cargo | símbolos estranhos; só números |
| Empresa | símbolos estranhos; menos de 2 letras ou números |
| E-mail | espaço e acento (nem entram); sem @ ou com dois; sem final (.com.br); finais com erro (.con, .cmo…); Gmail, Hotmail, Outlook, Yahoo, iCloud, UOL, BOL e parecidos |
| WhatsApp | só números; monta sozinho no formato DD-NNNNN-NNNN; DDD que não existe; celular que não começa com 9; números repetidos. Aceita colar "+55 (11) 98765-4321" |

Também tem um campo-isca escondido contra robôs.

## Testar

Abra o `index.html` num servidor local (no navegador, abrindo o arquivo direto, as fontes podem não carregar).
Com o `planilha.js` vazio, a página fica em **modo de teste**: no fim mostra os dados que seriam enviados,
nada sai do navegador e o painel, aberto no mesmo navegador, mostra essas inscrições de teste.
Com o endereço preenchido, o modo de teste some sozinho.

## Dados do webinar (`evento.js`)

Título (o do cartão da página), `tituloAgenda` (o nome do evento na agenda), data do texto, início,
duração (está 60 min) e `linkTeams`, o link de entrada do webinar no Teams.
**Mudou algo aqui? Rode `node gerar-agenda.js`** para refazer o `agenda.ics` com os dados novos, e troque
também o bloco `EVENTO` do `planilha-google.gs` (é ele que vai no convite por e-mail). Convites já enviados
não mudam sozinhos.

## Ajustes rápidos (no começo do `app.js`, bloco `CONFIG`)

- `bloquearEmailPessoal`: `false` para aceitar Gmail e parecidos.
- A origem vai junto em cada inscrição: `?origem=` na URL (padrão `qr-deck-ifb`) e os `utm_*`.

## Arquivos

- `index.html`: as telas
- `estilo.css`: paleta B do deck (fundo #F6F4FA, índigo #0B0B45, magenta #98008E, a "ponte" índigo → magenta) e Lexend
- `app.js`: perguntas, travas, máscara, envio e a folha da agenda
- `evento.js`: os dados do webinar e o link do Teams
- `planilha.js`: o endereço da planilha (vazio = modo de teste)
- `planilha-google.gs`: o código que vai no Apps Script da planilha (não roda no site)
- `painel/`: a página de controle
- `gerar-agenda.js` → `agenda.ics`: o evento para Apple e outros apps (o site precisa servir .ics como `text/calendar`)
- `assets/logos`: logos do IFB e da Enabley (os mesmos do deck) e os ícones do Google Agenda e do Outlook
- `assets/fontes`: Lexend 400, 500 e 600
