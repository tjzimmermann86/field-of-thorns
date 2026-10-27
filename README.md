# Field of Thorns

A pixel-art tower defense game. Grow a maze of thorns to steer the slimes, build towers, pick bonus cards and hold the gate for 50 rounds.

- Story campaign: one big land, conquer the Slime King's camps and free the Queen
- Challenge mode: 5 difficulties × 4 maps, unlocked as you clear them
- 9 towers plus Gold Market and upgradable Thorns, each up to level 10
- Bonus cards with 10 levels and milestone bonuses
- Plays with mouse and keyboard, or on tablets and phones in landscape

The whole game is a single static `index.html` — no build step. Deployed on Vercel straight from this repo.

## Setup on Vercel

- Static game: `index.html`, plus `manifest.webmanifest`, `sw.js` and `icons/` so it can be installed to a phone home screen and played offline.
- Shared ranking: `api/scores.js` (a Vercel serverless function). Connect an **Upstash Redis** store from the Vercel Marketplace to this project (Storage tab); it adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Redeploy afterwards. Without it the game still runs and keeps personal rankings in the browser.
