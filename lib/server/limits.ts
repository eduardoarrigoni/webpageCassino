/** Limites para execuções com parâmetros livres (protegem o servidor; os oficiais ficam bem abaixo). */
export const LIMITS = {
  maxRounds: 200_000,
  e2MaxSeeds: 5,
  e2MaxCheckpoints: 10,
  e2MaxReproduction: 100,
  e3MaxParticipants: 2_000,
  e3MaxSessionRounds: 5_000,
  e3MaxInitialBalance: 100_000,
  /** participantes × rodadas máximas por sessão. */
  e3MaxWork: 2_000_000,
  e3MaxTrajectories: 10,
  /** Pontos por trajetória devolvidos no E2 (amostrados em escala log). */
  e2TrajectoryPoints: 400,
} as const;
