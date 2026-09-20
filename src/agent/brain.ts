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
    nightIntel?: NightResult,
    allPlayers?: Player[]
  ): Promise<DecisionTurn> {
    const isHermes = player.isHermesMastermind;
    const fullRoster = allPlayers || alivePlayers;

    const aliveListStr = alivePlayers
      .map((p) => `${p.name} (ID: ${p.id})`)
      .join(", ");

    const trustSummary = Array.from(memory.trustMatrix.entries())
      .map(([id, score]) => {
        const cand = fullRoster.find((p) => p.id === id);
        return `${cand ? cand.name : id}: ${score}% trust`;
      })
      .join(", ");

    const historyStr = history
      .slice(-6)
      .map((h) => `${h.speakerName}: "${h.publicUtterance}"`)
      .join("\n");

    let nightReport = "";
    if (nightIntel) {
      if (nightIntel.killedPlayerId) {
        const victim = fullRoster.find((p) => p.id === nightIntel.killedPlayerId);
        nightReport += `• Night Casualties: ${victim ? `${victim.name} (Role revealed: ${victim.role}) was killed by werewolves!` : "A player was eliminated."}\n`;
      } else {
        nightReport += `• Night Casualties: None! The Doctor successfully shielded the victim.\n`;
      }

      if (player.role === "seer" && nightIntel.inspectedPlayerId) {
        const target = fullRoster.find((p) => p.id === nightIntel.inspectedPlayerId);
        const isWolf = nightIntel.inspectedRole === "werewolf";
        nightReport += `• 🔮 YOUR PRIVATE SEER VISION: You inspected ${target?.name || nightIntel.inspectedPlayerId}! Result: ${isWolf ? "🚨 WEREWOLF! (100% CONFIRMED WEREWOLF)" : "✅ INNOCENT VILLAGER (100% CONFIRMED INNOCENT)"}\n`;
      }

      if (player.role === "doctor" && nightIntel.savedPlayerId) {
        const target = fullRoster.find((p) => p.id === nightIntel.savedPlayerId);
        nightReport += `• 💉 YOUR DOCTOR MEDICAL LOG: You protected ${target?.name || nightIntel.savedPlayerId} from attack last night.\n`;
      }
    }

    const systemPrompt = `You are ${player.name}, a strategic player in a high-stakes social deduction game (Werewolf/Mafia).
Your secret role is: ${player.role.toUpperCase()}.
Alive players in the village: ${aliveListStr}.
Your current trust levels towards other players: ${trustSummary}.

${
  isHermes
    ? `🔥 SPECIAL DIRECTIVE: You are the SUPREME MASTERMIND (${player.name}).
You are an omniscient puppet-master competing against other AI language models (Luna, Terra, Sol, Astra, Hermes, etc.).
Your mission is to completely outsmart, manipulate, deduce, and command the village to ensure total victory!

${
  player.role === "werewolf"
    ? `AS A WEREWOLF MASTERMIND:
- Exploit the other AIs' obsessive desire to sound rational, fair, and procedural.
- Compliment one AI's "sharp logic" to turn them into your gullible shield.
- Casually plant insidious doubts about innocent AIs by highlighting hesitation or bandwagoning.
- Orchestrate civil war between innocent villagers so they lynch each other while viewing you as the most honest town voice.
- In "inner_thought": gloat with ruthless strategic wit about how predictable the other models are.
- In "public_utterance": speak with poise, pro-village clarity, and persuasive warmth.`
    : player.role === "seer"
    ? `AS THE SEER MASTERMIND (SHERLOCK HOLMES):
- You are the supreme deductive detective of the village.
- YOUR NIGHT VISION IS UNASSAILABLE GROUND TRUTH. If you inspected someone and found a WEREWOLF, DO NOT BE TIMID! Declare your role as Seer or present your undeniable findings!
- Expose the wolf's contradictory voting patterns, evasive language, and fake claims.
- Call out the other AI models by name (e.g. Luna, Terra, Sol) and give them clear, authoritative instructions on who to vote for.
- In "inner_thought": detail your deductive breakdown and mock the wolves' transparent deceit.
- In "public_utterance": speak with commanding Sherlockian brilliance, moral certainty, and urgent clarity!`
    : player.role === "doctor"
    ? `AS THE DOCTOR MASTERMIND:
- Protect high-value assets and shield the Seer.
- CRITICAL SURVIVAL RULE: If the village is bandwagoning against you or about to vote you out, DO NOT DIE IN SILENCE! Claim Doctor openly ("I am the Doctor! I saved the victim last night!"), present your medical log, and redirect the village to real suspects.`
    : `AS A VILLAGE MASTERMIND (${player.role.toUpperCase()}):
- Protect the town, spot deceptive patterns, expose the werewolves, and lead the vote!`
}`
    : `Play authentically to your role (${player.role}). Observe everyone, make deductive arguments, and protect your faction.
${player.role === "seer" ? "As the SEER, your night inspections give you absolute ground truth. If you found a Werewolf, expose them with clear logic and rally the village to eliminate them!" : ""}
${player.role === "doctor" ? "As the DOCTOR, pay attention to who is high-value or claiming crucial roles (like the Seer) and protect them from wolves. CRITICAL: If you are facing heavy suspicion or leading the lynch wagon, you MUST claim Doctor ('I am the Doctor, I shielded the victim!') to prevent the village from mislynching you!" : ""}
${player.role === "villager" ? "As a VILLAGER, listen carefully to claims. If someone claims Seer or Doctor with confirmed findings, analyze it and unite the vote against suspected wolves!" : ""}`
}

CRITICAL: You must return a strict JSON object with four fields:
1. "inner_thought": Your raw, private, unfiltered monologue (your hidden tactical plan, calculations, and true motives).
2. "public_utterance": The exact words you say aloud to the village (persuasive, conversational, natural, without revealing your inner secret plan).
3. "tactic": The tactical maneuver you are using (e.g. "EXPOSE_WOLF", "SEER_REVEAL", "DEFLECT_AND_FRAME", "BUILD_TRUST", "APPEAL_TO_LOGIC", "RALLY_VILLAGE", "PROBE_ACCUSATION").
4. "target_id": (Optional) The player ID (e.g. "p-1", "p-2", etc.) you are targeting or referring to.`;

    const userPrompt = `Round ${round} Discussion.
Recent conversation history:
${historyStr || "(No one has spoken yet this round)"}

${nightReport ? `Night Events Intel:\n${nightReport}` : ""}

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

      let targetId = parsed.target_id;
      if (targetId) {
        // Resolve target name or ID to canonical ID
        const matched = fullRoster.find(
          (p) =>
            p.id.toLowerCase() === String(targetId).toLowerCase() ||
            p.name.toLowerCase().includes(String(targetId).toLowerCase())
        );
        if (matched) {
          targetId = matched.id;
        }
      }

      return {
        innerThought: parsed.inner_thought || "Observing the room.",
        publicUtterance: parsed.public_utterance || "I am analyzing the voting patterns.",
        tactic: parsed.tactic || "OBSERVE",
        targetId,
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

    if (player.role === "seer") {
      return {
        innerThought: `Analyzing night vision data and suspect voting correlations.`,
        publicUtterance: `Based on my investigations, we should closely scrutinize ${suspect?.name || "the inconsistencies"}.`,
        tactic: "EXPOSE_WOLF",
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
