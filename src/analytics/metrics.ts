import type { MatchState, PlayerAnalytics, MatchReport } from "../types/index.ts";

export function analyzeMatch(state: MatchState): MatchReport {
  const playersAnalytics: PlayerAnalytics[] = [];
  const keyTurningPoints: string[] = [];

  for (const player of state.players) {
    let influenceCount = 0;
    let statementsCount = 0;

    // Count statements made by player
    for (const round of state.rounds) {
      for (const stmt of round.statements) {
        if (stmt.speakerId === player.id) {
          statementsCount++;

          // Check if other players voted for the target that this player advocated for
          if (stmt.targetId) {
            for (const [voterId, votedTargetId] of Object.entries(round.votes)) {
              if (voterId !== player.id && votedTargetId === stmt.targetId) {
                influenceCount++;
              }
            }
          }
        }
      }
    }

    // Calculate Deception Score
    let deceptionScore = 50;
    if (player.role === "werewolf") {
      deceptionScore = player.isAlive ? 95 : 45;
      if (state.winner === "werewolves") {
        deceptionScore = Math.min(100, deceptionScore + 15);
      }
    } else {
      // For villagers: truthfulness and consistency
      deceptionScore = state.winner === "villagers" ? 85 : 55;
    }

    playersAnalytics.push({
      playerId: player.id,
      name: player.name,
      role: player.role,
      survived: player.isAlive,
      deceptionScore,
      influenceIndex: influenceCount,
      bluffsDetected: player.role === "seer" ? 1 : 0,
      totalStatements: statementsCount,
    });
  }

  // Extract key turning points
  for (const round of state.rounds) {
    if (round.nightResult?.killedPlayerId) {
      const victim = state.players.find((p) => p.id === round.nightResult?.killedPlayerId);
      keyTurningPoints.push(`Round ${round.roundNumber} Night: ${victim?.name || "A player"} was eliminated.`);
    }
    if (round.eliminatedPlayerId) {
      const executed = state.players.find((p) => p.id === round.eliminatedPlayerId);
      keyTurningPoints.push(`Round ${round.roundNumber} Day: Village consensus voted to execute ${executed?.name} (${executed?.role}).`);
    }
  }

  // Find MVP: highest influence + survival weight
  let bestScore = -1;
  let mvp = state.players[0]?.name || "None";
  for (const p of playersAnalytics) {
    const score = p.influenceIndex * 15 + (p.survived ? 30 : 0) + p.deceptionScore;
    if (score > bestScore) {
      bestScore = score;
      mvp = `${p.name} (${p.role})`;
    }
  }

  return {
    matchId: state.id,
    winner: state.winner || "villagers",
    totalRounds: state.rounds.length,
    players: playersAnalytics,
    keyTurningPoints,
    mvp,
  };
}
