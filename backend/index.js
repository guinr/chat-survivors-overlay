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

async function getSigningKey(kid) {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) return reject(err);
      const signingKey = key.getPublicKey();
      resolve(signingKey);
    });
  });
}

app.get('/get-username', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });

  const token = authHeader.split(' ')[1]; // Bearer <token>

  try {
    // Decode header to get 'kid' (key id)
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader) throw new Error('Invalid token');

    // Pega a chave pública correspondente ao 'kid'
    const signingKey = await getSigningKey(decodedHeader.header.kid);

    // Verifica o token com a chave pública
    const decoded = jwt.verify(token, signingKey, { algorithms: ['RS256'] });

    const username = `Usuário ${decoded.user_id}`;
    res.json({ username });

  } catch (err) {
    console.error('Erro ao verificar token:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
