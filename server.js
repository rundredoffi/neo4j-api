const express = require('express');
const neo4j = require('neo4j-driver');
const cors = require('cors');
const fournisseursRoutes = require('./routes/fournisseurs');
const produitsRoutes = require('./routes/produits');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Neo4j Driver
const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password'), { // Remplacer avec ses identifiants
    disableLosslessIntegers: true // Stack overflow recommandation : https://stackoverflow.com/questions/42645342/neo4j-return-an-integer-instead-of-high-0-low-10
  } 
);

// Endpoint root
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Neo4j API server' });
});

/*
Routes pour les fournisseurs
*/
app.use('/fournisseurs', fournisseursRoutes(driver));
/*
Routes pour les produits
*/
app.use('/produits', produitsRoutes(driver));

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