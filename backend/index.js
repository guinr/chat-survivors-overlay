require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());


app.get('/get-username', async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: 'Missing user_id' });

  const tokenRes = await fetch(`https://id.twitch.tv/oauth2/token`, {
    method: 'POST',
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials'
    })
  });
  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    return res.status(500).json({ error: 'Falha ao obter token de acesso' });
  }

  const userRes = await fetch(`https://api.twitch.tv/helix/users?id=${userId}`, {
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${tokenData.access_token}`
    }
  });

  const userData = await userRes.json();
  const username = userData.data?.[0]?.display_name || 'Unknown';

  res.json({ username });
});

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
