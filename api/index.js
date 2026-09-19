const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const GOFILE_TOKEN = process.env.GOFILE_TOKEN;

// Gofile server ও token পাওয়ার API রুট
app.get('/api/server', async (req, res) => {
  try {
    const serverRes = await axios.get('https://api.gofile.io/servers');
    const serverName = serverRes.data?.data?.servers?.[0]?.name;

    if (!serverName) {
      return res.status(500).json({ error: 'Gofile server not found.' });
    }

    res.json({
      server: serverName,
      token: (GOFILE_TOKEN || '').trim()
    });
  } catch (error) {
    console.error('Error fetching Gofile server:', error?.message);
    res.status(500).json({ error: 'Failed to fetch Gofile server.' });
  }
});

module.exports = app;
