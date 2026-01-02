# Les missions de Tonton Toto 🤖

Une application web "Mission Control" pour un jeu de programmation mBot2 destiné aux enfants de 8 ans et plus.

## Fonctionnalités

- **Page d'accueil** : Affiche la mission en cours avec histoire, objectif, contraintes et critères de réussite
- **Indices progressifs** : Deux indices cachés que l'enfant peut révéler progressivement
- **Soumission de mission** : Formulaire pour décrire comment s'est passée la mission
- **Archives** : Historique de toutes les missions avec leurs soumissions
- **Administration** : Création de nouvelles missions et review des soumissions

## Stack technique

- React (Vite) + TypeScript
- React Router v6
- Radix UI + Radix Themes
- CSS Modules
- Netlify Functions
- Neon (PostgreSQL serverless)

## Développement local

```bash
# Installation des dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Lancer avec Netlify CLI (pour tester les fonctions)
npx netlify dev
```

## Configuration de la base de données

1. Créer une base de données Neon sur [neon.tech](https://neon.tech)
2. Copier la connection string dans les variables d'environnement Netlify (`DATABASE_URL`)
3. Exécuter le script SQL dans `db/schema.sql` pour créer les tables

## Déploiement sur Netlify

1. Connecter le repo à Netlify
2. Activer l'intégration Neon dans le dashboard Netlify
3. Les déploiements se font automatiquement à chaque push

## Structure du projet

```
src/
├── components/         # Composants réutilisables
│   ├── DifficultyBadge/
│   ├── HintsSection/
│   ├── MissionCard/
│   ├── MissionForm/
│   └── SubmissionDialog/
├── lib/
│   └── api.ts          # Client API
├── routes/
│   ├── Home.tsx        # Page d'accueil (mission en cours)
│   ├── Archives.tsx    # Archives des missions
│   └── Admin.tsx       # Administration
├── styles/
│   └── global.css      # Styles globaux
└── types.ts            # Types TypeScript

netlify/
└── functions/
    ├── missions.ts     # API missions
    └── submissions.ts  # API soumissions

db/
└── schema.sql          # Schéma de la base de données
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Mission en cours |
| `/missions` | Archives de toutes les missions |
| `/admin` | Administration (création + review) |

## API Endpoints

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/.netlify/functions/missions` | GET | Liste des missions |
| `/.netlify/functions/missions?current=true` | GET | Mission en cours |
| `/.netlify/functions/missions` | POST | Créer une mission |
| `/.netlify/functions/missions` | PATCH | Modifier une mission |
| `/.netlify/functions/missions` | DELETE | Supprimer une mission |
| `/.netlify/functions/submissions` | GET | Liste des soumissions |
| `/.netlify/functions/submissions` | POST | Créer une soumission |
| `/.netlify/functions/submissions` | PATCH | Reviewer une soumission |

## Licence

Projet personnel pour usage familial.
