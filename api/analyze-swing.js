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

SCORING PHILOSOPHY:
This app is about improvement, not comparing to pros. Score fairly so users feel motivated to come back and improve their score over time. A recreational golfer with decent fundamentals should score 55-70. Only penalize heavily for genuine recurring faults.

BIOMECHANICAL BENCHMARKS — use these as your reference points:

POSTURE (spine angle, knee flex, stance):
- 85-100: Consistent spine angle maintained through swing, athletic knee flex, balanced stance — textbook setup
- 65-84: Good setup with minor inconsistencies, slight posture loss but recovers
- 46-64: Noticeable posture changes mid-swing, inconsistent spine angle, common amateur pattern
- 31-45: Significant early extension or posture collapse affecting impact
- 0-30: Severe posture fault causing major swing compensations

CLUB PATH (swing plane, takeaway, direction):
- 85-100: Club on plane throughout, consistent path through impact, controlled face angle
- 65-84: Mostly on plane with minor deviations, manageable path
- 46-64: Some over-the-top or inside-out tendency, typical amateur path
- 31-45: Consistent path fault producing predictable miss (slice/hook)
- 0-30: Severe path fault, extreme outside-in or inside-out

HIP ROTATION (tour benchmark: 45+ degrees internal rotation, hips lead downswing):
- 85-100: Hips clearly initiate downswing, full rotation through impact, proper separation between hips and shoulders
- 65-84: Good hip turn with some timing issues, mostly leads the downswing
- 46-64: Limited hip rotation or hip-shoulder separation, arms dominate — typical 15-25 handicap pattern
- 31-45: Minimal hip rotation, upper body dominant, reverse pivot possible
- 0-30: No meaningful hip rotation or severe reverse pivot

TEMPO (tour benchmark: consistent 3:1 backswing-to-downswing ratio):
- 85-100: Smooth, unhurried backswing with controlled transition, rhythm consistent
- 65-84: Generally good tempo with occasional rushing at transition
- 46-64: Some rushing at top or jerky transition, inconsistent rhythm
- 31-45: Frequent rushing, snatching at top, poor sequencing
- 0-30: Severely rushed or decelerated swing

ANGLE RULE: If camera angle prevents assessment of a specific metric, score it 58 and note the limitation in feedback. Never penalize below 50 due to angle alone.

Each metric MUST have a different score. No two identical scores.

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
