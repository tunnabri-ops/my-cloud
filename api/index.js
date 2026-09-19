const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const GOFILE_TOKEN = (process.env.GOFILE_TOKEN || '').trim();

// 1. আপলোড সার্ভার পাওয়ার রুট
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
    res.status(500).json({ error: 'Failed to fetch server.' });
  }
});

// 2. সরাসরি ডাউনলোড ও ইন-সাইট প্রিভিউ রুট (401 ফিক্সড)
app.get('/api/download', async (req, res) => {
  const { fileId, fileName } = req.query;
  if (!fileId) return res.status(400).send('File ID required');

  try {
    // হেডার কনফিগারেশন (টোকেন থাকলে টোকেন হেডার পাঠাবে)
    const requestHeaders = {};
    if (GOFILE_TOKEN) {
      requestHeaders['Authorization'] = `Bearer ${GOFILE_TOKEN}`;
    }

    // Gofile contents API রিকোয়েস্ট
    const contentRes = await axios.get(`https://api.gofile.io/contents/${fileId}`, {
      headers: requestHeaders
    });

    const content = contentRes.data?.data;
    let directLink = content?.link || content?.directLink;

    // ফোল্ডার আকারে থাকলে চিলড্রেন থেকে আসল ফাইলের লিংক নেওয়া
    if (!directLink && content?.children) {
      const childKeys = Object.keys(content.children);
      if (childKeys.length > 0) {
        directLink = content.children[childKeys[0]]?.link;
      }
    }

    if (!directLink) {
      return res.status(404).send('Direct link not found');
    }

    // স্ট্রিমিং ডাউনলোড রিকোয়েস্ট
    const streamHeaders = {};
    if (GOFILE_TOKEN) {
      streamHeaders['Cookie'] = `accountToken=${GOFILE_TOKEN}`;
    }

    const fileStream = await axios({
      method: 'get',
      url: directLink,
      responseType: 'stream',
      headers: streamHeaders
    });

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName || 'download')}"`);
    res.setHeader('Content-Type', fileStream.headers['content-type'] || 'application/octet-stream');

    fileStream.data.pipe(res);
  } catch (err) {
    console.error('Download stream error:', err.response?.data || err.message);
    res.status(500).send('Download failed: ' + (err.response?.data?.message || err.message));
  }
});

module.exports = app;
