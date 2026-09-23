# DVILR GP v2 — Deep Research Notes

Research date: 2026-09-23

## What v2 borrowed at the systems level

The goal is not to reproduce EA/Codemasters assets. The useful reference is how a modern Formula racing title creates racing depth.

### 1. Track accuracy changes driving feel
EA's F1 25 circuit material says its LiDAR-updated circuits use millions of scan points and reproduce details such as bumps, elevation, kerb height and barrier distances. For a web game, the practical lesson is that kerbs, runoff, gravel and barrier placement should be gameplay surfaces rather than decoration.

Official source:
https://www.ea.com/games/f1/f1-25/features/circuits

### 2. Tyres and aero need to affect the car
EA's F1 25 deep-dive material describes changes around tyre load/slip, overheating and wear, surface grip, ERS deployment, slipstream/dirty-air behavior and AI racecraft. V2 introduces lightweight versions of tyre temperature/wear, surface grip, slipstream, ERS and DRS so those systems can be expanded later.

Official source:
https://forums.ea.com/blog/f1-games-game-info-hub-en/race-your-way---ea-sports%E2%84%A2-f1%C2%AE-25-deep-dive/12111491

### 3. Racing UI should expose useful state
EA documents customizable race UI, broad controller/wheel support and replay/highlight features for F1 25. V2 therefore expands telemetry and keeps the HUD in DOM rather than burying it inside WebGL.

Official source:
https://www.ea.com/games/f1/f1-25/news/f1-25-pc-features

Accessibility reference:
https://www.ea.com/able/resources/f1-25

### 4. Repeated environment objects need browser-efficient rendering
Three.js documents InstancedMesh specifically for rendering many copies of the same geometry/material with fewer draw calls. V2 uses instancing for barriers, track markers, vegetation and kerb groups.

Three.js source:
https://threejs.org/docs/pages/InstancedMesh.html

## Deliberately not copied

- Official F1 car models
- F1/FIA logos
- Team logos/liveries
- Driver names or likenesses
- EA/Codemasters UI assets
- Licensed circuits or scanned geometry
- Audio/voice lines from F1 25

DVILR GP should stay an original Formula-style game while using publicly described racing-game concepts as design references.
