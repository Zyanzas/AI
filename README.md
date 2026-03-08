# Seeker Ascension (Mobile Fitness RPG)

A dark-fantasy mobile-first web app that transforms workouts into RPG-style progression inspired by secret power hierarchies.

## Run locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Ready to download / install

This app is now a **PWA** (Progressive Web App):

- On Android Chrome: open the app URL → tap **Install App** (or browser menu → **Add to Home Screen**).
- On iOS Safari: open app URL → Share → **Add to Home Screen**.
- The service worker caches app files for offline launch.

## Download package (zip)

```bash
zip -r seeker-ascension.zip index.html styles.css app.js sw.js manifest.webmanifest icons README.md
```

You can host the zip contents on any static server (GitHub Pages, Netlify, Vercel, nginx, etc.).

## Core Features

- Sequence progression from Sequence 9 → Sequence 0
- XP-driven advancement with animated level-up overlay
- Workout logging and step counter
- Daily quests, weekly boss challenge, and achievements
- Player avatar + stat growth (Strength, Endurance, Agility, Vitality)
- Artifact and potion drops
- Daily login rewards and streak tracking
- Leaderboard and progression tree
- Install button + offline caching via service worker

Data is stored in `localStorage`.
