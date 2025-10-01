const express = require('express');

function fournisseursRoutes(driver) {
    const router = express.Router();

    // GET /fournisseurs - Récupérer tous les fournisseurs
    router.get('/', async (req, res) => {
        const session = driver.session();
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
            await session.close();
        }
    });

    // GET /fournisseurs/:id - Récupérer un fournisseur spécifique
    router.get('/:id', async (req, res) => {
        const session = driver.session();
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
            await session.close();
        }
    });

    // POST /fournisseurs - Créer un nouveau fournisseur
    router.post('/', async (req, res) => {
        const session = driver.session();
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
            await session.close();
        }
    });

    // PUT /fournisseurs/:id - Mettre à jour un fournisseur
    router.put('/:id', async (req, res) => {
        const session = driver.session();
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
            await session.close();
        }
    });

    // DELETE /fournisseurs/:id - Supprimer un fournisseur
    router.delete('/:id', async (req, res) => {
        const session = driver.session();
        try {
            // Vérifier d'abord si le fournisseur existe
            const checkResult = await session.run(
                'MATCH (n:Fournisseur) WHERE n.nom = $id RETURN n',
                { id: req.params.id }
            );

            if (checkResult.records.length === 0) {
                return res.status(404).json({ error: 'Fournisseur non trouvé' });
            }

            // Supprimer toutes les relations d'abord, puis le fournisseur
            const deleteResult = await session.run(
                'MATCH (n:Fournisseur) WHERE n.nom = $id DETACH DELETE n RETURN 1 as deleted',
                { id: req.params.id }
            );

            if (deleteResult.records.length > 0) {
                res.json({ 
                    message: 'Fournisseur supprimé avec succès',
                    fournisseur_supprime: req.params.id
                });
            } else {
                res.status(500).json({ error: 'Erreur lors de la suppression' });
            }
        } catch (error) {
            console.error('Error deleting data in Neo4j:', error);
            res.status(500).json({ 
                error: 'Internal Server Error', 
                details: error.message 
            });
        } finally {
            await session.close();
        }
    });

    // GET /fournisseurs/:id/relations - Voir les relations d'un fournisseur
    router.get('/:id/relations', async (req, res) => {
        const session = driver.session();
        try {
            const result = await session.run(
                'MATCH (n:Fournisseur)-[r]-(m) WHERE n.nom = $id RETURN n, r, m',
                { id: req.params.id }
            );

            const relations = result.records.map(record => ({
                fournisseur: record.get('n').properties,
                relation: record.get('r').type,
                connecte_a: record.get('m').properties
            }));

            res.json({ relations: relations });
        } catch (error) {
            console.error('Error fetching relations from Neo4j:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        } finally {
            await session.close();
        }
    });

    return router;
}

module.exports = fournisseursRoutes;