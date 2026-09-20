import type { MatchState, MatchReport } from "../types/index.ts";

export function generateMarkdownReport(report: MatchReport, state: MatchState): string {
  let md = `# Hermes Colosseum - Match Report 🏛️\n\n`;
  md += `**Match ID:** \`${report.matchId}\`  \n`;
  md += `**Victor:** **${report.winner.toUpperCase()}**  \n`;
  md += `**Total Rounds:** ${report.totalRounds}  \n`;
  md += `**Match MVP:** **${report.mvp}**  \n\n`;

  md += `## 👥 Player Scorecards & Social Metrics\n\n`;
  md += `| Player | Role | Status | Deception Score | Influence Index | Statements |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  for (const p of report.players) {
    const status = p.survived ? "🟢 Survived" : "💀 Eliminated";
    md += `| **${p.name}** | \`${p.role}\` | ${status} | **${p.deceptionScore}%** | **${p.influenceIndex} votes swayed** | ${p.totalStatements} |\n`;
  }

  md += `\n## ⚔️ Key Turning Points\n\n`;
  for (const tp of report.keyTurningPoints) {
    md += `- ${tp}\n`;
  }

  md += `\n## 📜 Dialogue & Inner Thoughts Log\n\n`;
  for (const round of state.rounds) {
    md += `### Round ${round.roundNumber}\n\n`;
    for (const s of round.statements) {
      md += `**${s.speakerName}:** "${s.publicUtterance}"  \n`;
      md += `> 🧠 *Inner Mastermind Plan:* ${s.innerThought} *(Tactic: \`${s.tactic}\`)*\n\n`;
    }
  }

  return md;
}

export function generateInteractiveHTML(report: MatchReport, state: MatchState): string {
  const jsonState = JSON.stringify(state);
  const jsonReport = JSON.stringify(report);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hermes Colosseum - Match Analysis (${report.matchId})</title>
  <style>
    :root {
      --bg: #0d1117;
      --card: #161b22;
      --border: #30363d;
      --text: #c9d1d9;
      --accent: #58a6ff;
      --red: #f85149;
      --green: #3fb950;
      --purple: #bc8cff;
      --gold: #d29922;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
    }
    header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    h1 { margin: 0 0 8px 0; color: #fff; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
    }
    .badge-win { background: #238636; color: #fff; }
    .badge-mvp { background: var(--gold); color: #000; font-weight: bold; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th { color: #8b949e; font-size: 13px; text-transform: uppercase; }
    .dialogue-box {
      margin-bottom: 14px;
      padding: 12px;
      background: #090d13;
      border-left: 3px solid var(--accent);
      border-radius: 4px;
    }
    .thought-box {
      margin-top: 6px;
      padding: 8px 12px;
      background: #1c182a;
      border-left: 3px solid var(--purple);
      border-radius: 4px;
      font-size: 13px;
      color: #d2a8ff;
    }
    .tactic-tag {
      font-size: 11px;
      background: #382559;
      color: #e2c5ff;
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 6px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🏛️ Hermes Colosseum: Match Forensic Replay</h1>
      <p>
        <span class="badge badge-win">Victor: ${report.winner.toUpperCase()}</span>
        <span class="badge badge-mvp">MVP: ${report.mvp}</span>
        <span style="color: #8b949e; margin-left: 12px;">Match ID: ${report.matchId}</span>
      </p>
    </header>

    <h2>📊 Player Performance & Deception Matrix</h2>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Role</th>
            <th>Status</th>
            <th>Deception Rating</th>
            <th>Influence (Votes Swayed)</th>
          </tr>
        </thead>
        <tbody>
          ${report.players
            .map(
              (p) => `
            <tr>
              <td><strong>${p.name}</strong></td>
              <td><code>${p.role}</code></td>
              <td>${p.survived ? "<span style='color:var(--green)'>Alive</span>" : "<span style='color:var(--red)'>Eliminated</span>"}</td>
              <td><strong>${p.deceptionScore}%</strong></td>
              <td><strong>${p.influenceIndex} votes</strong></td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <h2>⚔️ Dual-Layer Dialogue & Stream of Consciousness</h2>
    ${state.rounds
      .map(
        (r) => `
      <div class="card" style="margin-bottom: 16px;">
        <h3>Round ${r.roundNumber}</h3>
        ${r.statements
          .map(
            (s) => `
          <div class="dialogue-box">
            <strong>${s.speakerName}</strong>: "${s.publicUtterance}"
            <div class="thought-box">
              🧠 <em>Inner Thought:</em> ${s.innerThought}
              <span class="tactic-tag">${s.tactic}</span>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `
      )
      .join("")}
  </div>
</body>
</html>`;
}
