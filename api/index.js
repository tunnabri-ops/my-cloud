const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const getCleanToken = () => (process.env.GOFILE_TOKEN || '').trim();

// 1. আপলোড সার্ভার এবং টোকেন নেওয়ার রুট
app.get('/api/server', async (req, res) => {
  try {
    const token = getCleanToken();
    const serverRes = await axios.get('https://api.gofile.io/servers');
    const serverName = serverRes.data?.data?.servers?.[0]?.name;

    if (!serverName) {
      return res.status(500).json({ error: 'Server unavailable.' });
    }

    res.json({
      server: serverName,
      token: token
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch server info.' });
  }
});

// 2. সরাসরি ব্রাউজারে ফাইল স্ট্রিমিং ও ইন-সাইট ডাউনলোড রুট
app.get('/api/download', async (req, res) => {
  const { fileId, fileName } = req.query;
  if (!fileId) return res.status(400).send('File ID required');

  const token = getCleanToken();

  try {
    // Contents রিকোয়েস্ট তৈরি
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const contentRes = await axios.get(`https://api.gofile.io/contents/${fileId}`, { headers });
    const content = contentRes.data?.data;

    let targetDirectLink = content?.link || content?.directLink;

    // যদি কন্টেইনার/ফোল্ডার হয়, তবে চিলড্রেন থেকে ডাউনলোড লিংক নেওয়া
    if (!targetDirectLink && content?.children) {
      const keys = Object.keys(content.children);
      if (keys.length > 0) {
        targetDirectLink = content.children[keys[0]]?.link;
      }
    }

    if (!targetDirectLink) {
      return res.status(404).send('Direct link not found in Gofile response');
    }

    // স্ট্রিম রিকোয়েস্ট (কুকি ও অথেন্টিকেশন সহ)
    const streamHeaders = {};
    if (token) {
      streamHeaders['Cookie'] = `accountToken=${token}`;
      streamHeaders['Authorization'] = `Bearer ${token}`;
    }

    const fileStream = await axios({
      method: 'get',
      url: targetDirectLink,
      responseType: 'stream',
      headers: streamHeaders
    });

    const finalName = fileName || content?.name || 'download';
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalName)}"`);
    if (fileStream.headers['content-type']) {
      res.setHeader('Content-Type', fileStream.headers['content-type']);
    }

    fileStream.data.pipe(res);
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message;
    res.status(500).send(`Download failed: ${errorMsg}`);
  }
});

module.exports = app;
