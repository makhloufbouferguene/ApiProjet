const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors()); // Autorise les requêtes provenant du site web de l'Étudiant 2
app.use(express.json()); // Permet de lire le format JSON envoyé par Android ou l'ESP32

// --- DONNÉES DE TEST (MOCK) ---

// Utilisateurs définis selon les rôles du projet [cite: 127]
const users = [
    { login: "admin", mdp: "123", role: "RT", nom: "Responsable Technique" },
    { login: "chef", mdp: "456", role: "RA", nom: "Responsable des Agents" },
    { login: "agent01", mdp: "789", role: "Agent", nom: "Jean Dupont" }
];

// État initial des bornes [cite: 119, 120, 121, 122]
let bornes = [
    { 
        id_esp: "ESP32_01", 
        niveau_gel: 85, 
        niveau_batterie: 95, 
        salle: "Entrée Principale", 
        last_update: new Date().toISOString() 
    },
    { 
        id_esp: "ESP32_02", 
        niveau_gel: 8, // Cas d'alerte : < 10% [cite: 128]
        niveau_batterie: 45, 
        salle: "Cafétéria", 
        last_update: new Date().toISOString() 
    }
];

// --- ROUTES API ---

// 1. Authentification (Login/MDP) [cite: 141, 145, 219]
app.post('/api/login', (req, res) => {
    const { login, mdp } = req.body;
    const user = users.find(u => u.login === login && u.mdp === mdp);

    if (user) {
        console.log(`Connexion : ${user.nom} (${user.role})`);
        res.status(200).json({
            success: true,
            role: user.role,
            nom: user.nom
        });
    } else {
        res.status(401).json({ success: false, message: "Identifiants incorrects" });
    }
});

// 2. Récupérer toutes les bornes (Pour RT et RA) [cite: 142, 148]
app.get('/api/bornes', (req, res) => {
    res.json(bornes);
});

// 3. Recevoir les données d'une borne (Simulation Étudiant 3 / ESP32) [cite: 135, 202]
app.post('/api/update', (req, res) => {
    const { id_esp, niv_gel, niv_batt } = req.body;
    
    // Mise à jour ou ajout de la borne dans la liste
    const index = bornes.findIndex(b => b.id_esp === id_esp);
    const updatedData = {
        id_esp,
        niveau_gel: niv_gel,
        niveau_batterie: niv_batt,
        salle: index !== -1 ? bornes[index].salle : "Salle inconnue",
        last_update: new Date().toISOString()
    };

    if (index !== -1) {
        bornes[index] = updatedData;
    } else {
        bornes.push(updatedData);
    }

    console.log(`Mise à jour reçue pour ${id_esp}: Gel ${niv_gel}%, Batt ${niv_batt}%`);
    res.status(200).json({ message: "Données reçues et stockées" });
});

// Lancement du serveur sur le port 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`API PROJET BORNE DE GEL LANCÉE`);
    console.log(`Local : http://localhost:${PORT}`);
    console.log(`URL Android (Émulateur) : http://10.0.2.2:${PORT}`);
    console.log(`=============================================`);
});