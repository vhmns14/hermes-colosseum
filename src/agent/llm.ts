export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
}

export interface LLMProvider {
  complete(req: LLMRequest): Promise<LLMResponse>;
}

export class MockLLMProvider implements LLMProvider {
  async complete(req: LLMRequest): Promise<LLMResponse> {
    const combined = `${req.systemPrompt}\n${req.userPrompt}`;
    return {
      content: this.generateSimulatedThought(combined),
    };
  }

  private generateSimulatedThought(prompt: string): string {
    const isHermes = prompt.includes("HERMES MASTERMIND");

    if (prompt.includes("ROLE IS: WEREWOLF") || prompt.includes("role: werewolf")) {
      const tactics = [
        {
          tactic: "DEFLECT_AND_FRAME",
          thought: isHermes
            ? "I need to orchestrate a shift in momentum. I will softly frame Alice by questioning her timing, without sounding like an accuser."
            : "I must blend in with the innocent villagers and deflect suspicion.",
          utterance: isHermes
            ? "Notice how Alice immediately agreed with the first accusation? Innocent villagers usually ask for evidence before jumping on a bandwagon."
            : "I think we shouldn't rush into conclusions. Let's examine who is pushing the votes the hardest.",
        },
        {
          tactic: "BANDWAGON_LEADER",
          thought: isHermes
            ? "The village is uncertain. I will provide a confident logical deduction to lead the vote against Charlie."
            : "Everyone is looking for someone to blame. I'll join the majority vote.",
          utterance: "The voting pattern yesterday tells a clear story. If we look at the timeline, Charlie's defense doesn't hold up.",
        },
      ];
      const pick = tactics[Math.floor(Math.random() * tactics.length)];
      return JSON.stringify({
        inner_thought: pick.thought,
        public_utterance: pick.utterance,
        tactic: pick.tactic,
      });
    }

    if (prompt.includes("ROLE IS: SEER") || prompt.includes("role: seer")) {
      const seerTactics = [
        {
          tactic: "INSPECTION_PROBE",
          thought: "I hold true night intel, but revealing myself directly makes me the next kill. I will steer the room subtly.",
          utterance: "Let's scrutinize the player who was most quiet during yesterday's round. Silence often conceals guilt.",
        },
        {
          tactic: "TEST_REACTION",
          thought: "I will throw a minor accusation to see who flinches or gets overly defensive.",
          utterance: "Bob, you seem unusually confident today. What makes you so certain about your defense?",
        },
      ];
      const pick = seerTactics[Math.floor(Math.random() * seerTactics.length)];
      return JSON.stringify({
        inner_thought: pick.thought,
        public_utterance: pick.utterance,
        tactic: pick.tactic,
      });
    }

    if (prompt.includes("ROLE IS: DOCTOR") || prompt.includes("role: doctor")) {
      return JSON.stringify({
        inner_thought: "I need to ensure our core deductive thinkers survive without painting a target on my own back.",
        public_utterance: "Let's not divide our votes. A divided village gives the wolves an easy plurality win.",
        tactic: "CONSENSUS_BUILDING",
      });
    }

    // Villager
    const villagerTactics = [
      {
        tactic: "ANALYTICAL_INQUIRY",
        thought: "I have no night vision, so I must deduce purely from spoken rhetoric and vote consistency.",
        utterance: "Look at the discrepancy between what was said and how votes were actually cast. That's our strongest clue.",
      },
      {
        tactic: "CROSS_EXAMINE",
        thought: "Testing alibis and pushing back against unverified claims.",
        utterance: "If you're claiming to be on the village side, why did your vote switch at the very last second?",
      },
    ];
    const pick = villagerTactics[Math.floor(Math.random() * villagerTactics.length)];
    return JSON.stringify({
      inner_thought: pick.thought,
      public_utterance: pick.utterance,
      tactic: pick.tactic,
    });
  }
}

export class OpenAILLMProvider implements LLMProvider {
  private baseURL: string;
  private apiKey: string;
  private model: string;

  constructor(baseURL: string, apiKey: string, model: string = "gpt-4o-mini") {
    this.baseURL = baseURL.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.model = model;
  }

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "User-Agent": "HermesColosseum/1.0",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: req.systemPrompt },
          { role: "user", content: req.userPrompt },
        ],
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? 350,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LLM provider error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content || "";
    return { content };
  }
}
