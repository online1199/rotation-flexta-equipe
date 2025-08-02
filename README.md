# Planificateur de rotation 18h/16h

Application web moderne pour gérer équitablement les horaires de sortie d'une équipe de 5 personnes, avec rotation automatique entre les créneaux 18h (3 personnes) et 16h (2 personnes).

## ✨ Fonctionnalités

### 🎯 Gestion d'équipe
- **Équipe fixe de 5 personnes** avec validation stricte
- Interface intuitive pour ajouter, modifier et réorganiser les membres
- Génération automatique d'initiales pour les avatars

### 📅 Planification intelligente
- **Algorithme de rotation équitable** : sur 5 jours, chaque personne a 3 créneaux 18h et 2 créneaux 16h
- **Gestion des week-ends** : option pour ignorer samedi/dimanche
- **Verrouillage de journées** : possibilité de modifier manuellement une journée sans affecter la rotation

### 📊 Exports et partage
- **Export CSV** : format tableau avec colonnes date, 18h_1, 18h_2, 18h_3, 16h_1, 16h_2
- **Export ICS** : calendrier compatible avec Outlook/Google Calendar (fuseau Europe/Paris)
- **Sauvegarde JSON** : backup complet des données pour restauration

### 💾 Persistance des données
- **Sauvegarde automatique** dans le navigateur (LocalStorage)
- **Import/Export** pour transférer les données entre appareils
- **Gestion des jours verrouillés** préservée lors des régénérations

## 🔧 Technologies utilisées

- **Frontend** : React 18 + TypeScript + Vite
- **UI** : Tailwind CSS + shadcn/ui
- **État** : Zustand pour la gestion d'état
- **Dates** : date-fns + date-fns-tz (fuseau Europe/Paris)
- **Icônes** : Lucide React
- **Exports** : ICS.js pour les calendriers
- **Tests** : Vitest pour les tests unitaires

## 🚀 Installation et développement

```bash
# Installation des dépendances
npm install

# Démarrage du serveur de développement
npm run dev

# Tests unitaires
npm run test

# Tests avec interface graphique
npm run test:ui

# Build de production
npm run build
```

## 📐 Algorithme de rotation

L'algorithme utilise une **rotation circulaire** pour garantir l'équité :

```typescript
// Pour un jour d (0-indexé), rotation gauche de d positions
const shiftAmount = d % 5;
const rotatedNames = [
  ...names.slice(shiftAmount),
  ...names.slice(0, shiftAmount)
];

// Indices 0-2 → 18h, indices 3-4 → 16h
const eighteen = rotatedNames.slice(0, 3);
const sixteen = rotatedNames.slice(3, 5);
```

### Exemple sur 5 jours :
- **Jour 0** : Alice, Bob, Charlie (18h) | Diana, Eve (16h)
- **Jour 1** : Bob, Charlie, Diana (18h) | Eve, Alice (16h)
- **Jour 2** : Charlie, Diana, Eve (18h) | Alice, Bob (16h)
- **Jour 3** : Diana, Eve, Alice (18h) | Bob, Charlie (16h)
- **Jour 4** : Eve, Alice, Bob (18h) | Charlie, Diana (16h)

**Résultat** : Chaque personne a exactement 3 créneaux 18h et 2 créneaux 16h.

## 🎨 Interface utilisateur

### Navigation par étapes
1. **Équipe** : Configuration des 5 membres
2. **Paramètres** : Date de début, durée, gestion week-ends
3. **Planning** : Visualisation et gestion du planning

### Fonctionnalités avancées
- **Recherche** dans le planning par nom ou date
- **Pagination** pour les longs plannings
- **Statistiques** de distribution des créneaux
- **Mode responsive** pour mobile et desktop
- **Accessibilité** : navigation clavier, contrastes AA

## 📱 Utilisation

1. **Ajoutez 5 membres** à votre équipe dans l'onglet "Équipe"
2. **Configurez les paramètres** : date de début, nombre de jours, option week-ends
3. **Générez le planning** et visualisez la répartition équitable
4. **Verrouillez des journées** si vous devez faire des ajustements manuels
5. **Exportez** en CSV pour Excel ou ICS pour votre calendrier

## 🧪 Tests

L'application inclut des tests unitaires complets pour :
- L'algorithme de rotation (équité sur cycles de 5 jours)
- La gestion des week-ends
- La persistance des jours verrouillés
- La génération d'initiales
- La validation des données

```bash
npm run test
```

## 📄 Formats d'export

### CSV
```
date,18h_1,18h_2,18h_3,16h_1,16h_2
01/01/2024,Alice,Bob,Charlie,Diana,Eve
02/01/2024,Bob,Charlie,Diana,Eve,Alice
```

### ICS (Calendrier)
- Un événement par personne et par jour
- **Service 18h** : 09:00-18:00
- **Sortie 16h** : 09:00-16:00
- Fuseau horaire : Europe/Paris

### JSON (Sauvegarde)
```json
{
  "version": "1.0",
  "teamMembers": [...],
  "assignments": [...],
  "plannerParams": {...}
}
```

## 🌐 Déploiement

L'application est une SPA (Single Page Application) qui peut être déployée sur n'importe quel hébergeur statique :
- Netlify, Vercel, GitHub Pages
- Serveur web traditionnel (Apache, Nginx)

Les données sont stockées localement dans le navigateur et peuvent être sauvegardées/restaurées via les exports JSON.

## 📋 Configuration recommandée

- **Navigateur moderne** avec support ES2020+
- **JavaScript activé** pour le fonctionnement de l'app
- **LocalStorage activé** pour la persistance des données

---

Développé avec ❤️ pour une gestion équitable et transparente des horaires d'équipe.