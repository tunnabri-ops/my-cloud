const express = require('express');
const multer = require('multer');
const { Dropbox } = require('dropbox');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const dbx = new Dropbox({ accessToken: process.env.DROPBOX_TOKEN });

// ১. ফাইল আপলোড API
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

    res.json({ message: 'আপলোড সফল হয়েছে!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'আপলোড ব্যর্থ হয়েছে।' });
  }
});

// ২. সব ফাইলের লিস্ট ড্রপবক্স থেকে নিয়ে আসার API
app.get('/api/files', async (req, res) => {
  try {
    const response = await dbx.filesListFolder({ path: '' });
    const files = response.result.entries
      .filter(item => item['.tag'] === 'file')
      .map(item => ({
        id: Buffer.from(item.path_lower).toString('base64'),
        name: item.name,
        size: (item.size / (1024 * 1024)).toFixed(2) + ' MB',
        path: item.path_lower
      }));
    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ফাইল লিস্ট লোড করা যায়নি।' });
  }
});

// ৩. ফাইলের ডিরেক্ট ভিউ/ডাউনলোড লিঙ্ক তৈরি API
app.get('/api/view', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).send('File not found');

    const dbxPath = Buffer.from(id, 'base64').toString('ascii');
    const linkRes = await dbx.filesGetTemporaryLink({ path: dbxPath });
    res.redirect(linkRes.result.link);
  } catch (err) {
    console.error(err);
    res.status(404).send('ফাইল পাওয়া যায়নি।');
  }
});

module.exports = app;
