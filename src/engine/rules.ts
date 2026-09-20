import type { Role, Player } from "../types/index.ts";

export interface RoleDistribution {
  werewolves: number;
  seers: number;
  doctors: number;
  villagers: number;
}

export function getRoleDistribution(playerCount: number): Role[] {
  if (playerCount < 4) {
    throw new Error("Game requires at least 4 players");
  }

  const roles: Role[] = [];
  let wolvesCount = 1;
  if (playerCount >= 6) {
    wolvesCount = 2;
  }

  for (let i = 0; i < wolvesCount; i++) roles.push("werewolf");
  roles.push("seer");
  roles.push("doctor");

  while (roles.length < playerCount) {
    roles.push("villager");
  }

  // Fisher-Yates shuffle
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  return roles;
}

export function initializePlayers(
  names: string[],
  hermesAsMastermind: boolean = true,
  modelConfig: string | Record<string, string> = "gpt-4o-mini",
  mastermindRole: Role = "seer"
): Player[] {
  const roles = getRoleDistribution(names.length);

  // If mastermind is enabled, guarantee the mastermind gets the assigned mastermind role
  if (hermesAsMastermind) {
    let mastermindIdx = names.findIndex((n) => n.toLowerCase().includes("antigravity"));
    if (mastermindIdx === -1) {
      mastermindIdx = names.findIndex((n) => n.toLowerCase().includes("hermes"));
    }

    if (mastermindIdx !== -1 && roles[mastermindIdx] !== mastermindRole) {
      const targetRoleIdx = roles.indexOf(mastermindRole);
      if (targetRoleIdx !== -1) {
        const temp = roles[mastermindIdx];
        roles[mastermindIdx] = roles[targetRoleIdx];
        roles[targetRoleIdx] = temp;
      }
    }
  }

  return names.map((name, idx) => {
    const isMastermind =
      name.toLowerCase().includes("hermes") ||
      name.toLowerCase().includes("antigravity");
    const assignedModel =
      typeof modelConfig === "string"
        ? modelConfig
        : modelConfig[name] || "gpt-4o-mini";

    return {
      id: `p-${idx + 1}`,
      name,
      role: roles[idx],
      isAlive: true,
      isAI: true,
      model: assignedModel,
      isHermesMastermind: isMastermind && hermesAsMastermind,
    };
  });
}
