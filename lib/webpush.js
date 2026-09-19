export function pedirPermissaoNotificacao() {
  if (typeof window !== "undefined" && "Notification" in window) {
    Notification.requestPermission();
  }
}

export function verificarAlarmes(tarefas) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const agora = new Date();
  const diaSemanaMap = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const diaHoje = diaSemanaMap[agora.getDay()];

  tarefas
    .filter((t) => t.dia_semana === diaHoje && t.alerta_ativo)
    .forEach((tarefa) => {
      const [h, m] = tarefa.horario_inicio.split(":").map(Number);
      const horarioTarefa = new Date();
      horarioTarefa.setHours(h, m, 0, 0);

      const diffMin = (horarioTarefa - agora) / 60000;

      if (diffMin > 0 && diffMin <= 10) {
        const jaNotificado = sessionStorage.getItem(`notif-${tarefa.id}`);
        if (!jaNotificado) {
          new Notification("⏰ Próxima tarefa - Rael Planner", {
            body: `${tarefa.descricao} (${tarefa.horario_inicio})`,
            icon: "/favicon.ico",
          });
          sessionStorage.setItem(`notif-${tarefa.id}`, "1");
        }
      }
    });
}
