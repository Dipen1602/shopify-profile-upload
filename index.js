require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Create express app
const app = express();
const PORT = 3000;

// Allow CORS for local dev/future deployment
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*'
}));

// Serve /uploads as static files
const uploadFolder = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);
app.use('/uploads', express.static(uploadFolder));

// Multer setup for images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + file.originalname.replace(/\s/g, "");
    cb(null, unique);
  }
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB

// Main POST endpoint: /profile_upload
app.post('/profile_upload', upload.single('file'), async (req, res) => {
  try {
    const { customerid } = req.body;
    const file = req.file;
    if (!customerid || !file) 
      return res.status(400).json({ error: "customerid and file are required" });

    const publicUrl = `${process.env.UPLOAD_BASE_URL}/${file.filename}`;

    // Shopify API call setup
    const shop = process.env.SHOPIFY_SHOP;
    const apiKey = process.env.SHOPIFY_APP_API_KEY;
    const password = process.env.SHOPIFY_APP_API_PASSWORD;
    const metafield = {
      metafield: {
        namespace: 'custom',
        key: 'profile_picture',
        value: publicUrl,
        value_type: 'string'
      }
    };
    // Shopify REST API call
    const url = `https://${shop}/admin/api/2024-01/customers/${customerid}/metafields.json`;
    const basicAuth = Buffer.from(`${apiKey}:${password}`).toString('base64');
    const result = await axios.post(url, metafield, {
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json"
      }
    });

    res.json({ success: true, imageUrl: publicUrl });
  } catch (e) {
    console.error(e.response?.data || e);
    res.status(500).json({ error: e.message, details: e.response?.data });
  }
});

// Test home page
app.get('/', (req, res) => res.send('Upload server running!'));

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
