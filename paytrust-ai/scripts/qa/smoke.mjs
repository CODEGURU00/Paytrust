import { createSessionCookie, appFetch } from './lib/sessions.mjs';

const roles = {
  buyer: 'buyer@paytrust.demo',
  seller: 'seller@paytrust.demo',
  witness: 'witness@paytrust.demo',
};

const password = process.env.DEMO_PASSWORD || 'PayTrustDemo123!';

const sessions = {};
for (const [role, email] of Object.entries(roles)) {
  sessions[role] = await createSessionCookie(email, password);
  console.log(`${role}: signed in as ${sessions[role].userId}`);
}

for (const [role, session] of Object.entries(sessions)) {
  const result = await appFetch(session.cookieHeader, '/api/transactions');
  const count = Array.isArray(result.body?.data) ? result.body.data.length : 'n/a';
  console.log(`${role} GET /api/transactions -> ${result.status} count=${count}`);
  if (result.status !== 200) console.log(JSON.stringify(result.body).slice(0, 500));

  const passport = await appFetch(session.cookieHeader, '/api/trust-passport');
  console.log(`${role} GET /api/trust-passport -> ${passport.status}`);
  if (passport.status !== 200) console.log(JSON.stringify(passport.body).slice(0, 500));
}
