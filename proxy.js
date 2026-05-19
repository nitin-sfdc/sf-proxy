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
  const sfUrl = `${instanceUrl}/services/apexrest/${sfPath}`;

  try {
    const response = await fetch(sfUrl, {
      method: req.method,
      headers: {
        'Authorization': req.headers['authorization'],
        'Content-Type': 'application/json'
      },
      body: ['GET', 'DELETE'].includes(req.method)
        ? undefined
        : JSON.stringify(req.body)
    });
    const data = await response.text();
    res.status(response.status).send(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('SF Proxy running!');
});
