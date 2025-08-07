import express from 'express';
import cors from 'cors';
import multer from 'multer';
import cloudinary from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import fetch from 'node-fetch';

const app = express();

// ---- Environment Variables: set in Render dashboard for security ----
const SHOP = process.env.SHOP || 'a97a69-f5.myshopify.com';
const TOKEN = process.env.TOKEN || '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';
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dtkn4o45z';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '946252337563562';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'N4bphLIBJGS0Pc59Rx9cc6E3IkM';
const PORT = process.env.PORT || 4000;

// ---- CORS (allow both Shopify and your Render app) ----
app.use(cors({
  origin: [
    'https://craftcartelonline.com.au',
    'https://shopify-profile-upload.onrender.com'
    // Add frontend dev origin if needed, e.g. 'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'OPTIONS']
}));

app.use(express.json());

// ---- Cloudinary Config ----
cloudinary.v2.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
});
const storage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: {
    folder: 'shopify-profile-pictures',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 400, height: 400, crop: "limit" }]
  }
});
const upload = multer({ storage });

// ---- Health Check Endpoint ----
app.get('/healthz', async (req, res) => {
  try {
    const response = await fetch(`https://${SHOP}/admin/api/2024-04/shop.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': TOKEN,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (response.status === 200) {
      return res.json({ ok: true, shop: data.shop.name, domain: data.shop.myshopify_domain });
    } else {
      return res.status(response.status).json({ ok: false, error: data });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ---- Customer Fields/Metafield Update ----
app.post('/update-customer', async (req, res) => {
  try {
    const { customer_id, first_name, last_name, metafields } = req.body;
    if (!customer_id || (!first_name && !last_name && !metafields))
      return res.status(400).json({ error: "Missing fields. Provide at least one update field." });

    const customerData = { customer: { id: customer_id } };
    if (first_name) customerData.customer.first_name = first_name;
    if (last_name) customerData.customer.last_name = last_name;
    if (metafields) customerData.customer.metafields = metafields;

    const response = await fetch(`https://${SHOP}/admin/api/2024-04/customers/${customer_id}.json`, {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customerData)
    });

    const data = await response.json();
    if (response.status >= 200 && response.status < 300) {
      return res.json(data);
    } else {
      return res.status(response.status).json({ error: data });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---- Profile Image Upload and Shopify Metafield Update ----
app.post('/apps/profile-image/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }
    const profilePictureUrl = req.file.path;
    const customer_id = req.body.customerid;
    if (!customer_id)
      return res.status(400).json({ success: false, error: "Missing customerid in request." });

    const metafieldPayload = {
      customer: {
        id: customer_id,
        metafields: [{
          namespace: "custom",
          key: "profile_picture",
          type: "url",
          value: profilePictureUrl
        }]
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
      return res.status(500).json({ success: false, error: 'Failed to update Shopify metafield: ' + respText });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ---- Start Server ----
app.listen(PORT, () => {
  console.log(`🚀 Shopify customer updater running on port ${PORT}`);
});
