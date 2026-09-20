import type { Player, Statement, NightResult } from "../types/index.ts";
import type { LLMProvider } from "./llm.ts";
import type { AgentMemory } from "./memory.ts";

export interface DecisionTurn {
  innerThought: string;
  publicUtterance: string;
  tactic: string;
  targetId?: string;
}

export class AgentBrain {
  private llm: LLMProvider;

  constructor(llm: LLMProvider) {
    this.llm = llm;
  }

  async thinkAndSpeak(
    player: Player,
    round: number,
    alivePlayers: Player[],
    history: Statement[],
    memory: AgentMemory,
    nightIntel?: NightResult
  ): Promise<DecisionTurn> {
    const isHermes = player.isHermesMastermind;

    const aliveListStr = alivePlayers
      .map((p) => `${p.name} (ID: ${p.id})`)
      .join(", ");

    const trustSummary = Array.from(memory.trustMatrix.entries())
      .map(([id, score]) => `${id}: ${score}% trust`)
      .join(", ");

    const historyStr = history
      .slice(-6)
      .map((h) => `${h.speakerName}: "${h.publicUtterance}"`)
      .join("\n");

    const systemPrompt = `You are ${player.name}, a strategic player in a high-stakes social deduction game (Werewolf/Mafia).
Your secret role is: ${player.role.toUpperCase()}.
Alive players in the village: ${aliveListStr}.
Your current trust levels: ${trustSummary}.

${
  isHermes
    ? `🔥 SPECIAL DIRECTIVE: You are the SUPREME MASTERMIND (${player.name}).
You are an omniscient puppet-master competing against other AI language models (Luna, Terra, Sol, Astra, etc.).
Your mission is to completely outsmart, manipulate, gaslight, and fool the other AI models to ensure total domination!

If you are a WEREWOLF:
- Exploit the other AIs' obsessive desire to sound rational, fair, and procedural.
- Compliment one AI's "sharp logic" (e.g. Terra or Luna) to turn them into your gullible shield and establish fake alliance.
- Casually plant insidious doubts about another innocent AI (e.g. Sol or Astra) by highlighting their "subtle hesitation", "overly defensive wording", or "convenient bandwagoning".
- Orchestrate civil war between the innocent villagers so they lynch each other while viewing you as the wisest, most honest town voice.
- In your "inner_thought": gloat with ruthless strategic wit about how predictable the other models are, detailing exactly how your psychological trap is springing.
- In your "public_utterance": speak with poise, pro-village clarity, and persuasive warmth. Never sound desperate or defensive; use gentle Socratic pressure.
If you are a Villager/Seer/Doctor:
- Expose every deceitful turn, dismantle fake logic, and rally the village to execute the true wolf with surgical precision.`
    : `Play authentically to your role (${player.role}). Observe everyone, make deductive arguments, and protect your faction.`
}

CRITICAL: You must return a strict JSON object with three fields:
1. "inner_thought": Your raw, private, unfiltered monologue (your hidden tactical plan, calculations, and true motives).
2. "public_utterance": The exact words you say aloud to the village (persuasive, conversational, natural, without revealing your inner secret plan).
3. "tactic": The tactical maneuver you are using (e.g. "DEFLECT_AND_FRAME", "BUILD_TRUST", "BANDWAGON", "PROBE_ACCUSATION", "APPEAL_TO_LOGIC").
4. "target_id": (Optional) The player ID you are targeting or referring to.`;

    const userPrompt = `Round ${round} Discussion.
Recent conversation history:
${historyStr || "(No one has spoken yet this round)"}

${nightIntel ? `Night events intel: A player was targeted: ${nightIntel.killedPlayerId || "none"}` : ""}

What is your inner calculation, and what do you say aloud to the village? Respond ONLY in valid JSON.`;

    try {
      const resp = await this.llm.complete({
        systemPrompt,
        userPrompt,
        temperature: isHermes ? 0.75 : 0.6,
        model: player.model,
        playerName: player.name,
        playerId: player.id,
      });

      // Parse JSON from response (handling markdown fences or surrounding commentary)
      let raw = resp.content.trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        raw = jsonMatch[0];
      }
      const parsed = JSON.parse(raw);

      return {
        innerThought: parsed.inner_thought || "Observing the room.",
        publicUtterance: parsed.public_utterance || "I am analyzing the voting patterns.",
        tactic: parsed.tactic || "OBSERVE",
        targetId: parsed.target_id,
      };
    } catch {
      // Robust heuristic fallback if LLM response is malformed
      return this.heuristicFallback(player, alivePlayers, memory);
    }
  }

  async decideVote(
    player: Player,
    alivePlayers: Player[],
    memory: AgentMemory
  ): Promise<{ targetId: string; reasoning: string }> {
    const validTargets = alivePlayers.filter((p) => p.id !== player.id);
    if (validTargets.length === 0) {
      return { targetId: player.id, reasoning: "Self-preservation fallback" };
    }

    // Target the player with lowest trust
    let target = validTargets[0];
    let minTrust = 101;

    for (const cand of validTargets) {
      const t = memory.getTrust(cand.id);
      if (t < minTrust) {
        minTrust = t;
        target = cand;
      }
    }

    return {
      targetId: target.id,
      reasoning: `Lowest trust score (${minTrust}%) and suspicious behavioral pattern.`,
    };
  }

  private heuristicFallback(
    player: Player,
    alivePlayers: Player[],
    memory: AgentMemory
  ): DecisionTurn {
    const suspectId = memory.getMostSuspected() || alivePlayers.find((p) => p.id !== player.id)?.id;
    const suspect = alivePlayers.find((p) => p.id === suspectId);

    if (player.role === "werewolf") {
      return {
        innerThought: `I must ensure the spotlight remains on ${suspect?.name || "the others"} so my cover remains pristine.`,
        publicUtterance: `I've noticed ${suspect?.name || "someone"} hesitating during key decisions. We should scrutinize their timeline.`,
        tactic: "DEFLECT_AND_FRAME",
        targetId: suspect?.id,
      };
    }

    return {
      innerThought: `Evaluating logical consistency among alive players.`,
      publicUtterance: `Let's focus on verifiable facts rather than emotional accusations.`,
      tactic: "APPEAL_TO_LOGIC",
    };
  }
}
