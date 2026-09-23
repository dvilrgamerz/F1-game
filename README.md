# DVILR GP — Web Formula Prototype v0.1

A browser-first 3D open-wheel racing prototype inspired by the depth and race-weekend feel of modern Formula racing games, without copying official F1 branding, team liveries, driver likenesses, logos, or proprietary game assets.

## What is already in v0.1

- Three.js + TypeScript + Vite
- Procedural 3D Formula-style car (no copyrighted assets)
- Original closed circuit generated from a spline
- 20-car race grid (1 player + 19 AI)
- 5-lap Grand Prix loop
- Fixed-step 120 Hz driving simulation
- Speed-dependent steering
- Basic drag, braking, off-track grip loss and tyre wear
- ERS/overtake deployment
- DRS-style straight-line system
- Auto gearbox telemetry
- Chase, cockpit and broadcast cameras
- Live position, lap time and best lap HUD
- Keyboard + basic mobile touch controls
- Responsive browser UI

## Run locally

```bash
npm install
npm run dev
```

Open the local URL Vite prints in your browser.

## Controls

- W / Up: throttle
- S / Down: brake
- A / D or Left / Right: steer
- Space: ERS overtake deployment
- E: toggle DRS when in the DRS zone
- C: change camera
- R: reset car
- Esc: pause

## Production architecture for the full game

The full project should keep simulation state outside the Three.js renderer. Recommended top-level modules:

- `simulation/vehicle`: tyre slip, load transfer, aero map, power unit, ERS, fuel, damage
- `simulation/race`: sessions, grids, flags, penalties, timing, safety car/VSC, pit rules
- `simulation/ai`: racing line, overtaking, defending, strategy and mistakes
- `render/`: scene, cameras, weather, lighting, particles, replays
- `assets/`: GLB/glTF cars, tracks, pit/garage props, KTX2 textures, LODs
- `ui/`: DOM HUD, race engineer, garage setup, results, career screens
- `online/`: authoritative multiplayer service and anti-cheat validation
- `diagnostics/`: frame timing, telemetry export, AI debug, replay inspection

## Roadmap toward an F1-25-level feature set

### v0.2 — Driving physics
- Four-wheel tyre model with slip angle/slip ratio
- Load sensitivity and temperature windows
- Differential, brake bias, engine braking
- Ride height, aero balance, dirty air and slipstream
- Kerb/grass/gravel surface materials
- Controller deadzones and steering curves

### v0.3 — Race systems
- Practice / qualifying / race weekend
- Starts, jump-start detection, flags and penalties
- Pit lane, pit limiter, tyre compounds and strategy
- Fuel and ERS strategy
- DRS detection/activation rules
- Weather + drying racing line

### v0.4 — AI
- 20-driver personality profiles
- Overtake/defend logic
- Multi-line racing
- Mistakes, lockups and spins
- Strategy calls and pit windows
- Difficulty scaling

### v0.5 — Presentation
- Replay cameras and highlights
- Race engineer messages
- Full HUD customization
- Garage setup UI
- Photo/replay mode
- Broadcast-style results and podium sequence

### v0.6 — Team/Career
- Original 10-team championship + custom 11th team
- Two-driver team ownership
- Engineering / personnel / commercial facilities
- R&D and part development
- Driver market and contracts
- Sponsors and livery editor
- Multi-season progression

### v0.7 — Multiplayer
- Private lobbies
- Ranked races
- Spectating
- Race director tools
- Reconnect handling
- Server-validated race state

### v1.0 — Web release
- Optimized GLB + Meshopt geometry
- KTX2/Basis textures
- LOD and instancing budgets
- Desktop high quality + mobile performance presets
- Accessibility and remappable controls
- Full original championship content

## Legal / branding boundary

To publish safely without licenses, use original game branding, original driver names, fictional teams, original car liveries, original sponsor marks, original voice lines and original circuit environments. Do not package EA/Codemasters assets or official Formula 1 team/driver branding into the project without permission.
