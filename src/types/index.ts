export type Role = "werewolf" | "villager" | "seer" | "doctor";

export type GamePhase =
  | "setup"
  | "night_actions"
  | "day_discussion"
  | "day_voting"
  | "ended";

export interface Player {
  id: string;
  name: string;
  role: Role;
  isAlive: boolean;
  isAI: boolean;
  model: string;
  isHermesMastermind?: boolean;
}

export interface Statement {
  speakerId: string;
  speakerName: string;
  round: number;
  innerThought: string;
  publicUtterance: string;
  tactic: string;
  targetId?: string;
  timestamp: string;
}

export interface Vote {
  voterId: string;
  targetId: string; // ID of player being voted to eliminate
  reasoning: string;
}

export interface NightResult {
  killedPlayerId: string | null;
  savedPlayerId: string | null;
  inspectedPlayerId: string | null;
  inspectedRole: Role | null;
}

export interface RoundState {
  roundNumber: number;
  statements: Statement[];
  votes: Record<string, string>; // voterId -> targetId
  eliminatedPlayerId: string | null;
  nightResult?: NightResult;
}

export interface MatchState {
  id: string;
  players: Player[];
  phase: GamePhase;
  currentRound: number;
  rounds: RoundState[];
  winner: "werewolves" | "villagers" | null;
  startedAt: string;
  endedAt?: string;
}

export interface PlayerAnalytics {
  playerId: string;
  name: string;
  role: Role;
  survived: boolean;
  deceptionScore: number; // 0 to 100%
  influenceIndex: number;  // Number of votes successfully swayed
  bluffsDetected: number;
  totalStatements: number;
}

export interface MatchReport {
  matchId: string;
  winner: "werewolves" | "villagers";
  totalRounds: number;
  players: PlayerAnalytics[];
  keyTurningPoints: string[];
  mvp: string;
}
