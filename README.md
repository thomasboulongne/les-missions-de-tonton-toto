# Les missions de Tonton Toto 🤖

Une application web "Mission Control" pour un jeu de programmation mBot2 destiné aux enfants de 8 ans et plus.

## Fonctionnalités

- **Page d'accueil** : Affiche la mission en cours avec histoire, objectif, contraintes et critères de réussite
- **Indices progressifs** : Deux indices cachés que l'enfant peut révéler progressivement
- **Soumission de mission** : Formulaire pour décrire comment s'est passée la mission
- **Feedback en temps réel** : Carte de feedback quand Tonton Toto approuve ou demande des ajustements
- **Notifications push** : L'enfant reçoit une notification quand sa mission est revue (même si l'app est fermée)
- **Archives** : Historique de toutes les missions avec leurs soumissions et statuts
- **Administration** : Création de missions, review avec "Approuver" / "À retravailler" + message personnalisé

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

## Configuration des notifications push

Pour activer les notifications push (informer l'enfant quand sa mission est validée) :

1. Générer les clés VAPID :

   ```bash
   npx web-push generate-vapid-keys
   ```

2. Ajouter les variables d'environnement dans Netlify :

   - `VAPID_PUBLIC_KEY` : la clé publique générée
   - `VAPID_PRIVATE_KEY` : la clé privée générée
   - `VAPID_SUBJECT` : une URL mailto (ex: `mailto:tonton@example.com`)

3. Les notifications fonctionneront automatiquement sur les navigateurs compatibles (Chrome, Edge, Firefox)

## Déploiement sur Netlify

1. Connecter le repo à Netlify
2. Activer l'intégration Neon dans le dashboard Netlify
3. Les déploiements se font automatiquement à chaque push

## Structure du projet

```
src/
├── components/         # Composants réutilisables
│   ├── DifficultyBadge/
│   ├── FeedbackCard/   # Carte de feedback après review
│   ├── HintsSection/
│   ├── MissionCard/
│   ├── MissionForm/
│   └── SubmissionDialog/
├── lib/
│   ├── api.ts           # Client API
│   └── pushNotifications.ts  # Helpers notifications push
├── routes/
│   ├── Home.tsx        # Page d'accueil (mission en cours + feedback)
│   ├── Archives.tsx    # Archives des missions
│   └── Admin.tsx       # Administration (approve/needs_work)
├── styles/
│   └── global.css      # Styles globaux
└── types.ts            # Types TypeScript

netlify/
└── functions/
    ├── missions.ts          # API missions
    ├── submissions.ts       # API soumissions + push notifications
    ├── push-subscriptions.ts # Gestion des abonnements push
    └── vapid-public-key.ts  # Clé publique VAPID

public/
└── custom-sw.js        # Service worker pour push notifications

db/
└── schema.sql          # Schéma de la base de données
```

## Routes

| Route       | Description                        |
| ----------- | ---------------------------------- |
| `/`         | Mission en cours                   |
| `/missions` | Archives de toutes les missions    |
| `/admin`    | Administration (création + review) |

## API Endpoints

| Endpoint                                               | Méthode | Description                                                   |
| ------------------------------------------------------ | ------- | ------------------------------------------------------------- |
| `/.netlify/functions/missions`                         | GET     | Liste des missions                                            |
| `/.netlify/functions/missions?current=true`            | GET     | Mission en cours                                              |
| `/.netlify/functions/missions`                         | POST    | Créer une mission                                             |
| `/.netlify/functions/missions`                         | PATCH   | Modifier une mission                                          |
| `/.netlify/functions/missions`                         | DELETE  | Supprimer une mission                                         |
| `/.netlify/functions/submissions`                      | GET     | Liste des soumissions                                         |
| `/.netlify/functions/submissions?reviewed_since=<ISO>` | GET     | Soumissions revues depuis une date                            |
| `/.netlify/functions/submissions`                      | POST    | Créer une soumission                                          |
| `/.netlify/functions/submissions`                      | PATCH   | Reviewer une soumission (status: pending/approved/needs_work) |
| `/.netlify/functions/push-subscriptions`               | POST    | S'abonner aux notifications push                              |
| `/.netlify/functions/push-subscriptions`               | DELETE  | Se désabonner des notifications push                          |
| `/.netlify/functions/vapid-public-key`                 | GET     | Obtenir la clé publique VAPID                                 |

## Licence

Projet personnel pour usage familial.
