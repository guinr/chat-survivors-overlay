require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // não esqueça de importar!

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/get-username', async (req, res) => {
  console.log('Requisição recebida em /get-username');

  const userId = req.query.user_id;
  console.log('Parâmetro user_id:', userId);

  if (!userId) {
    console.warn('user_id ausente na requisição');
    return res.status(400).json({ error: 'Missing user_id' });
  }

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

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text();
      console.error('Erro ao obter token:', tokenRes.status, errorBody);
      return res.status(500).json({ error: 'Falha ao obter token de acesso' });
    }

    const tokenData = await tokenRes.json();
    console.log('Token recebido:', tokenData);

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error('Token de acesso não encontrado na resposta');
      return res.status(500).json({ error: 'Falha ao obter token de acesso' });
    }

    console.log(`Buscando dados do usuário ${userId} na API Twitch...`);
    const userRes = await fetch(`https://api.twitch.tv/helix/users?id=${userId}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!userRes.ok) {
      const errorBody = await userRes.text();
      console.error('Erro ao buscar usuário:', userRes.status, errorBody);
      return res.status(500).json({ error: 'Falha ao buscar dados do usuário' });
    }

    const userData = await userRes.json();
    console.log('Dados do usuário:', userData);

    const username = userData.data?.[0]?.display_name || 'Unknown';
    console.log('Nome de usuário retornado:', username);

    res.json({ username });
  } catch (error) {
    console.error('Erro inesperado:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
