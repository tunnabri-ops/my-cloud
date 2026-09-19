const express = require('express');
const multer = require('multer');
const { Dropbox } = require('dropbox');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Vercel Environment Variables থেকে টোকেন নেবে
const dbx = new Dropbox({ accessToken: process.env.DROPBOX_TOKEN });

// ফাইল আপলোড API
app.post('/api/upload', upload.single('userFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'কোনো ফাইল সিলেক্ট করা হয়নি।' });
    }

    const fileName = `/${Date.now()}_${req.file.originalname}`;

    // ড্রপবক্সে আপলোড
    const response = await dbx.filesUpload({
      path: fileName,
      contents: req.file.buffer,
    });

    let shareUrl = '';
    try {
      const linkRes = await dbx.sharingCreateSharedLinkWithSettings({
        path: response.result.path_lower,
      });
      shareUrl = linkRes.result.url;
    } catch (e) {
      shareUrl = 'ড্রপবক্স ড্যাশবোর্ড থেকে ফাইলটি দেখতে পারেন।';
    }

    res.json({
      message: 'আপলোড সফল হয়েছে!',
      name: req.file.originalname,
      size: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
      link: shareUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'আপলোড ব্যর্থ হয়েছে। টোকেন বা পারমিশন চেক করুন।' });
  }
});

module.exports = app;
