const express = require('express');

function EntrepotsRoutes(driver) {
    const router = express.Router();

    // GET /entrepot - Récupérer tous les entrepôts
    router.get('/', async (req, res) => {
        const session = driver.session();
        try {
            const result = await session.run(
                'MATCH (n:Entrepot) RETURN n'
            );

            const records = result.records.map(record => ({
                'entrepot': record.get('n').properties,
            }));

            res.json(records);
        } catch (error) {
            console.error('Error fetching data from Neo4j:', error);
            res.status(500).send('Internal Server Error');
        } finally {
            await session.close();
        }
    });

    // GET /entrepot/:id - Récupérer un entrepôt spécifique
    router.get('/:id', async (req, res) => {
        const session = driver.session();
        try {
            const result = await session.run(
                'MATCH (n:Entrepot) WHERE n.nom = $id RETURN n',
                { id: req.params.id }
            );

            if (result.records.length === 0) {
                return res.status(404).json({ error: 'Entrepôt non trouvé' });
            }

            const entrepot = result.records[0].get('n').properties;
            res.json({ entrepot: entrepot });
        } catch (error) {
            console.error('Error fetching data from Neo4j:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        } finally {
            await session.close();
        }
    });

    // POST /produits - Créer un nouveau produit
    router.post('/', async (req, res) => {
        const session = driver.session();
        try {
            const { nom, prix, quantite_stock } = req.body;

            // Validation des champs requis
            if (!nom || !prix || quantite_stock === undefined) {
                return res.status(400).json({ 
                    error: 'Les champs nom, prix et quantite_stock sont requis' 
                });
            }

            // Vérifier si le produit existe déjà
            const checkResult = await session.run(
                'MATCH (n:Produit) WHERE n.nom = $nom RETURN n',
                { nom: nom }
            );

            if (checkResult.records.length > 0) {
                return res.status(409).json({ 
                    error: 'Un produit avec ce nom existe déjà' 
                });
            }

            // Créer le nouveau produit
            const result = await session.run(
                'CREATE (n:Produit {nom: $nom, prix: $prix, quantite_stock: $quantite_stock}) RETURN n',
                { 
                    nom: nom, 
                    prix: parseInt(prix), 
                    quantite_stock: parseInt(quantite_stock)
                }
            );

            const nouveauProduit = result.records[0].get('n').properties;
            res.status(201).json({ 
                message: 'Produit créé avec succès',
                produit: nouveauProduit 
            });
        } catch (error) {
            console.error('Error creating data in Neo4j:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        } finally {
            await session.close();
        }
    });

    // PUT /produits/:id - Mettre à jour un produit
    router.put('/:id', async (req, res) => {
        const session = driver.session();
        try {
            const { nom, prix, quantite_stock } = req.body;

            // Validation des champs requis
            if (!nom || !prix || quantite_stock === undefined) {
                return res.status(400).json({ 
                    error: 'Les champs nom, prix et quantite_stock sont requis' 
                });
            }

            // Vérifier d'abord si le produit existe
            const checkResult = await session.run(
                'MATCH (n:Produit) WHERE n.nom = $id RETURN n',
                { id: req.params.id }
            );

            if (checkResult.records.length === 0) {
                return res.status(404).json({ error: 'Produit non trouvé' });
            }

            // Vérifier si un autre produit a déjà ce nom (sauf le produit actuel)
            const duplicateCheck = await session.run(
                'MATCH (n:Produit) WHERE n.nom = $nom AND n.nom <> $id RETURN n',
                { nom: nom, id: req.params.id }
            );

            if (duplicateCheck.records.length > 0) {
                return res.status(409).json({ 
                    error: 'Un autre produit avec ce nom existe déjà' 
                });
            }

            // Mettre à jour le produit
            const updateResult = await session.run(
                'MATCH (n:Produit) WHERE n.nom = $id SET n.nom = $nom, n.prix = $prix, n.quantite_stock = $quantite_stock RETURN n',
                { 
                    id: req.params.id,
                    nom: nom,
                    prix: parseInt(prix),
                    quantite_stock: parseInt(quantite_stock)
                }
            );

            const produitMisAJour = updateResult.records[0].get('n').properties;
            res.json({ 
                message: 'Produit mis à jour avec succès',
                produit: produitMisAJour 
            });
        } catch (error) {
            console.error('Error updating data in Neo4j:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        } finally {
            await session.close();
        }
    });

    return router;
}

module.exports = EntrepotsRoutes;