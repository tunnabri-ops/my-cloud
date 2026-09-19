const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const GOFILE_TOKEN = process.env.GOFILE_TOKEN;

// সার্ভার পাওয়ার রুট
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

// কোনো বাহ্যিক পেজ ছাড়াই ফাইলের সরাসরি স্ট্রিম/ডাউনলোড লিংক পাওয়ার রুট
app.get('/api/file-info', async (req, res) => {
  const { fileId } = req.query;
  if (!fileId) return res.status(400).json({ error: 'fileId is required' });

  try {
    const response = await axios.get(`https://api.gofile.io/contents/${fileId}`, {
      headers: GOFILE_TOKEN ? { Authorization: `Bearer ${GOFILE_TOKEN}` } : {}
    });

    const fileData = response.data?.data;
    const directLink = fileData?.link || fileData?.directLink;

    if (!directLink) {
      return res.status(404).json({ error: 'Direct link not ready or not found' });
    }

    res.json({ directLink });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve file details' });
  }
});

module.exports = app;
