require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/', (_, res) => {
  res.send("API rodando");
});

app.get('/get-username', (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: 'Missing user_id' });

  // Retorna um "apelido" baseado no ID opaco fornecido pela Twitch
  res.json({ username: `Usuário ${userId.slice(0, 6)}` });
});

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
