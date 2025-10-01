const express = require('express');
const neo4j = require('neo4j-driver');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Neo4j Driver
const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password') // Remplacer avec ses identifiants
);

// Endpoint root
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Neo4j API server' });
});
/*
Endpoints pour les fournisseurs
*/
//TODO : Ajouter les endpoints pour les fournisseurs
app.get('/fournisseur', (req, res) => {
    res.json({ message: 'Endpoints pour les fournisseurs' });
});
app.post('/fournisseur', (req, res) => {
    res.json({ message: 'Créer un nouveau fournisseur' });
});
app.put('/fournisseur/:id', (req, res) => {
    res.json({ message: `Mettre à jour le fournisseur avec l'ID ${req.params.id}` });
});

// Endpoint to get graph data
app.get('/graph', async (req, res) => {
  const session = driver.session(); // Créer une session par requête
  try {
    const result = await session.run(
      'MATCH (n)-[r]->(m) RETURN n, r, m'
    );

    const records = result.records.map(record => ({
      n: record.get('n').properties,
      m: record.get('m').properties,
      r: record.get('r').type,
    }));

    res.json(records);
  } catch (error) {
    console.error('Error fetching data from Neo4j:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await session.close(); // Toujours fermer la session
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Gracefully close the Neo4j driver on exit
process.on('exit', () => {
  driver.close();
});

process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await driver.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await driver.close();
  process.exit(0);
});