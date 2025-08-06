const express = require('express');
const fetch = require('node-fetch');

const app = express();

// Replace these with your actual store values
const SHOP = 'a97a69-f5.myshopify.com';
const TOKEN = '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';

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

app.listen(3000, () => console.log('Health check server running on port 3000'));
