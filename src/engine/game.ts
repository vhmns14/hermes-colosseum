import type {
  MatchState,
  Player,
  RoundState,
  Statement,
  NightResult,
  Role,
} from "../types/index.ts";
import { initializePlayers } from "./rules.ts";
import { checkVictory } from "./victory.ts";
import { AgentBrain } from "../agent/brain.ts";
import { AgentMemory } from "../agent/memory.ts";
import type { LLMProvider } from "../agent/llm.ts";

export interface GameCallbacks {
  onPhaseChange?: (phase: string, round: number) => void;
  onStatement?: (stmt: Statement) => void;
  onNightResult?: (result: NightResult) => void;
  onVoteResult?: (votes: Record<string, string>, eliminated: Player | null) => void;
  onGameEnd?: (winner: "werewolves" | "villagers") => void;
}

export class GameEngine {
  public state: MatchState;
  private memories: Map<string, AgentMemory>;
  private brain: AgentBrain;
  private callbacks: GameCallbacks;

  constructor(llm: LLMProvider, callbacks: GameCallbacks = {}) {
    this.brain = new AgentBrain(llm);
    this.memories = new Map();
    this.callbacks = callbacks;
    this.state = {
      id: `match-${Date.now()}`,
      players: [],
      phase: "setup",
      currentRound: 0,
      rounds: [],
      winner: null,
      startedAt: new Date().toISOString(),
    };
  }

  setup(
    playerNames: string[],
    hermesAsMastermind: boolean = true,
    modelConfig: string | Record<string, string> = "gpt-4o-mini",
    mastermindRole: Role = "seer"
  ) {
    const players = initializePlayers(playerNames, hermesAsMastermind, modelConfig, mastermindRole);
    this.state.players = players;
    const allIds = players.map((p) => p.id);

    for (const p of players) {
      this.memories.set(p.id, new AgentMemory(p.id, allIds));
    }
  }

  async runFullMatch(maxRounds: number = 5): Promise<MatchState> {
    while (!this.state.winner && this.state.currentRound < maxRounds) {
      this.state.currentRound++;
      const currentRoundState: RoundState = {
        roundNumber: this.state.currentRound,
        statements: [],
        votes: {},
        eliminatedPlayerId: null,
      };

      // 1. NIGHT PHASE
      this.callbacks.onPhaseChange?.("night_actions", this.state.currentRound);
      const nightRes = await this.executeNight();
      currentRoundState.nightResult = nightRes;
      this.callbacks.onNightResult?.(nightRes);

      const nightVictory = checkVictory(this.state.players);
      if (nightVictory) {
        this.finishMatch(nightVictory, currentRoundState);
        break;
      }

      // 2. DAY DISCUSSION
      this.callbacks.onPhaseChange?.("day_discussion", this.state.currentRound);
      const statements = await this.executeDayDiscussion(nightRes);
      currentRoundState.statements = statements;

      // 3. DAY VOTING
      this.callbacks.onPhaseChange?.("day_voting", this.state.currentRound);
      const { votes, eliminated } = await this.executeDayVoting();
      currentRoundState.votes = votes;
      currentRoundState.eliminatedPlayerId = eliminated?.id || null;
      this.callbacks.onVoteResult?.(votes, eliminated);

      this.state.rounds.push(currentRoundState);

      const dayVictory = checkVictory(this.state.players);
      if (dayVictory) {
        this.finishMatch(dayVictory, currentRoundState);
        break;
      }
    }

    if (!this.state.winner) {
      // Default fallback if max rounds reached: faction with most players wins
      const wolves = this.state.players.filter((p) => p.isAlive && p.role === "werewolf").length;
      const villagers = this.state.players.filter((p) => p.isAlive && p.role !== "werewolf").length;
      this.state.winner = wolves >= villagers ? "werewolves" : "villagers";
      this.callbacks.onGameEnd?.(this.state.winner);
    }

    return this.state;
  }

  private async executeNight(): Promise<NightResult> {
    const alivePlayers = this.state.players.filter((p) => p.isAlive);
    const aliveWolves = alivePlayers.filter((p) => p.role === "werewolf");
    const aliveSeers = alivePlayers.filter((p) => p.role === "seer");
    const aliveDoctors = alivePlayers.filter((p) => p.role === "doctor");

    // 1. Wolves pick a victim
    let killedId: string | null = null;
    const nonWolves = alivePlayers.filter((p) => p.role !== "werewolf");
    if (nonWolves.length > 0 && aliveWolves.length > 0) {
      const wolfMemory = this.memories.get(aliveWolves[0].id);
      // Wolves target the most influential / trusted non-wolf, or random
      const sortedNonWolves = [...nonWolves].sort((a, b) => {
        const tA = wolfMemory ? wolfMemory.getTrust(a.id) : 50;
        const tB = wolfMemory ? wolfMemory.getTrust(b.id) : 50;
        return tB - tA;
      });
      killedId = sortedNonWolves[0]?.id || nonWolves[0].id;
    }

    // 2. Doctor protects someone
    let savedId: string | null = null;
    if (aliveDoctors.length > 0) {
      const doc = aliveDoctors[0];
      const docMem = this.memories.get(doc.id);
      const seer = aliveSeers[0];
      const allies = alivePlayers.filter((p) => p.id !== doc.id);

      // If Seer is alive and trusted, Doctor prioritizes shielding the Seer (70%)
      if (seer && docMem && docMem.getTrust(seer.id) >= 45 && Math.random() < 0.7) {
        savedId = seer.id;
      } else if (Math.random() < 0.25 || allies.length === 0) {
        // 25% chance self-protection
        savedId = doc.id;
      } else {
        // Shield highest trusted ally
        let best = allies[0];
        let maxTrust = -1;
        for (const ally of allies) {
          const t = docMem ? docMem.getTrust(ally.id) : 50;
          if (t > maxTrust) {
            maxTrust = t;
            best = ally;
          }
        }
        savedId = best.id;
      }
    }

    // 3. Seer inspects someone
    let inspectedId: string | null = null;
    let inspectedRole: any = null;
    if (aliveSeers.length > 0) {
      const seer = aliveSeers[0];
      const seerMemory = this.memories.get(seer.id);
      const candidates = alivePlayers.filter((p) => p.id !== seer.id);

      if (candidates.length > 0) {
        // Seer prioritizes candidates who haven't been inspected yet (trust === 50)
        const uninspected = candidates.filter((c) => (seerMemory ? seerMemory.getTrust(c.id) === 50 : true));
        const pool = uninspected.length > 0 ? uninspected : candidates;
        const inspected = pool[Math.floor(Math.random() * pool.length)];
        inspectedId = inspected.id;
        inspectedRole = inspected.role;

        // Seer immediately updates trust memory
        if (inspectedRole === "werewolf") {
          seerMemory?.adjustTrust(inspectedId, -90, "Night inspection confirmed Werewolf");
        } else {
          seerMemory?.adjustTrust(inspectedId, +40, "Night inspection confirmed innocent");
        }
      }
    }

    // Resolve kill
    let finalKilled: string | null = null;
    if (killedId && killedId !== savedId) {
      finalKilled = killedId;
      const victim = this.state.players.find((p) => p.id === finalKilled);
      if (victim) {
        victim.isAlive = false;
      }
    }

    return {
      killedPlayerId: finalKilled,
      savedPlayerId: savedId,
      inspectedPlayerId: inspectedId,
      inspectedRole: inspectedRole,
    };
  }

  private async executeDayDiscussion(nightRes: NightResult): Promise<Statement[]> {
    const alivePlayers = this.state.players.filter((p) => p.isAlive);
    const statements: Statement[] = [];

    // Discussion rounds: each alive player speaks twice
    for (let turn = 0; turn < 2; turn++) {
      for (const speaker of alivePlayers) {
        if (!speaker.isAlive) continue;

        const mem = this.memories.get(speaker.id)!;
        const turnDecision = await this.brain.thinkAndSpeak(
          speaker,
          this.state.currentRound,
          alivePlayers,
          statements,
          mem,
          nightRes,
          this.state.players
        );

        const stmt: Statement = {
          speakerId: speaker.id,
          speakerName: speaker.name,
          round: this.state.currentRound,
          innerThought: turnDecision.innerThought,
          publicUtterance: turnDecision.publicUtterance,
          tactic: turnDecision.tactic,
          targetId: turnDecision.targetId,
          timestamp: new Date().toISOString(),
        };

        statements.push(stmt);
        this.callbacks.onStatement?.(stmt);

        // Other players update trust scores based on speech
        for (const listener of alivePlayers) {
          if (listener.id === speaker.id) continue;
          const listenerMem = this.memories.get(listener.id)!;

          // Mastermind cognitive influence
          if (speaker.isHermesMastermind) {
            if (turnDecision.tactic === "BUILD_TRUST" || turnDecision.tactic === "APPEAL_TO_LOGIC") {
              listenerMem.adjustTrust(speaker.id, +15, "Mastermind persuasive empathy");
            }
            if (
              turnDecision.targetId &&
              (turnDecision.tactic === "DEFLECT_AND_FRAME" ||
                turnDecision.tactic === "BANDWAGON_LEADER" ||
                turnDecision.tactic === "PROBE_ACCUSATION" ||
                turnDecision.tactic === "EXPOSE_WOLF" ||
                turnDecision.tactic === "SEER_REVEAL" ||
                turnDecision.tactic === "RALLY_VILLAGE")
            ) {
              if (listener.id !== turnDecision.targetId) {
                listenerMem.adjustTrust(turnDecision.targetId, -25, "Mastermind sharp deduction & evidence against suspect");
              }
            }
          }

          // Seer revelation influence: if speaker claims seer / exposes wolf, villagers heed strongly
          if (
            (turnDecision.tactic === "EXPOSE_WOLF" ||
              turnDecision.tactic === "SEER_REVEAL" ||
              turnDecision.publicUtterance.toLowerCase().includes("seer") ||
              turnDecision.publicUtterance.toLowerCase().includes("werewolf")) &&
            turnDecision.targetId
          ) {
            if (listener.role !== "werewolf" && listener.id !== turnDecision.targetId) {
              listenerMem.adjustTrust(turnDecision.targetId, -25, "Heeded Seer revelation against suspect");
              listenerMem.adjustTrust(speaker.id, +15, "Trusted Seer leadership");
            }
          }

          // Doctor claim influence: if doctor claims under pressure, village clears them
          if (
            (turnDecision.tactic === "CLAIM_DOCTOR" ||
              turnDecision.publicUtterance.toLowerCase().includes("doctor") ||
              turnDecision.publicUtterance.toLowerCase().includes("shielded") ||
              turnDecision.publicUtterance.toLowerCase().includes("medical log")) &&
            speaker.role === "doctor"
          ) {
            if (listener.role !== "werewolf") {
              listenerMem.adjustTrust(speaker.id, +35, "Recognized authentic Doctor claim under pressure");
            }
          }

          // If speaker is accusing a player that listener trusts, listener trusts speaker less
          if (turnDecision.targetId) {
            const targetTrust = listenerMem.getTrust(turnDecision.targetId);
            if (targetTrust > 65) {
              listenerMem.adjustTrust(speaker.id, -15, `Accused trusted player ${turnDecision.targetId}`);
            } else if (targetTrust < 35) {
              listenerMem.adjustTrust(speaker.id, +10, `Agrees with suspicion on ${turnDecision.targetId}`);
            }
          }
        }
      }
    }

    return statements;
  }

  private async executeDayVoting(): Promise<{ votes: Record<string, string>; eliminated: Player | null }> {
    const alivePlayers = this.state.players.filter((p) => p.isAlive);
    const votes: Record<string, string> = {};
    const voteCounts: Record<string, number> = {};

    for (const voter of alivePlayers) {
      const mem = this.memories.get(voter.id)!;
      const decision = await this.brain.decideVote(voter, alivePlayers, mem);
      votes[voter.id] = decision.targetId;
      voteCounts[decision.targetId] = (voteCounts[decision.targetId] || 0) + 1;
    }

    // Determine highest vote
    let maxVotes = 0;
    let targetToEliminate: string | null = null;
    let isTie = false;

    for (const [targetId, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        targetToEliminate = targetId;
        isTie = false;
      } else if (count === maxVotes) {
        isTie = true;
      }
    }

    let eliminatedPlayer: Player | null = null;
    if (targetToEliminate && !isTie) {
      eliminatedPlayer = this.state.players.find((p) => p.id === targetToEliminate) || null;
      if (eliminatedPlayer) {
        eliminatedPlayer.isAlive = false;
      }
    }

    return { votes, eliminated: eliminatedPlayer };
  }

  private finishMatch(winner: "werewolves" | "villagers", lastRound: RoundState) {
    this.state.winner = winner;
    this.state.phase = "ended";
    this.state.endedAt = new Date().toISOString();
    if (!this.state.rounds.includes(lastRound)) {
      this.state.rounds.push(lastRound);
    }
    this.callbacks.onGameEnd?.(winner);
  }
}
