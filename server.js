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
app.get('/fournisseurs', async  (req, res) => {
    const session = driver.session(); // Créer une session par requête
    try {
        const result = await session.run(
        'MATCH (n:Fournisseur) RETURN n'
        );

        const records = result.records.map(record => ({
        'fournisseur': record.get('n').properties,
        }));

        res.json(records);
    } catch (error) {
        console.error('Error fetching data from Neo4j:', error);
        res.status(500).send('Internal Server Error');
    } finally {
        await session.close(); // Toujours fermer la session
    }
});
app.get('/fournisseurs/:id', async (req, res) => {
    const session = driver.session(); // Créer une session par requête
    try {
        const result = await session.run(
            'MATCH (n:Fournisseur) WHERE n.nom = $id RETURN n',
            { id: req.params.id }
        );

        if (result.records.length === 0) {
            return res.status(404).json({ error: 'Fournisseur non trouvé' });
        }

        const fournisseur = result.records[0].get('n').properties;
        res.json({ fournisseur: fournisseur });
    } catch (error) {
        console.error('Error fetching data from Neo4j:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await session.close(); // Toujours fermer la session
    }
});

app.post('/fournisseurs', async (req, res) => {
    const session = driver.session(); // Créer une session par requête
    try {
        const { nom, ville, contact } = req.body;

        // Validation des champs requis
        if (!nom || !ville || !contact) {
            return res.status(400).json({ 
                error: 'Les champs nom, ville et contact sont requis' 
            });
        }

        // Vérifier si le fournisseur existe déjà
        const checkResult = await session.run(
            'MATCH (n:Fournisseur) WHERE n.nom = $nom RETURN n',
            { nom: nom }
        );

        if (checkResult.records.length > 0) {
            return res.status(409).json({ 
                error: 'Un fournisseur avec ce nom existe déjà' 
            });
        }

        // Créer le nouveau fournisseur
        const result = await session.run(
            'CREATE (n:Fournisseur {nom: $nom, ville: $ville, contact: $contact}) RETURN n',
            { nom: nom, ville: ville, contact: contact }
        );

        const nouveauFournisseur = result.records[0].get('n').properties;
        res.status(201).json({ 
            message: 'Fournisseur créé avec succès',
            fournisseur: nouveauFournisseur 
        });
    } catch (error) {
        console.error('Error creating data in Neo4j:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await session.close(); // Toujours fermer la session
    }
});
app.put('/fournisseurs/:id', async(req, res) => {
    const session = driver.session(); // Créer une session par requête
    try {
        const { nom, ville, contact } = req.body;

        // Validation des champs requis
        if (!nom || !ville || !contact) {
            return res.status(400).json({ 
                error: 'Les champs nom, ville et contact sont requis' 
            });
        }

        // Vérifier d'abord si le fournisseur existe
        const checkResult = await session.run(
            'MATCH (n:Fournisseur) WHERE n.nom = $id RETURN n',
            { id: req.params.id }
        );

        if (checkResult.records.length === 0) {
            return res.status(404).json({ error: 'Fournisseur non trouvé' });
        }

        // Vérifier si un autre fournisseur a déjà ce nom (sauf le fournisseur actuel)
        const duplicateCheck = await session.run(
            'MATCH (n:Fournisseur) WHERE n.nom = $nom AND n.nom <> $id RETURN n',
            { nom: nom, id: req.params.id }
        );

        if (duplicateCheck.records.length > 0) {
            return res.status(409).json({ 
                error: 'Un autre fournisseur avec ce nom existe déjà' 
            });
        }

        // Mettre à jour le fournisseur
        const updateResult = await session.run(
            'MATCH (n:Fournisseur) WHERE n.nom = $id SET n.nom = $nom, n.ville = $ville, n.contact = $contact RETURN n',
            { 
                id: req.params.id,
                nom: nom,
                ville: ville,
                contact: contact
            }
        );

        const fournisseurMisAJour = updateResult.records[0].get('n').properties;
        res.json({ 
            message: 'Fournisseur mis à jour avec succès',
            fournisseur: fournisseurMisAJour 
        });
    } catch (error) {
        console.error('Error updating data in Neo4j:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await session.close(); // Toujours fermer la session
    }
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