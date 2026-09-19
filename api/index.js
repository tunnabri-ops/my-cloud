const express = require('express');
const multer = require('multer');
const { Dropbox } = require('dropbox');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const dbx = new Dropbox({ accessToken: process.env.DROPBOX_TOKEN });

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

    let shareUrl = 'https://www.dropbox.com/home';
    try {
      const linkRes = await dbx.sharingCreateSharedLinkWithSettings({
        path: response.result.path_lower,
      });
      shareUrl = linkRes.result.url;
    } catch (e) {
      // লিঙ্ক তৈরিতে সমস্যা হলে মূল ড্রপবক্স হোমে রিডাইরেক্ট করবে
      shareUrl = 'https://www.dropbox.com/home';
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
