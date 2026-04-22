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
    imageContent.push({ type: 'text', text: `Frame ${i + 1} of ${frames.length}:` });
    imageContent.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } });
  });

  imageContent.push({
    type: 'text',
    text: `You are a strict, experienced golf instructor. You have been given ${frames.length} frames extracted evenly across a golf swing video.

STEP 1 — IDENTIFY THE BEST FRAMES:
From these ${frames.length} frames, identify which frame numbers best represent:
- Address/Setup (golfer at the ball before swing starts)
- Top of Backswing (club at highest point)
- Impact (moment of club-ball contact or nearest to it)
- Follow-through (post-impact finish position)

If you cannot clearly identify a phase, use the closest available frame.

STEP 2 — SCORE AND ANALYZE:
Score each metric based on what you actually observe across all frames.

SCORING RULES:
- Most amateur golfers score 30-65. Only score above 80 for genuinely strong technique
- Each metric MUST have a different score
- Be honest — if something looks bad, score it 20-45
- Scoring: 0-30 major fault, 31-50 significant issues, 51-65 average amateur, 66-79 solid amateur, 80-90 strong technique, 91-100 tour-level

Return ONLY valid JSON, no markdown, no backticks:
{
  "identified_frames": {
    "address": [frame number 1-${frames.length}],
    "backswing": [frame number 1-${frames.length}],
    "impact": [frame number 1-${frames.length}],
    "follow_through": [frame number 1-${frames.length}]
  },
  "scores": {
    "posture": [honest score],
    "club_path": [honest score],
    "hip_rotation": [honest score],
    "tempo": [honest score]
  },
  "feedback": [
    {
      "category": "Posture and Setup",
      "status": "good",
      "summary": "One specific sentence referencing what you see in the address frame.",
      "detail": "Two to three sentences with specific observations about spine angle, knee flex, and stance width.",
      "drill": "Drill name: one sentence description."
    },
    {
      "category": "Backswing",
      "status": "warn",
      "summary": "One specific sentence about the backswing frame.",
      "detail": "Two to three sentences about club position, shoulder turn, and weight shift.",
      "drill": "Drill name: one sentence description."
    },
    {
      "category": "Impact Zone",
      "status": "warn",
      "summary": "One specific sentence about the impact frame.",
      "detail": "Two to three sentences about hand position, hip clearance, and club face at impact.",
      "drill": "Drill name: one sentence description."
    },
    {
      "category": "Hip Rotation and Power",
      "status": "bad",
      "summary": "One specific sentence about hip movement across the swing.",
      "detail": "Two to three sentences about hip turn, sequencing, and power generation.",
      "drill": "Drill name: one sentence description."
    },
    {
      "category": "Follow Through",
      "status": "good",
      "summary": "One specific sentence about the follow-through frame.",
      "detail": "Two to three sentences about finish position, balance, and extension.",
      "drill": "Drill name: one sentence description."
    }
  ]
}

Status: "good" = score 66+, "warn" = 40-65, "bad" = under 40.`
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
        max_tokens: 2500,
        messages: [{ role: 'user', content: imageContent }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const rawText = data.content.filter(c => c.type === 'text').map(c => c.text).join('');
    
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Could not parse AI response' });
    
    const result = JSON.parse(jsonMatch[0]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
