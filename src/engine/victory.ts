import type { Player } from "../types/index.ts";

export function checkVictory(players: Player[]): "werewolves" | "villagers" | null {
  const alivePlayers = players.filter((p) => p.isAlive);
  const aliveWolves = alivePlayers.filter((p) => p.role === "werewolf");
  const aliveVillagers = alivePlayers.filter((p) => p.role !== "werewolf");

  if (aliveWolves.length === 0) {
    return "villagers";
  }

  if (aliveWolves.length >= aliveVillagers.length) {
    return "werewolves";
  }

  return null;
}
