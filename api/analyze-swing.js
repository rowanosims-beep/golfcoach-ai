module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { frames, frameLabels } = req.body;
  if (!frames || !frames.length) return res.status(400).json({ error: 'No frames provided' });

  const imageContent = [];
  frames.forEach((b64, i) => {
    imageContent.push({ type: 'text', text: `Frame ${i + 1}: ${frameLabels[i]}` });
    imageContent.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } });
  });

  imageContent.push({
    type: 'text',
    text: `You are a PGA-certified golf instructor. Analyze these ${frames.length} frames showing: ${frameLabels.join(', ')}.

Return ONLY valid JSON, no markdown, no backticks, no preamble:
{
  "scores": {
    "posture": 78,
    "club_path": 65,
    "hip_rotation": 72,
    "tempo": 80
  },
  "feedback": [
    {
      "category": "Posture and Setup",
      "status": "good",
      "summary": "One sentence assessment.",
      "detail": "Two to three sentences of specific coaching observations based on visible body positions.",
      "drill": "Drill name: brief description of the drill to practice."
    },
    {
      "category": "Backswing",
      "status": "warn",
      "summary": "One sentence assessment.",
      "detail": "Two to three sentences of specific coaching observations.",
      "drill": "Drill name: brief description."
    },
    {
      "category": "Impact Zone",
      "status": "warn",
      "summary": "One sentence assessment.",
      "detail": "Two to three sentences of specific coaching observations.",
      "drill": "Drill name: brief description."
    },
    {
      "category": "Hip Rotation and Power",
      "status": "bad",
      "summary": "One sentence assessment.",
      "detail": "Two to three sentences of specific coaching observations.",
      "drill": "Drill name: brief description."
    },
    {
      "category": "Follow Through",
      "status": "good",
      "summary": "One sentence assessment.",
      "detail": "Two to three sentences of specific coaching observations.",
      "drill": "Drill name: brief description."
    }
  ]
}

Status values: "good" = solid, "warn" = needs improvement, "bad" = major fault. Scores are integers 0-100.`
  });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: imageContent }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const rawText = data.content.filter(c => c.type === 'text').map(c => c.text).join('');
    const clean = rawText.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
