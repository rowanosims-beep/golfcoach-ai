const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ozpgpahlksqpucweixwf.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;
    const credits = parseInt(session.metadata.credits);

    if (userId) {
      const { data } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();

      const current = data?.credits || 0;
      await supabase
        .from('profiles')
        .upsert({ id: userId, credits: current + credits });
    }
  }

  res.json({ received: true });
};
