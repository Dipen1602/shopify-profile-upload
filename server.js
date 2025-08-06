const express = require('express');
const app = express();
const cors = require('cors');
const fetch = require('node-fetch');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// --- CONFIGURATION ---
// Use these as Render "environment variables"!
const SHOP = process.env.SHOP || 'a97a69-f5.myshopify.com';
const TOKEN = process.env.TOKEN || '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';
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dtkn4o45z';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '946252337563562';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'N4bphLIBJGS0Pc59Rx9cc6E3IkM';

// --- Cloudinary Setup ---
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'shopify-profile-pictures', // Cloudinary folder
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 400, height: 400, crop: "limit" }]
  }
});
const upload = multer({ storage: storage });

// --- CORS ---
app.use(cors({
  origin: [
    'https://craftcartelonline.com.au',
    'https://shopify-profile-upload.onrender.com'
  ]
}));
app.use(express.json());

// --- Health check ---
app.get('/healthz', async (req, res) => {
  try {
    const response = await fetch(`https://${SHOP}/admin/api/2024-04/shop.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': TOKEN,
        'Content-Type': 'application/json'
      }
    });
    const result = await response.json();
    if (response.status === 200) {
      res.json({ ok: true, shop: result.shop.name, domain: result.shop.myshopify_domain });
    } else {
      res.json({ ok: false, error: result });
    }
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// --- The Cloudinary profile image upload! ---
app.post('/apps/profile-image/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ success: false, error: 'No file uploaded.' });
    }
    // Cloudinary public URL:
    const profilePictureUrl = req.file.path;
    // Shopify metafield update
    const customer_id = req.body.customerid;
    const metafieldPayload = {
      customer: {
        id: customer_id,
        metafields: [
          {
            namespace: "custom",
            key: "profile_picture",
            type: "url",
            value: profilePictureUrl
          }
        ]
      }
    };

    const updateResp = await fetch(`https://${SHOP}/admin/api/2024-04/customers/${customer_id}.json`, {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metafieldPayload)
    });

    if (updateResp.status >= 200 && updateResp.status < 300) {
      return res.json({ success: true, url: profilePictureUrl });
    } else {
      const respText = await updateResp.text();
      return res.json({ success: false, error: 'Failed to update Shopify metafield: ' + respText });
    }
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}!`));
