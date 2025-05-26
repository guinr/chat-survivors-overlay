require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

const client = jwksClient({
  jwksUri: 'https://id.twitch.tv/oauth2/keys'
});

// Função que pega a chave pública certa para validar o JWT
function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

// Endpoint protegido que recebe o token do frontend
app.get('/get-username', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });

  const token = authHeader.split(' ')[1]; // Authorization: Bearer <token>

  jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err) {
      console.error('Erro ao verificar token:', err);
      return res.status(401).json({ error: 'Invalid token' });
    }

    // decoded = payload com informações do usuário
    const username = `Usuário ${decoded.user_id}`;
    res.json({ username });
  });
});

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
