# 🎓 E-Learning Video Player

Application web de lecture vidéo pour formations en local, gestion de progression via IndexedDB, et support des sous-titres SRT.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4.19-06B6D4)

## ✨ Fonctionnalités

### 📁 Sélection de Formation
- **Drag & drop** de dossiers directement dans l'application
- **Bouton de sélection** de dossier avec l'API File System Access (Chrome/Edge)
- **Scan automatique** pour détecter les formations disponibles
- **Affichage en grille** avec titre, nombre de vidéos et progression
- **Responsive** : 1 colonne (mobile), 2-3 (tablette), 4+ (desktop)

### 🎬 Lecteur Vidéo
- **Lecteur HTML5 custom** avec contrôles minimalistes
- **Play/Pause**, barre de progression, volume, plein écran
- **Navigation** : boutons vidéo précédente/suivante
- **Sous-titres SRT** parsés et affichés via `<track>`
- **Raccourcis clavier** :
  - `Espace` / `K` : Play/Pause
  - `←` / `→` : Reculer/Avancer 10s (30s avec Shift)
  - `↑` / `↓` : Augmenter/Diminuer le volume
  - `M` : Muet
  - `F` : Plein écran
  - `N` / `P` : Vidéo suivante/précédente
  - `>` / `<` : Vitesse de lecture

### 📊 Système de Progression (IndexedDB)
- **Progression par formation** : vidéos terminées, vidéo actuelle, timestamp
- **Historique** : date/heure de visionnage, temps passé
- **Reprise automatique** : proposition de reprendre ou recommencer
- **Marquage auto** : terminé à 90% de la vidéo
- **Marquage manuel** : bouton pour marquer comme terminé

### 📤 Import/Export
- **Exporter** : téléchargement JSON avec toutes les données
- **Importer** : restauration depuis un fichier JSON
- **Confirmation** en cas de conflit

### 📱 Navigation & UX
- **Design sombre** cohérent (slate-900, accents indigo/violet)
- **Transitions fluides** entre les pages
- **Loading states** lors du scan
- **Toast notifications** pour les actions
- **Responsive** : sidebar transformée en drawer sur mobile

## 🛠️ Stack Technique

- **React 19** + **Vite** + **TypeScript**
- **Tailwind CSS** pour le styling
- **shadcn/ui** pour les composants UI
- **IndexedDB** (via `idb`) pour le stockage local
- **React Router** pour la navigation
- **Zustand** pour la gestion d'état
- **Sonner** pour les notifications

## 📦 Installation

```bash
# Cloner le projet
git clone <url-du-projet>
cd elearning-video-player

# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev

# Builder pour la production
npm run build
```

## 📁 Structure des Données

L'application attend une structure de dossier comme suit :

```
Ma-Formation/
├── 01-Introduction/
│   ├── 01-bienvenue.mp4
│   ├── 01-bienvenue.srt
│   ├── 02-presentation.mp4
│   └── 02-presentation.srt
├── 02-Fondamentaux/
│   ├── 01-concepts.mp4
│   ├── 01-concepts.srt
│   ├── 02-exemples.mp4
│   └── 02-exemples.srt
└── 03-Pratique/
    ├── 01-exercice.mp4
    └── 02-correction.mp4
```

### Conventions de nommage
- **Dossiers** : numérotés (ex: `01-Introduction`)
- **Vidéos** : numérotées avec extension `.mp4`, `.webm`, `.mov`, etc.
- **Sous-titres** : même nom que la vidéo avec extension `.srt`
- **Ordre** : déterminé par le préfixe numérique

## 🎯 Utilisation

### 1. Ajouter une formation
- Glissez-déposez un dossier de formation sur la zone prévue
- Ou cliquez sur "Sélectionner un dossier"

### 2. Lire une formation
- Cliquez sur une carte de formation
- La première vidéo se lance automatiquement
- Ou reprenez là où vous vous étiez arrêté

### 3. Naviguer
- Utilisez la **sidebar** pour voir toutes les vidéos
- Cliquez sur une vidéo pour y accéder directement
- Les icônes indiquent le statut :
  - `○` : Non commencé
  - `▶` : En cours
  - `✓` : Terminé

### 4. Gérer votre progression
- La progression est sauvegardée **automatiquement**
- Exportez vos données pour les sauvegarder
- Importez-les sur un autre appareil

## ⌨️ Raccourcis Clavier

| Touche | Action |
|--------|--------|
| `Espace` / `K` | Play/Pause |
| `←` | Reculer 10s |
| `→` | Avancer 10s |
| `Shift + ←` | Reculer 30s |
| `Shift + →` | Avancer 30s |
| `↑` | Augmenter le volume |
| `↓` | Diminuer le volume |
| `M` | Muet |
| `F` | Plein écran |
| `N` / `PageDown` | Vidéo suivante |
| `P` / `PageUp` | Vidéo précédente |
| `>` / `.` | Augmenter la vitesse |
| `<` / `,` | Diminuer la vitesse |
| `Home` | Début de la vidéo |
| `End` | Fin de la vidéo |

## 🔒 Confidentialité

- **100% client-side** : aucun serveur, aucune donnée envoyée
- **Stockage local** : IndexedDB dans votre navigateur
- **Pas d'authentification** : single user
- **Exportable** : vos données vous appartiennent

## 🌐 Compatibilité

- **Chrome** / **Edge** : ✅ Complet (API File System Access)
- **Firefox** : ✅ Fallback input file
- **Safari** : ✅ Fallback input file
- **Mobile** : ✅ Interface adaptée

## 📝 License

(https://github.com/MedyOsef/elearning-video-player)

---

**Développé avec ❤️ pour les apprenants.**
