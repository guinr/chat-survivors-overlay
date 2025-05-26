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
      if (err) {
        console.error('Erro ao buscar chave:', err);
        return reject(err);
      }
      const signingKey = key.getPublicKey();
      console.log('Chave pública obtida para kid:', kid);
      resolve(signingKey);
    });
  });
}

app.get('/get-username', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.warn('Faltando header Authorization');
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  console.log('Token recebido:', token);

  try {
    const decodedHeader = jwt.decode(token, { complete: true });
    console.log('Decoded header:', decodedHeader);

    if (!decodedHeader) {
      throw new Error('Token inválido ou malformado');
    }

    const kid = decodedHeader.header.kid;
    const alg = decodedHeader.header.alg;
    console.log('kid:', kid, 'alg:', alg);

    const signingKey = await getSigningKey(kid);

    console.log('Tentando verificar token com algoritmo RS256...');
    const decoded = jwt.verify(token, signingKey, { algorithms: ['RS256'] });

    console.log('Token verificado com sucesso:', decoded);

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
