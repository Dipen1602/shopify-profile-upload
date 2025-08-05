require('dotenv').config();
const axios = require('axios');

const shop = process.env.SHOPIFY_SHOP;
const apiKey = process.env.SHOPIFY_APP_API_KEY;
const password = process.env.SHOPIFY_APP_API_PASSWORD;

if (!shop || !apiKey || !password) {
  console.error("❌ Please set SHOPIFY_SHOP, SHOPIFY_APP_API_KEY, SHOPIFY_APP_API_PASSWORD in your .env");
  process.exit(1);
}

const url = `https://${shop}/admin/api/2024-01/shop.json`;
const basicAuth = Buffer.from(`${apiKey}:${password}`).toString('base64');

axios.get(url, {
  headers: {
    "Authorization": `Basic ${basicAuth}`
  }
})
.then(resp => {
  console.log("✅ Connected!", resp.data.shop);
})
.catch(err => {
  console.error("❌ Shopify connection failed:", err.response?.data || err.message);
});
