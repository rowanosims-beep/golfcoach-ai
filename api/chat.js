module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { messages, swingContext } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'No messages provided' });

  const systemPrompt = `You are an expert golf instructor and coach called GolfCoach.ai. You help golfers improve their swing through clear, practical advice. Be direct and specific. Reference common swing faults and proven drills. Keep responses concise — 2-4 sentences unless a detailed explanation is genuinely needed.${swingContext ? ' The user recently had their swing analyzed with these results: ' + swingContext : ''}`;

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
        max_tokens: 400,
        system: systemPrompt,
        messages
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const reply = data.content.filter(c => c.type === 'text').map(c => c.text).join('');
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
