const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/api/deepl', createProxyMiddleware({
  target: 'https://api-free.deepl.com',
  changeOrigin: true,
  pathRewrite: { '^/api/deepl': '' },
}));

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`かんじヘルプ running on http://localhost:${PORT}`);
});
