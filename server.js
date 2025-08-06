const express = require('express');
const app = express();
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

// Replace these with your actual store details!
const SHOP = 'a97a69-f5.myshopify.com';
const TOKEN = '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';

// Multer for handling local uploads
const upload = multer({ dest: 'uploads/' });

// Allow required origins
app.use(cors({
  origin: [
    'https://craftcartelonline.com.au',
    'https://shopify-profile-upload.onrender.com/'
  ]
}));

// Serve the uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check (optional)
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

// Main upload endpoint
app.post('/apps/profile-image/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || req.file.size === 0) {
      return res.json({ success: false, error: 'No file uploaded or file is empty.' });
    }

    // Create a sanitized filename and move file to /uploads
    const filename = `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
    const finalPath = path.join(__dirname, 'uploads', filename);
    fs.renameSync(req.file.path, finalPath);

    // Local server URL for file (update if deploying to prod!)
    const profilePictureUrl = `https://shopify-profile-upload.onrender.com/uploads/${filename}`;

    // Wrap metafields with customer: { ... } for Shopify compatibility
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
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.json({ success: false, error: err.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000!'));
