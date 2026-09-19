const express = require('express');
const multer = require('multer');
const { Dropbox } = require('dropbox');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const dbx = new Dropbox({ accessToken: process.env.DROPBOX_TOKEN });

// ফাইল আপলোড API
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

    // আপনার নিজস্ব সাইটের প্রিভিউ লিঙ্ক তৈরি
    const fileId = Buffer.from(dbxPath).toString('base64');
    const mySitePreviewLink = `/?file=${fileId}&name=${encodeURIComponent(req.file.originalname)}`;

    res.json({
      message: 'আপলোড সফল হয়েছে!',
      name: req.file.originalname,
      size: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
      link: mySitePreviewLink,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'আপলোড ব্যর্থ হয়েছে।' });
  }
});

// ড্রপবক্স থেকে ফাইল নিয়ে নিজস্ব সাইটে দেখানোর API
app.get('/api/view', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).send('File not found');

    const dbxPath = Buffer.from(id, 'base64').toString('ascii');

    // ড্রপবক্সের ডিরেক্ট ফাইল স্ট্রিম লিঙ্ক আনা
    const linkRes = await dbx.filesGetTemporaryLink({ path: dbxPath });
    
    // ইউজারকে সরাসরি ফাইলে রিডাইরেক্ট করে দেওয়া (ড্রপবক্স ড্যাশবোর্ডে নয়)
    res.redirect(linkRes.result.link);
  } catch (err) {
    console.error(err);
    res.status(404).send('ফাইল পাওয়া যায়নি বা মেয়াদ শেষ হয়ে গেছে।');
  }
});

module.exports = app;
