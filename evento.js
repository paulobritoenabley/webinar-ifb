/* Dados do webinar: a única fonte. A página lê daqui, e o gerar-agenda.js monta o agenda.ics daqui.
 * Mudou algo? Rode de novo:  node gerar-agenda.js
 */
const EVENTO = {
  titulo: "Como aumentar a eficiência do seu onboarding e o seu ROI",
  // nome do evento na agenda da pessoa (botão "Adicionar à agenda", agenda.ics e o convite da planilha)
  tituloAgenda: "Webinar: Treinamento Escala 6x1 e ROI",
  dataTexto: "Sexta, 27/11 · 10h (Brasília)",
  inicio: "2026-11-27T10:00:00-03:00",
  duracaoMin: 60,
  // link de entrada da sala no Microsoft Teams (o "Entrar na reunião" do convite do Teams)
  linkTeams: "https://teams.microsoft.com/meet/3432261999992135?p=HTwgj74uhz8xvmEBtq",
  arquivoAgenda: "agenda.ics",
};
