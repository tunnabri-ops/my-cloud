const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const GOFILE_TOKEN = process.env.GOFILE_TOKEN;

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
      token: (GOFILE_TOKEN || '').trim()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch server.' });
  }
});

// 2. আপনার সাইট থেকে সরাসরি ডাউনলোড এবং ইন-সাইট প্রিভিউ করার রুট
app.get('/api/download', async (req, res) => {
  const { fileId, fileName } = req.query;
  if (!fileId) return res.status(400).send('File ID required');

  try {
    const headers = GOFILE_TOKEN ? { Authorization: `Bearer ${GOFILE_TOKEN.trim()}` } : {};
    const contentRes = await axios.get(`https://api.gofile.io/contents/${fileId}`, { headers });
    const content = contentRes.data?.data;

    let directLink = content?.link || content?.directLink;

    if (!directLink && content?.children) {
      const childKeys = Object.keys(content.children);
      if (childKeys.length > 0) {
        directLink = content.children[childKeys[0]]?.link;
      }
    }

    if (!directLink) {
      return res.status(404).send('Direct link could not be generated');
    }

    // Gofile-এর লিংক থেকে ফাইল নিয়ে এসে আপনার সাইট দিয়ে সরাসরি ব্রাউজারে পুশ করা
    const fileStream = await axios({
      method: 'get',
      url: directLink,
      responseType: 'stream',
      headers: GOFILE_TOKEN ? { Cookie: `accountToken=${GOFILE_TOKEN.trim()}` } : {}
    });

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName || 'download')}"`);
    res.setHeader('Content-Type', fileStream.headers['content-type'] || 'application/octet-stream');

    fileStream.data.pipe(res);
  } catch (err) {
    res.status(500).send('Download failed: ' + (err.message || 'Server error'));
  }
});

module.exports = app;
