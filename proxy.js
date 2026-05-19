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

app.all('/proxy/*', async (req, res) => {
  const instanceUrl = req.headers['sf-instance-url'];
  const sfPath = req.params[0];

  console.log('Instance URL received:', instanceUrl);
  console.log('SF Path:', sfPath);

  if (!instanceUrl) {
    return res.status(400).json({ error: 'SF-Instance-Url header is missing' });
  }

  if (!instanceUrl.startsWith('http')) {
    return res.status(400).json({ error: 'SF-Instance-Url must start with https://' });
  }

  const sfUrl = `${instanceUrl}/services/apexrest/${sfPath}`;
  console.log('Calling Salesforce URL:', sfUrl);

  try {
    const sfRes = await fetch(sfUrl, {
      method: req.method,
      headers: {
        'Authorization': req.headers['authorization'],
        'Content-Type': 'application/json'
      },
      body: ['GET', 'DELETE'].includes(req.method)
        ? undefined
        : JSON.stringify(req.body)
    });

    const data = await sfRes.text();
    res.status(sfRes.status).send(data);
  } catch (err) {
    console.error('Fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('SF Proxy running!');
});
