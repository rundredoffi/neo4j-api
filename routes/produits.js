const express = require('express');

function produitsRoutes(driver) {
    const router = express.Router();

    // GET /produits - Récupérer tous les produits
    router.get('/', async (req, res) => {
        const session = driver.session();
        try {
            const result = await session.run(
                'MATCH (n:Produit) RETURN n'
            );

            const records = result.records.map(record => ({
                'produit': record.get('n').properties,
            }));

            res.json(records);
        } catch (error) {
            console.error('Error fetching data from Neo4j:', error);
            res.status(500).send('Internal Server Error');
        } finally {
            await session.close();
        }
    });

    // GET /produits/:id - Récupérer un produit spécifique
    router.get('/:id', async (req, res) => {
        const session = driver.session();
        try {
            const result = await session.run(
                'MATCH (n:Produit) WHERE n.nom = $id RETURN n',
                { id: req.params.id }
            );

            if (result.records.length === 0) {
                return res.status(404).json({ error: 'Produit non trouvé' });
            }

            const produit = result.records[0].get('n').properties;
            res.json({ produit: produit });
        } catch (error) {
            console.error('Error fetching data from Neo4j:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        } finally {
            await session.close();
        }
    });

    return router;
}

module.exports = produitsRoutes;