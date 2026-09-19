const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const GOFILE_TOKEN = process.env.GOFILE_TOKEN;

// 1. আপলোডের জন্য সার্ভার তথ্য নেওয়া
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
    res.status(500).json({ error: 'Server initialization failed.' });
  }
});

// 2. ফাইল সরাসরি ডাউনলোড ও স্ট্রিম করার নিরাপদ রুট (যাতে পেজ রিডাইরেক্ট না হয়)
app.get('/api/stream', async (req, res) => {
  const { fileId, fileName } = req.query;
  if (!fileId) return res.status(400).send('File ID required');

  try {
    const contentRes = await axios.get(`https://api.gofile.io/contents/${fileId}`, {
      headers: GOFILE_TOKEN ? { Authorization: `Bearer ${GOFILE_TOKEN}` } : {}
    });

    const fileData = contentRes.data?.data;
    const downloadLink = fileData?.link || fileData?.downloadPage;

    if (!downloadLink) {
      return res.status(404).send('Direct link not found');
    }

    // ব্রাউজারে ইনলাইন ফাইল প্রিভিউ ও ডাউনলোডের হেডারের ব্যবস্থা
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName || fileData.name || 'download')}"`);
    const stream = await axios({
      method: 'get',
      url: downloadLink,
      responseType: 'stream',
      headers: GOFILE_TOKEN ? { Cookie: `accountToken=${GOFILE_TOKEN}` } : {}
    });

    stream.data.pipe(res);
  } catch (err) {
    res.status(500).send('Failed to stream file');
  }
});

module.exports = app;
