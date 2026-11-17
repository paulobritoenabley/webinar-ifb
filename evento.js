/* Dados do webinar: a única fonte. A página lê daqui, e o gerar-agenda.js monta o agenda.ics daqui.
 * Mudou algo? Rode de novo:  node gerar-agenda.js
 */
const EVENTO = {
  titulo: "Como aumentar a eficiência do seu onboarding e o seu ROI",
  dataTexto: "Sexta, 27/11 · 10h (Brasília)",
  inicio: "2026-11-27T10:00:00-03:00",
  duracaoMin: 60,
  // link de entrada da sala no Microsoft Teams (o "Entrar na reunião" do convite do Teams)
  linkTeams: "https://teams.microsoft.com/meet/3293755500545046?p=jPZEbYRBy0cYRv19BB",
  arquivoAgenda: "agenda.ics",
};
