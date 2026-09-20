import { c } from "./colors.ts";
import type { Player, Statement, NightResult } from "../types/index.ts";

export class TerminalUI {
  printHeader() {
    console.log(`\n${c.bold}${c.magenta}╔══════════════════════════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.bold}${c.magenta}║${c.reset}  🏛️  ${c.bold}${c.cyan}HERMES COLOSSEUM${c.reset} — Multi-Agent Social Deduction & Deception   ${c.bold}${c.magenta}║${c.reset}`);
    console.log(`${c.bold}${c.magenta}╚══════════════════════════════════════════════════════════════════════╝${c.reset}\n`);
  }

  printRoundtable(players: Player[]) {
    console.log(`${c.bold}👥 Village Roundtable Status:${c.reset}`);
    const cards = players.map((p) => {
      const statusIcon = p.isAlive ? `${c.green}● ALIVE${c.reset}` : `${c.red}✖ DEAD${c.reset}`;
      const roleStr = `${c.gray}(${p.role})${c.reset}`;
      const nameStr = p.isHermesMastermind
        ? `${c.bold}${c.magenta}★ ${p.name} [HERMES]${c.reset}`
        : `${c.bold}${c.white}${p.name}${c.reset}`;
      return `  [${p.id}] ${nameStr} ${roleStr} ${statusIcon}`;
    });
    console.log(cards.join("\n"));
    console.log("");
  }

  printPhase(phaseName: string, round: number) {
    console.log(
      `${c.bold}${c.yellow}───────────────── [ ROUND ${round}: ${phaseName.toUpperCase()} ] ─────────────────${c.reset}`
    );
  }

  printStatement(stmt: Statement) {
    console.log(`\n${c.bold}${c.cyan}🗣️  ${stmt.speakerName}:${c.reset} "${stmt.publicUtterance}"`);
    console.log(
      `   ${c.magenta}🧠 Inner Monologue:${c.reset} ${c.italic}${stmt.innerThought}${c.reset} ${c.gray}[Tactic: ${stmt.tactic}]${c.reset}`
    );
  }

  printNightResult(res: NightResult, players: Player[]) {
    if (res.killedPlayerId) {
      const victim = players.find((p) => p.id === res.killedPlayerId);
      console.log(`\n${c.bold}${c.red}🩸 Night Terror:${c.reset} ${victim?.name || "A player"} was found eliminated this morning!`);
    } else {
      console.log(`\n${c.bold}${c.green}🛡️ Peaceful Night:${c.reset} The Doctor successfully protected the victim! Zero casualties.`);
    }
    console.log("");
  }

  printVoteResults(votes: Record<string, string>, eliminated: Player | null, players: Player[]) {
    console.log(`\n${c.bold}⚖️  Voting Breakdown:${c.reset}`);
    for (const [voterId, targetId] of Object.entries(votes)) {
      const voter = players.find((p) => p.id === voterId);
      const target = players.find((p) => p.id === targetId);
      console.log(`   ${voter?.name} voted for ➜ ${c.bold}${target?.name || targetId}${c.reset}`);
    }

    if (eliminated) {
      console.log(`\n${c.bold}${c.red}⚡ Village Verdict:${c.reset} ${eliminated.name} (${eliminated.role}) was executed by majority vote!`);
    } else {
      console.log(`\n${c.bold}${c.yellow}⚡ Village Verdict:${c.reset} Vote resulted in a tie! No one was executed today.`);
    }
    console.log("");
  }

  printVictory(winner: "werewolves" | "villagers") {
    console.log(`\n${c.bold}${c.green}══════════════════════════════════════════════════════════════════════${c.reset}`);
    if (winner === "werewolves") {
      console.log(`${c.bold}${c.red}🐺 GAME OVER: The Werewolves have overpowered the village!${c.reset}`);
    } else {
      console.log(`${c.bold}${c.green}🏆 GAME OVER: The Villagers successfully rooted out all wolves!${c.reset}`);
    }
    console.log(`${c.bold}${c.green}══════════════════════════════════════════════════════════════════════${c.reset}\n`);
  }
}
