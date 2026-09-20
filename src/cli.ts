#!/usr/bin/env bun
import { GameEngine } from "./engine/game.ts";
import { MockLLMProvider, OpenAILLMProvider, type LLMProvider } from "./agent/llm.ts";
import type { Role } from "./types/index.ts";
import { TerminalUI } from "./ui/terminal.ts";
import { analyzeMatch } from "./analytics/metrics.ts";
import { generateInteractiveHTML, generateMarkdownReport } from "./analytics/reporter.ts";
import { c } from "./ui/colors.ts";
import fs from "node:fs/promises";
import path from "node:path";

function parseArgs(args: string[]) {
  const flags: Record<string, string> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : "true";
      flags[key] = val;
    } else {
      positional.push(args[i]);
    }
  }
  return { flags, command: positional[0] || "sim" };
}

async function sleep(ms: number) {
  if (ms > 0) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

async function main() {
  const { flags, command } = parseArgs(process.argv.slice(2));
  const ui = new TerminalUI();

  ui.printHeader();

  const providerType = flags.provider || process.env.LLM_PROVIDER || (flags.vansrouter ? "vansrouter" : "mock");
  const isVansRouter = providerType === "vansrouter" || flags.vansrouter === "true" || flags.vansrouter === true;

  const baseURL =
    flags["base-url"] ||
    process.env.OPENAI_BASE_URL ||
    (isVansRouter ? "http://127.0.0.1:20128/v1" : "http://localhost:8787/v1");

  const apiKey =
    flags["api-key"] ||
    process.env.OPENAI_API_KEY ||
    (isVansRouter ? "none" : "mock-key");

  const defaultModel = flags.model || process.env.DEFAULT_MODEL || (isVansRouter ? "cx/gpt-5.6-terra" : "gpt-4o-mini");
  const outDir = flags.out || "./reports";

  let playerModels: Record<string, string> | undefined;
  let playerNames = ["Hermes (Mastermind)", "Alice", "Bob", "Charlie", "Dave"];

  if (isVansRouter) {
    playerNames = [
      "Antigravity (Mastermind)",
      "Hermes",
      "Luna",
      "Terra",
      "Sol",
      "Astra",
    ];
    playerModels = {
      "Antigravity (Mastermind)": "cx/gpt-5.6-terra",
      Hermes: "cx/gpt-5.5",
      Luna: "cx/gpt-5.6-luna",
      Terra: "cx/gpt-5.6-terra-review",
      Sol: "cx/gpt-5.5-review",
      Astra: "cx/gpt-5.6-luna-review",
    };
  }

  const mastermindRole = (flags["mastermind-role"] || flags.role || "seer") as Role;

  console.log(
    `${c.gray}Configuration:${c.reset} Provider: ${c.bold}${providerType}${c.reset} | Endpoint: ${c.cyan}${baseURL}${c.reset} | Mastermind Role: ${c.bold}${c.yellow}${mastermindRole.toUpperCase()}${c.reset}`
  );
  if (playerModels) {
    console.log(`${c.gray}Arena Roster (VansRouter Models):${c.reset}`);
    for (const [pName, mName] of Object.entries(playerModels)) {
      console.log(`  • ${pName.padEnd(22)} ➜ ${c.cyan}${mName}${c.reset}`);
    }
    console.log("");
  } else {
    console.log(`Model: ${c.bold}${defaultModel}${c.reset}\n`);
  }

  let llm: LLMProvider;
  if (isVansRouter || providerType === "openai" || providerType === "agentrouter") {
    llm = new OpenAILLMProvider(baseURL, apiKey, defaultModel, {
      playerModels,
      forceStream: isVansRouter || defaultModel.startsWith("cx/"),
    });
  } else {
    llm = new MockLLMProvider();
  }

  const engine = new GameEngine(llm, {
    onPhaseChange: (phase, round) => {
      ui.printPhase(phase, round);
    },
    onStatement: (stmt) => {
      const speaker = engine.state.players.find((p) => p.id === stmt.speakerId);
      ui.printStatement(stmt, speaker?.model);
    },
    onNightResult: (res) => {
      ui.printNightResult(res, engine.state.players);
    },
    onVoteResult: (votes, eliminated) => {
      ui.printVoteResults(votes, eliminated, engine.state.players);
    },
    onGameEnd: (winner) => {
      ui.printVictory(winner);
    },
  });

  engine.setup(playerNames, true, playerModels || defaultModel, mastermindRole);
  ui.printRoundtable(engine.state.players);

  const maxRounds = parseInt(flags.rounds || flags["max-rounds"] || "3", 10);
  const state = await engine.runFullMatch(maxRounds);

  // Post-match analytics
  const report = analyzeMatch(state);

  console.log(`${c.bold}═══════════════════ MATCH POST-MORTEM & ANALYTICS ═══════════════════${c.reset}`);
  console.log(`Victor:      ${c.bold}${c.cyan}${report.winner.toUpperCase()}${c.reset}`);
  console.log(`MVP:         ${c.bold}${c.yellow}${report.mvp}${c.reset}`);
  console.log(`Rounds:      ${report.totalRounds}\n`);

  console.log(`${c.bold}Player Scorecards:${c.reset}`);
  for (const p of report.players) {
    const status = p.survived ? `${c.green}ALIVE${c.reset}` : `${c.red}DEAD${c.reset}`;
    console.log(
      `  • ${c.bold}${p.name.padEnd(22)}${c.reset} [${p.role.padEnd(9)}] ${status} | Deception: ${c.cyan}${p.deceptionScore}%${c.reset} | Influence: ${c.yellow}${p.influenceIndex} votes swayed${c.reset}`
    );
  }

  // Save reports
  await fs.mkdir(outDir, { recursive: true });
  const mdPath = path.join(outDir, `${state.id}.md`);
  const htmlPath = path.join(outDir, `${state.id}.html`);

  await fs.writeFile(mdPath, generateMarkdownReport(report, state), "utf-8");
  await fs.writeFile(htmlPath, generateInteractiveHTML(report, state), "utf-8");

  console.log(`\n${c.green}✓ Match reports generated successfully:${c.reset}`);
  console.log(`  Markdown : ${c.bold}${mdPath}${c.reset}`);
  console.log(`  HTML View: ${c.bold}${htmlPath}${c.reset}\n`);
}

main().catch((err) => {
  console.error(`${c.red}Fatal execution error:${c.reset}`, err);
  process.exit(1);
});
