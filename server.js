const express = require('express');
const app = express();
const PORT = 8081;

app.get('/', (req, res) => {
  res.send('Server a correr');
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado em http://localhost:${PORT}`);
});
