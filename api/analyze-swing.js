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
    text: `You are an experienced golf instructor analyzing a real swing. You have ${frames.length} frames from a golf swing video.

STEP 1 — IDENTIFY FRAMES:
Identify which frame numbers best represent: Address, Top of Backswing, Impact, Follow-through. If unclear, use the closest available frame.

STEP 2 — OBSERVE BEFORE SCORING:
Before assigning any score, describe exactly what you see for each metric. Your score must be justified by your observation. Do not anchor to a default range.

WHAT TO LOOK FOR AND HOW TO SCORE:

POSTURE — Look at spine angle at address vs impact. Does it stay consistent? Are the knees flexed? Is the head staying relatively still?
- If spine angle holds steady and setup looks athletic: 68-80
- If minor posture loss or slight stand-up at impact: 55-67
- If clear early extension, standing up through impact, or head lifting dramatically: 40-54
- If severe posture collapse affecting the whole swing: 25-39

CLUB PATH — Look at the takeaway direction and the angle of attack through impact. Is the club coming from inside, outside, or on plane?
- If path looks controlled and on plane: 68-80
- If slight outside-in or inside-out but manageable: 55-67
- If clearly over-the-top or too far inside creating compensation: 40-54
- If severe path fault visible in multiple frames: 25-39
- If camera angle prevents assessment: score 57 and note this

HIP ROTATION — Look at how the hips move. Do they rotate on the backswing? Do they lead or stall on the downswing? Is there separation between hips and shoulders?
- If hips clearly lead downswing with good rotation through impact: 68-80
- If some hip turn present but arms dominate or hips stall: 55-67
- If minimal hip rotation, upper body throws at ball: 40-54
- If reverse pivot or no hip movement: 25-39

TEMPO — Look at the overall rhythm across frames. Does the backswing look rushed? Is there a smooth transition or a snatch from the top?
- If rhythm looks smooth and controlled: 68-80
- If slight rushing but generally consistent: 55-67
- If clear rushing at transition or jerky movement: 40-54
- If severely rushed or decelerated: 25-39

CRITICAL SCORING RULES:
1. Every metric MUST have a different score — no two can be identical
2. Your scores must reflect genuine differences in what you observe
3. If one metric looks clearly better than another, the scores must reflect that gap
4. Do not default to the same range for everything — spread your scores based on actual observation
5. A 17 handicap golfer typically has 1-2 metrics that are decent and 1-2 that need real work

Return ONLY valid JSON, no markdown, no backticks:
{
  "identified_frames": {
    "address": [frame number 1-${frames.length}],
    "backswing": [frame number 1-${frames.length}],
    "impact": [frame number 1-${frames.length}],
    "follow_through": [frame number 1-${frames.length}]
  },
  "scores": {
    "posture": [score based on your observation],
    "club_path": [score based on your observation],
    "hip_rotation": [score based on your observation],
    "tempo": [score based on your observation]
  },
  "feedback": [
    {
      "category": "Posture and Setup",
      "status": "good",
      "summary": "One specific sentence describing what you actually see in the address frame.",
      "detail": "Two to three sentences with concrete observations — mention specific body parts and positions.",
      "drill": "Drill name: one sentence description of the drill."
    },
    {
      "category": "Backswing",
      "status": "warn",
      "summary": "One specific sentence about what you see at the top of the backswing.",
      "detail": "Two to three sentences about club position, shoulder turn, weight shift.",
      "drill": "Drill name: one sentence description."
    },
    {
      "category": "Impact Zone",
      "status": "warn",
      "summary": "One specific sentence about what you observe at impact.",
      "detail": "Two to three sentences about hand position, hip clearance, club face.",
      "drill": "Drill name: one sentence description."
    },
    {
      "category": "Hip Rotation and Power",
      "status": "bad",
      "summary": "One specific sentence about hip movement across the swing.",
      "detail": "Two to three sentences about sequencing and power generation.",
      "drill": "Drill name: one sentence description."
    },
    {
      "category": "Follow Through",
      "status": "good",
      "summary": "One specific sentence about the finish position.",
      "detail": "Two to three sentences about balance, extension and finish.",
      "drill": "Drill name: one sentence description."
    }
  ]
}

Status values must match scores: "good" if score 65+, "warn" if 45-64, "bad" if under 45.`
  });

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
