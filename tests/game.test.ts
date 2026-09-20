import { describe, it, expect } from "bun:test";
import { getRoleDistribution, initializePlayers } from "../src/engine/rules.ts";
import { checkVictory } from "../src/engine/victory.ts";
import { AgentMemory } from "../src/agent/memory.ts";
import { GameEngine } from "../src/engine/game.ts";
import { MockLLMProvider } from "../src/agent/llm.ts";
import { analyzeMatch } from "../src/analytics/metrics.ts";
import type { Player } from "../src/types/index.ts";

describe("Hermes Colosseum Rules & Logic", () => {
  it("distributes roles fairly according to player count", () => {
    const roles5 = getRoleDistribution(5);
    expect(roles5.length).toBe(5);
    expect(roles5.filter((r) => r === "werewolf").length).toBe(1);
    expect(roles5.filter((r) => r === "seer").length).toBe(1);
    expect(roles5.filter((r) => r === "doctor").length).toBe(1);
    expect(roles5.filter((r) => r === "villager").length).toBe(2);

    const roles6 = getRoleDistribution(6);
    expect(roles6.filter((r) => r === "werewolf").length).toBe(2);
  });

  it("evaluates victory conditions correctly", () => {
    const players: Player[] = [
      { id: "1", name: "P1", role: "werewolf", isAlive: true, isAI: true, model: "m" },
      { id: "2", name: "P2", role: "villager", isAlive: true, isAI: true, model: "m" },
    ];

    // 1 Wolf vs 1 Villager -> Werewolves win (equal or greater)
    expect(checkVictory(players)).toBe("werewolves");

    // Wolf dies -> Villagers win
    players[0].isAlive = false;
    expect(checkVictory(players)).toBe("villagers");
  });

  it("updates and clamps trust scores properly", () => {
    const mem = new AgentMemory("p-1", ["p-1", "p-2", "p-3"]);
    expect(mem.getTrust("p-2")).toBe(50);

    mem.adjustTrust("p-2", +30, "supported argument");
    expect(mem.getTrust("p-2")).toBe(80);

    mem.adjustTrust("p-2", +50, "overshoot");
    expect(mem.getTrust("p-2")).toBe(100);

    mem.adjustTrust("p-3", -80, "contradicted seer");
    expect(mem.getTrust("p-3")).toBe(0);

    expect(mem.getMostSuspected()).toBe("p-3");
    expect(mem.getMostTrusted()).toBe("p-2");
  });

  it("runs full match simulation and produces analytics report", async () => {
    const llm = new MockLLMProvider();
    const engine = new GameEngine(llm);
    engine.setup(["Hermes", "Alice", "Bob", "Charlie", "Dave"], true);

    const matchState = await engine.runFullMatch(3);
    expect(matchState.winner).not.toBeNull();
    expect(matchState.rounds.length).toBeGreaterThan(0);

    const report = analyzeMatch(matchState);
    expect(report.winner).toBe(matchState.winner!);
    expect(report.players.length).toBe(5);
    expect(report.mvp).toBeTruthy();
  });
});
