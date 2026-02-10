const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();

// --- CONFIGURATION ---
app.use(cors()); // Indispensable pour que le site Web de l'étudiant 2 fonctionne
app.use(express.json()); // Permet de lire le JSON envoyé par Android et l'ESP32

// --- 1. CONNEXION À LA BASE DE DONNÉES MYSQL ---
// On utilise les variables d'environnement définies dans docker-compose.yml
const db = mysql.createPool({
    host: process.env.DB_HOST || 'db', // 'db' est le nom du service dans docker-compose
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root_password',
    database: process.env.DB_NAME || 'smartgel_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- 2. INITIALISATION : CRÉATION AUTOMATIQUE DES TABLES ---

// A. Table des UTILISATEURS (Pour l'Étudiant 2 - Gestion des comptes)
const createUsersTable = `
    CREATE TABLE IF NOT EXISTS utilisateurs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        login VARCHAR(50) UNIQUE NOT NULL,
        mdp VARCHAR(255) NOT NULL,
        nom VARCHAR(100),
        role VARCHAR(20) NOT NULL -- 'RT' (Tech), 'RA' (Resp Agent), 'Agent'
    )
`;

// B. Table des BORNES (Pour l'Étudiant 3 & 4 - Suivi technique)
const createBornesTable = `
    CREATE TABLE IF NOT EXISTS bornes (
        id_esp VARCHAR(50) PRIMARY KEY,
        niveau_gel INT,
        niveau_batterie INT,
        salle VARCHAR(100),
        agent_id INT DEFAULT NULL, -- Pour l'affectation à un agent
        last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES utilisateurs(id) ON DELETE SET NULL
    )
`;

// Exécution de la création des tables au démarrage
db.query(createUsersTable, (err) => {
    if (err) console.error("❌ Erreur création table utilisateurs:", err);
    else console.log("✅ Table 'utilisateurs' prête.");
});

db.query(createBornesTable, (err) => {
    if (err) console.error("❌ Erreur création table bornes:", err);
    else console.log("✅ Table 'bornes' prête.");
});

// --- 3. ROUTES API ---

// === GESTION DES COMPTES (Pour le Site Web - Étudiant 2) ===

// Route INSCRIPTION (Créer un compte RT, RA ou Agent)
app.post('/api/register', (req, res) => {
    const { login, mdp, nom, role } = req.body;

    if (!login || !mdp || !role) {
        return res.status(400).json({ message: "Champs manquants (login, mdp, role)" });
    }

    const sql = "INSERT INTO utilisateurs (login, mdp, nom, role) VALUES (?, ?, ?, ?)";
    db.query(sql, [login, mdp, nom, role], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Erreur (Login déjà pris ?)" });
        }
        res.status(201).json({ success: true, message: "Compte créé avec succès !" });
    });
});

// Route LOGIN (Pour Android - Étudiant 4 & Web - Étudiant 2)
app.post('/api/login', (req, res) => {
    const { login, mdp } = req.body;

    const sql = "SELECT * FROM utilisateurs WHERE login = ? AND mdp = ?";
    db.query(sql, [login, mdp], (err, results) => {
        if (err) return res.status(500).json({ message: "Erreur serveur BDD" });

        if (results.length > 0) {
            const user = results[0];
            console.log(`Connexion réussie : ${user.login} (${user.role})`);
            res.json({
                success: true,
                id: user.id,
                nom: user.nom,
                role: user.role,
                message: "Authentification réussie"
            });
        } else {
            res.status(401).json({ success: false, message: "Identifiants incorrects" });
        }
    });
});

// === GESTION DES BORNES (Pour Android - Étudiant 4 & IoT - Étudiant 3) ===

// Route GET : Récupérer la liste des bornes
app.get('/api/bornes', (req, res) => {
    // On récupère aussi le nom de l'agent affecté si besoin
    const sql = `
        SELECT bornes.*, utilisateurs.nom as agent_nom 
        FROM bornes 
        LEFT JOIN utilisateurs ON bornes.agent_id = utilisateurs.id
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Erreur récupération bornes" });
        }
        res.json(results);
    });
});

// Route POST : Mise à jour par l'ESP32 (Simulation Étudiant 3)
// Si la borne existe, on met à jour. Si elle n'existe pas, on la crée.
app.post('/api/update', (req, res) => {
    const { id_esp, niv_gel, niv_batt } = req.body;
    
    // Salle par défaut si nouvelle borne
    const salleDefaut = "Salle Inconnue";

    const sql = `
        INSERT INTO bornes (id_esp, niveau_gel, niveau_batterie, salle) 
        VALUES (?, ?, ?, ?) 
        ON DUPLICATE KEY UPDATE niveau_gel = VALUES(niveau_gel), niveau_batterie = VALUES(niveau_batterie)
    `;

    db.query(sql, [id_esp, niv_gel, niv_batt, salleDefaut], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Erreur mise à jour borne");
        }
        console.log(`📡 Borne ${id_esp} mise à jour : Gel ${niv_gel}%, Batt ${niv_batt}%`);
        res.json({ message: "Données reçues et stockées" });
    });
});

// --- DEMARRAGE DU SERVEUR ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`🚀 API SMARTGEL DÉMARRÉE SUR LE PORT ${PORT}`);
    console.log(`📡 En attente de connexion MySQL...`);
    console.log(`=============================================`);
});