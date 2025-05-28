require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());

app.get('/players', (_, res) => {
  const allPlayers = Object.fromEntries(connectedPlayers.entries());
  res.json(allPlayers);
});

app.get('/get-username', async (req, res) => {
  console.log('Requisição recebida em /get-username');

  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    console.log('Token JWT não enviado');
    return res.status(401).json({ error: 'Token JWT não enviado' });
  }

  const token = authHeader.split(' ')[1];

  let payload;
  try {
    payload = jwt.decode(token);

    if (!payload || !payload.user_id) {
      console.log('Token inválido ou sem user_id');
      return res.status(400).json({ error: 'Token inválido ou sem user_id' });
    }
  } catch (e) {
    console.log('Erro ao decodificar token:', e.message);
    return res.status(400).json({ error: 'Erro ao decodificar token', details: e.message });
  }

  const userId = String(payload.user_id);

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

    if (!tokenData.access_token) {
      console.log('Falha ao obter token de acesso');
      return res.status(500).json({ error: 'Falha ao obter token de acesso' });
    }

    const userRes = await fetch(`https://api.twitch.tv/helix/users?id=${userId}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    const userData = await userRes.json();
    console.log('Dados do usuário recebidos:', userData);

    const username = userData.data?.[0]?.display_name || 'Unknown';

    const playerData = connectedPlayers.get(userId);
    res.json({
      userId,
      username,
      status: playerData ? playerData.status : null
    });
  } catch (err) {
    console.error('Erro ao buscar usuário na Twitch:', err);
    res.status(500).json({ error: 'Erro ao buscar usuário na Twitch' });
  }
});

const connectedPlayers = new Map();

wss.on('connection', (ws) => {
  console.log('🧩 Novo cliente WebSocket conectado');

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch (e) {
      console.log('❌ Mensagem inválida recebida');
      return;
    }

    if (msg.action === "join") {
      const { name, action } = msg;
      console.log(`Usuário ${name} se juntou com ação: ${action}`);
      if (!name || !action) {
        console.log('❌ name ou action ausente na mensagem');
        return;
      }

      const joinMsg = JSON.stringify({
        name,
        action
      });

      wss.clients.forEach(client => {
        if (client.readyState === client.OPEN) {
          client.send(joinMsg);
        }
      });
    }

    if (["for", "agi", "vit", "sor"].includes(msg.action)) {
      const { name, action, value } = msg;

      if (!name || !value) {
        console.log('❌ name ou value ausente na mensagem');
        return;
      }

      connectedPlayers.set(String(name), { status: value });

      const updateMsg = JSON.stringify({
        name,
        action,
        value
      });

      wss.clients.forEach(client => {
        if (client.readyState === client.OPEN) {
          client.send(updateMsg);
        }
      });
      return;
    }

    if (msg.action === "status_update") {
      const { name, status } = msg;

      if (!name || !status) {
        console.log('❌ name ou status ausente na mensagem');
        return;
      }

      connectedPlayers.set(String(name), { status });

      const updateMsg = JSON.stringify({
        action: 'status_broadcast',
        name,
        status
      });

      wss.clients.forEach(client => {
        if (client.readyState === client.OPEN) {
          client.send(updateMsg);
        }
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
