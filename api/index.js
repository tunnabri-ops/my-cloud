const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const GOFILE_TOKEN = (process.env.GOFILE_TOKEN || '').trim();

// ১. আপলোড সার্ভার এবং টোকেন পাঠানোর রুট
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

// ২. সরাসরি ফাইল স্ট্রিম (কোনো বাড়তি API কল ছাড়া আসল ফাইল ডাউনলোড)
app.get('/api/download', async (req, res) => {
  const { url, fileName } = req.query;
  if (!url) return res.status(400).send('Direct URL required');

  try {
    const streamHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    };
    if (GOFILE_TOKEN) {
      streamHeaders['Cookie'] = `accountToken=${GOFILE_TOKEN}`;
    }

    const fileStream = await axios({
      method: 'get',
      url: decodeURIComponent(url),
      responseType: 'stream',
      headers: streamHeaders
    });

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName || 'download')}"`);
    if (fileStream.headers['content-type']) {
      res.setHeader('Content-Type', fileStream.headers['content-type']);
    }

    fileStream.data.pipe(res);
  } catch (err) {
    // যদি প্রক্সিতে সমস্যা হয়, ব্রাউজারকে ডিরেক্ট রিডাইরেক্ট করে দেওয়া
    res.redirect(decodeURIComponent(url));
  }
});

module.exports = app;
