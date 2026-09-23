# DVILR GP — Web Formula Racing V3 Alpha

DVILR GP is an original browser-based open-wheel racing project built with Three.js, TypeScript and Vite. V3 begins the transition from the V2 kinematic prototype to a much more physically grounded Formula-style racing architecture.

## What is playable now

The live game still uses the lightweight V2-derived movement loop for the cars while V3 physical vehicle modules are being migrated in, but the V3 race systems are now connected to gameplay.

Visible V3 upgrades already on main:

- 44-lap Grand Prix
- 20-car field
- New **Ardenne GP Circuit**, an original Spa-inspired venue
- Heavy elevation and a longer high-speed layout
- Raised kerbs, runoff, gravel, barriers, vegetation and a functional pit lane
- **BOX THIS LAP** strategy command
- Soft / Medium / Hard tyre selection
- Automated pit-lane limiter/guide
- Pit-box stop with service countdown
- Tyre life and temperature reset after service
- Pit-speeding penalty tracking
- More detailed procedural Formula-style car with:
  - sidepods
  - halo
  - driver helmet/visor
  - front/rear wing endplates
  - diffuser
  - suspension arms
  - wheel rims and brake discs
- Metadata-driven DRS zones
- ERS, slipstream, tyre temperature and wear
- Five-light race start
- Chase, cockpit and broadcast cameras
- Minimap
- Chequered-flag finish
- Full 20-car classification screen after the race

## V3 physics architecture now in the repo

The new code under `src/v3/` is the foundation for replacing the old scalar-speed model.

### Physics

- Rapier 3D compatibility package
- Rigid-body world wrapper
- Four-wheel state types
- Magic-Formula-inspired tyre force model
- Combined-slip friction ellipse
- Load-sensitive grip
- Temperature and wear grip scaling
- Soft / Medium / Hard compound definitions
- Torque-curve powertrain
- 8-speed sequential-style ratios
- Engine braking
- Rear LSD torque split
- Front/rear aerodynamic downforce
- Drag
- DRS aero changes
- Slipstream/wake aero reduction
- ERS energy/deployment model

### Race systems

- Race phase state machine
- Grid → lights → racing → finishing → results
- Driver progress/classification types
- Penalty-time-ready classification
- Configurable race length
- Track metadata for:
  - sectors
  - DRS zones
  - pit entry/exit
  - pit speed
  - elevation/control points

### AI

- New physical-driver input interface
- Target-speed control
- steering from heading/lateral error
- traffic reaction
- DRS/ERS decision hooks

## Source layout

```
src/
  main.ts                 current playable renderer/game loop
  v3/
    index.ts
    types.ts
    ai/
      AiDriver.ts
    physics/
      AeroModel.ts
      EnergySystem.ts
      Powertrain.ts
      RapierWorld.ts
      TireModel.ts
    race/
      RaceDirector.ts
      PitStopSystem.ts
    track/
      auroraRing.ts
      ardenneGP.ts
```

## Install and run

```bash
npm install
npm run dev
```

Type-check:

```bash
npm run typecheck
```

Production build:

```bash
npm run build
```

## Important V3 status

V3 is now a **real architecture migration**, but the full physical 20-car simulator is not finished yet.

The current rendered race still uses the old lightweight movement loop. The new Rapier/tyre/powertrain/aero systems are in the repo so the next migration can move the player car first, then AI cars, without throwing away the playable game.

The correct order is:

1. Replace player movement with Rapier + four wheel contacts.
2. Tune braking, wheelspin, lockups, suspension and aero.
3. Move all 19 AI cars onto the same physical vehicle model.
4. Add real car-to-car/barrier collisions and damage.
5. Extend the now-working pit system with AI strategy, fuel and repairs.
6. Add flags, penalties, VSC/safety car and track limits.
7. Add weather/wet track/drying line.
8. Add replay, gamepad/wheel support and multiplayer-ready snapshots.

## Research basis

V3 architecture follows current Rapier browser physics capabilities and standard real-time vehicle simulation techniques. Rapier's official JS bindings support rigid bodies, colliders, forces at world-space points and browser/WebAssembly use. The tyre model is a simplified empirical model inspired by Pacejka-style vehicle dynamics rather than a claim to reproduce confidential real Formula One tyre data.

## Branding / licensing

This is an original Formula-style racing game. Official Formula One team names, logos, liveries, driver likenesses, EA/Codemasters game assets and scanned licensed circuit geometry are not included.
