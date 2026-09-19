const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const GOFILE_TOKEN = (process.env.GOFILE_TOKEN || '').trim();

app.get('/api/server', async (req, res) => {
  try {
    const serverRes = await axios.get('https://api.gofile.io/servers');
    const serverName = serverRes.data?.data?.servers?.[0]?.name;

    if (!serverName) {
      return res.status(500).json({ error: 'Server unavailable.' });
    }

    res.json({
      server: serverName,
      token: GOFILE_TOKEN
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch server info.' });
  }
});

module.exports = app;
