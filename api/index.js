const express = require('express');
const multer = require('multer');
const axios = require('axios');
const { Dropbox } = require('dropbox');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
app.use(express.json());

const DROPBOX_TOKEN = process.env.DROPBOX_TOKEN;
const GOFILE_TOKEN = process.env.GOFILE_TOKEN;

// Route 1: Get Gofile server & token for direct client-side upload
app.get('/api/gofile-server', async (req, res) => {
  try {
    const serverRes = await axios.get('https://api.gofile.io/servers');
    const serverName = serverRes.data?.data?.servers?.[0]?.name;

    if (!serverName) {
      return res.status(500).json({ error: 'Could not fetch Gofile server.' });
    }

    res.json({
      server: serverName,
      token: GOFILE_TOKEN || ''
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to communicate with Gofile.' });
  }
});

// Route 2: Upload to Dropbox (for small documents/files)
app.post('/api/upload-dropbox', upload.single('userFile'), async (req, res) => {
  try {
    if (!DROPBOX_TOKEN) {
      return res.status(500).json({ error: 'DROPBOX_TOKEN not configured.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file received.' });
    }

    const dbx = new Dropbox({ accessToken: DROPBOX_TOKEN });
    const uploadRes = await dbx.filesUpload({
      path: `/${Date.now()}_${req.file.originalname}`,
      contents: req.file.buffer
    });

    let sharedUrl = '';
    try {
      const shareRes = await dbx.sharingCreateSharedLinkWithSettings({ path: uploadRes.result.path_display });
      sharedUrl = shareRes.result.url.replace('?dl=0', '?raw=1');
    } catch {
      const existing = await dbx.sharingListSharedLinks({ path: uploadRes.result.path_display });
      if (existing.result.links.length > 0) {
        sharedUrl = existing.result.links[0].url.replace('?dl=0', '?raw=1');
      }
    }

    res.json({
      name: uploadRes.result.name,
      size: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
      link: sharedUrl,
      provider: 'Dropbox'
    });
  } catch (err) {
    console.error('Dropbox Error:', err);
    res.status(500).json({ error: 'Dropbox upload failed.' });
  }
});

module.exports = app;
