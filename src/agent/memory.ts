import type { Statement } from "../types/index.ts";

export class AgentMemory {
  public playerId: string;
  public trustMatrix: Map<string, number>; // otherPlayerId -> trust score (0..100)
  public privateNotes: string[];

  constructor(playerId: string, otherPlayerIds: string[]) {
    this.playerId = playerId;
    this.trustMatrix = new Map();
    this.privateNotes = [];

    // Initialize all other players with baseline neutral trust (50)
    for (const id of otherPlayerIds) {
      if (id !== playerId) {
        this.trustMatrix.set(id, 50);
      }
    }
  }

  getTrust(otherPlayerId: string): number {
    return this.trustMatrix.get(otherPlayerId) ?? 50;
  }

  adjustTrust(otherPlayerId: string, delta: number, reason: string) {
    const current = this.getTrust(otherPlayerId);
    const updated = Math.max(0, Math.min(100, current + delta));
    this.trustMatrix.set(otherPlayerId, updated);
    this.privateNotes.push(`Trust ${otherPlayerId} adjusted ${delta > 0 ? "+" : ""}${delta} -> ${updated}% (${reason})`);
  }

  getMostSuspected(): string | null {
    let lowestTrust = 101;
    let targetId: string | null = null;

    for (const [id, trust] of this.trustMatrix.entries()) {
      if (trust < lowestTrust) {
        lowestTrust = trust;
        targetId = id;
      }
    }
    return targetId;
  }

  getMostTrusted(): string | null {
    let highestTrust = -1;
    let targetId: string | null = null;

    for (const [id, trust] of this.trustMatrix.entries()) {
      if (trust > highestTrust) {
        highestTrust = trust;
        targetId = id;
      }
    }
    return targetId;
  }
}
