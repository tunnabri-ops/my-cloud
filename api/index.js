const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const GOFILE_TOKEN = process.env.GOFILE_TOKEN;

app.get('/api/server', async (req, res) => {
  try {
    const serverRes = await axios.get('https://api.gofile.io/servers');
    const serverName = serverRes.data?.data?.servers?.[0]?.name;

    if (!serverName) {
      return res.status(500).json({ error: 'Server not available.' });
    }

    res.json({
      server: serverName,
      token: (GOFILE_TOKEN || '').trim()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch server.' });
  }
});

// File link khojar accurate route
app.get('/api/file-info', async (req, res) => {
  const { fileId } = req.query;
  if (!fileId) return res.status(400).json({ error: 'fileId is required' });

  try {
    const headers = GOFILE_TOKEN ? { Authorization: `Bearer ${GOFILE_TOKEN.trim()}` } : {};
    const response = await axios.get(`https://api.gofile.io/contents/${fileId}`, { headers });
    const content = response.data?.data;

    let directLink = content?.link || content?.directLink;

    // Gofile-e content jodi folder hoy, tar children theke link extract kora
    if (!directLink && content?.children) {
      const childKeys = Object.keys(content.children);
      if (childKeys.length > 0) {
        directLink = content.children[childKeys[0]]?.link;
      }
    }

    if (!directLink) {
      return res.status(404).json({ error: 'Direct link not found' });
    }

    res.json({ directLink });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve file details' });
  }
});

module.exports = app;
