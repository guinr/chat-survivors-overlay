require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/get-username', async (req, res) => {
  console.log('Requisição recebida em /get-username');

  const authHeader = req.headers['authorization'];
  console.log('Authorization header:', authHeader);

  if (!authHeader) {
    console.log('Token JWT não enviado');
    return res.status(401).json({ error: 'Token JWT não enviado' });
  }

  const token = authHeader.split(' ')[1];
  console.log('Token JWT extraído:', token);

  let payload;
  try {
    payload = jwt.decode(token);
    console.log('Payload decodificado:', payload);

    if (!payload || !payload.user_id) {
      console.log('Token inválido ou sem user_id');
      return res.status(400).json({ error: 'Token inválido ou sem user_id' });
    }
  } catch (e) {
    console.log('Erro ao decodificar token:', e.message);
    return res.status(400).json({ error: 'Erro ao decodificar token', details: e.message });
  }

  const userId = payload.user_id;
  console.log('User ID extraído:', userId);

  try {
    console.log('Solicitando token de acesso à Twitch...');
    const tokenRes = await fetch(`https://id.twitch.tv/oauth2/token`, {
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials'
      })
    });

    const tokenData = await tokenRes.json();
    console.log('Resposta do token de acesso:', tokenData);

    if (!tokenData.access_token) {
      console.log('Falha ao obter token de acesso');
      return res.status(500).json({ error: 'Falha ao obter token de acesso' });
    }

    console.log(`Buscando dados do usuário ${userId} na Twitch...`);
    const userRes = await fetch(`https://api.twitch.tv/helix/users?id=${userId}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    const userData = await userRes.json();
    console.log('Dados do usuário recebidos:', userData);

    const username = userData.data?.[0]?.display_name || 'Unknown';
    console.log('Username extraído:', username);

    res.json({ username });
  } catch (err) {
    console.error('Erro ao buscar usuário na Twitch:', err);
    res.status(500).json({ error: 'Erro ao buscar usuário na Twitch' });
  }
});

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
