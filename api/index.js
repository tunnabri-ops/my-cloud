const express = require('express');
const multer = require('multer');
const { Dropbox } = require('dropbox');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const dbx = new Dropbox({ accessToken: process.env.DROPBOX_TOKEN });

// ১. ফাইল আপলোড হ্যান্ডলার
app.post('/api/upload', upload.single('userFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'কোনো ফাইল সিলেক্ট করা হয়নি।' });
    }

    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const dbxPath = `/${Date.now()}_${safeName}`;

    await dbx.filesUpload({
      path: dbxPath,
      contents: req.file.buffer,
    });

    // ফাইলের নিজস্ব ইউনিক আইডি তৈরি
    const fileId = Buffer.from(dbxPath).toString('base64');
    const previewUrl = `/?file=${fileId}&name=${encodeURIComponent(req.file.originalname)}`;

    res.json({
      message: 'আপলোড সফল হয়েছে!',
      name: req.file.originalname,
      size: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
      link: previewUrl
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'আপলোড ব্যর্থ হয়েছে।' });
  }
});

// ২. ফাইলের ডিরেক্ট লিংক আনার API (অটো ডাউনলোড হবে না)
app.get('/api/file-url', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID missing' });

    const dbxPath = Buffer.from(id, 'base64').toString('ascii');
    const linkRes = await dbx.filesGetTemporaryLink({ path: dbxPath });

    res.json({ url: linkRes.result.link });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: 'ফাইল পাওয়া যায়নি।' });
  }
});

module.exports = app;
