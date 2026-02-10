CREATE TABLE IF NOT EXISTS bornes (
    id_esp VARCHAR(50) PRIMARY KEY,
    niveau_gel INT,
    niveau_batterie INT,
    salle VARCHAR(100),
    horodatage TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertion de données pour tester vos alertes (Étudiant 4)
INSERT INTO bornes (id_esp, niveau_gel, niveau_batterie, salle) VALUES 
('ESP32_01', 85, 95, 'Salle B102'),    -- Borne OK
('ESP32_02', 5, 80, 'Accueil'),         -- ALERTE GEL ( < 10%)
('ESP32_03', 60, 8, 'Cafétéria');       -- ALERTE BATTERIE ( < 10%)