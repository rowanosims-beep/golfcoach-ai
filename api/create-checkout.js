const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { product, userId } = req.body;
  const products = {
    single: { price: 299, name: '1 Swing Analysis', credits: 1 },
    pack: { price: 899, name: '5 Swing Analyses', credits: 5 }
  };

  const item = products[product];
  if (!item) return res.status(400).json({ error: 'Invalid product' });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price_data: { currency: 'usd', product_data: { name: item.name }, unit_amount: item.price }, quantity: 1 }],
    mode: 'payment',
    success_url: `https://golfcoach-ai.vercel.app?payment=success&credits=${item.credits}`,
    cancel_url: `https://golfcoach-ai.vercel.app?payment=cancelled`,
    metadata: { userId: userId || '', credits: item.credits }
  });

  res.json({ url: session.url });
};
