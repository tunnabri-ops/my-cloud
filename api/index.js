const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const GOFILE_TOKEN = process.env.GOFILE_TOKEN;

// Gofile-এ ফাইল আপলোড API
app.post('/api/upload', upload.single('userFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file selected.' });
    }

    // ১. আপলোডের জন্য সেরা সার্ভারটি নির্বাচন করা
    const serverRes = await axios.get('https://api.gofile.io/servers');
    const bestServer = serverRes.data?.data?.servers?.[0]?.name || 'store1';

    // ২. Gofile সার্ভারে ফাইল পাঠানোর জন্য FormData তৈরি
    const form = new FormData();
    form.append('file', req.file.buffer, { filename: req.file.originalname });

    const headers = {
      ...form.getHeaders()
    };
    if (GOFILE_TOKEN) {
      headers['Authorization'] = `Bearer ${GOFILE_TOKEN}`;
    }

    const uploadRes = await axios.post(`https://${bestServer}.gofile.io/contents/uploadfile`, form, {
      headers: headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    if (uploadRes.data.status !== 'ok') {
      throw new Error('Gofile upload rejected');
    }

    const fileData = uploadRes.data.data;
    const downloadPage = fileData.downloadPage;
    const directLink = fileData.directLink || downloadPage;

    res.json({
      message: 'Upload successful!',
      name: fileData.fileName || req.file.originalname,
      size: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
      sizeBytes: req.file.size,
      fileId: fileData.fileId,
      link: directLink,
      downloadPage: downloadPage
    });
  } catch (error) {
    console.error('Upload Error:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Upload failed via Gofile.' });
  }
});

// প্রিভিউ ও ডিরেক্ট লিঙ্কের API
app.get('/api/file-url', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL missing' });
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch file URL.' });
  }
});

module.exports = app;
