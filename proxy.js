const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, SF-Instance-Url');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Auth — username + password only ──────────────────────────
app.post('/auth', async (req, res) => {
  const { clientId, clientSecret, username, password } = req.body;

  const params = new URLSearchParams({
    grant_type:    'password',
    client_id:     clientId,
    client_secret: clientSecret,
    username:      username,
    password:      password      // no security token appended
  });

  try {
    const sfRes = await fetch(
      'https://login.salesforce.com/services/oauth2/token',
      { method: 'POST', body: params }
    );
    const data = await sfRes.json();
    if (data.access_token) {
      res.json({
        accessToken: data.access_token,
        instanceUrl: data.instance_url
      });
    } else {
      res.status(401).json({ error: data.error_description || 'Auth failed' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Proxy ─────────────────────────────────────────────────────
app.all('/proxy/*', async (req, res) => {
  const instanceUrl = req.headers['sf-instance-url'];
  const sfPath      = req.params[0];

  if (!instanceUrl || !instanceUrl.startsWith('http')) {
    return res.status(400).json({ error: 'SF-Instance-Url header missing or invalid' });
  }

  const sfUrl = `${instanceUrl}/services/apexrest/${sfPath}`;

  try {
    const sfRes = await fetch(sfUrl, {
      method:  req.method,
      headers: {
        'Authorization': req.headers['authorization'],
        'Content-Type':  'application/json'
      },
      body: ['GET', 'DELETE'].includes(req.method)
        ? undefined
        : JSON.stringify(req.body)
    });
    const data = await sfRes.text();
    res.status(sfRes.status).send(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('SF Proxy running!'));
