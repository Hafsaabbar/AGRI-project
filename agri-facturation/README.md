# AGRI Facturation - Documentation de l'Interface

Bienvenue sur l'interface de facturation AGRI. Ce document détaille les fonctionnalités et les pages disponibles pour les agents de facturation.

## Installation et Démarrage

### Prérequis
*   Node.js installé sur la machine.
*   Accès à la base de données Oracle configurée.

### Lancement
1.  **Backend** :
    *   Ouvrez un terminal dans le dossier `backend`.
    *   Installez les dépendances : `npm install`
    *   Lancez le serveur : `node server.js`
    *   Le serveur démarre sur le port 3000 (ou configuré).

2.  **Frontend** :
    *   Ouvrez le fichier `frontend/index.html` dans un navigateur web moderne.
    *   Ou utilisez une extension comme "Live Server" pour un meilleur confort.

## Navigation et Pages

L'interface est structurée autour d'un menu latéral gauche regroupant les fonctionnalités par catégories :

### 1. Principal
*   **Tableau de bord** : Vue synthétique de l'activité. Affiche les indicateurs clés et graphiques de performance.

### 2. Gestion Clients
*   **Fiches clients** : Module de gestion de la clientèle.
    *   Liste des clients enregistrés.
    *   Création de nouveaux clients.
    *   Modification des informations (coordonnées, etc.).

### 3. Documents
Cette section regroupe tous les documents commerciaux :
*   **Bons de commande** : Saisie et suivi des commandes clients.
*   **Bons de livraison** : Gestion des expéditions et génération des BL.
*   **Facturation** :
    *   Émission des factures pro-forma et définitives.
    *   Suivi des paiements et des échéances.
    *   Historique des factures émises.

### 4. Référence
*   **Catalogue** : Base de données des produits/services.
    *   Consultation des articles, prix et descriptions.
    *   Mise à jour du catalogue (selon droits d'accès).

## Fonctionnalités Clés
*   **Authentification Sécurisée** : Accès restreint par identifiant et mot de passe.
*   **Gestion de Profil** : Affichage de l'utilisateur connecté (Agent) et option de déconnexion.
*   **Interface Moderne** : Design intuitif avec mode sombre/clair et icônes explicites.
*   **Actualisation** : Bouton d'actualisation des données en temps réel en haut de page.
