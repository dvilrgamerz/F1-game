# DVILR GP — Web Formula Racing v2

A browser-first 3D open-wheel racing game built with Three.js, TypeScript and Vite. The goal is to capture the systems-level depth of modern Formula racing games while keeping the branding, cars, drivers and circuit original.

## V2 highlights

### Track and environment
- Original high-speed circuit
- Raised red/white corner kerbs
- Green runoff around the racing surface
- Gravel traps at selected high-risk corners
- Instanced track barriers and trackside markers
- Instanced vegetation for better depth without hundreds of separate draw calls
- Visual pit-lane route beside the main straight
- Start/finish line and 5-light race start

### Driving model
- 120 Hz fixed-step simulation
- Speed-dependent steering
- Basic aerodynamic grip scaling with speed
- Surface-specific grip for asphalt, kerb, runoff and gravel
- Tyre wear
- Tyre temperature with an operating window
- Heat-driven tyre degradation
- ERS/overtake deployment and recharge
- Slipstream that reduces drag behind another car
- Two DRS-style zones
- DRS eligibility based on race lap and a nearby car ahead
- Automatic DRS closure under braking

### Racing
- 20-car field: player + 19 AI cars
- Five-lap Grand Prix
- AI slows according to local circuit curvature
- AI uses changing lateral racing lines instead of one fixed train
- Live race position
- Lap timing and best lap
- Three cameras: chase, cockpit and broadcast
- Full start-light sequence

### V2 HUD
- Speed and automatic gear display
- Throttle and brake telemetry
- ERS level
- Tyre life
- Tyre temperature
- DRS ready/active indication
- Slipstream indication
- Current track surface
- Live circuit minimap
- Desktop and mobile layouts

## Controls

- W / Up — throttle
- S / Down — brake
- A / D or Left / Right — steer
- Space — hold ERS overtake
- E — open/close DRS when eligible
- C — change camera
- R — reset car
- Esc — pause

Touch devices also get steering, throttle, brake, ERS and DRS controls.

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Stack

- Three.js
- TypeScript
- Vite
- DOM-based racing HUD
- InstancedMesh for repeated track objects

## Why v2 is structured this way

The simulation remains separate from Three.js rendering state. That gives future versions room for a real four-wheel tyre model, suspension, collisions, pit rules, damage, multiplayer and replays without turning the scene graph into the source of truth.

Three.js recommends `InstancedMesh` when many objects reuse the same geometry/material because it reduces draw calls. V2 uses that pattern for barriers, markers, vegetation and kerbs.

## Next: v3

- Four independent wheels with slip ratio + slip angle
- Brake lockups and wheelspin
- Differential + brake bias
- Suspension/load transfer
- Actual barrier/car collision response with Rapier
- Pit entry/exit gameplay and pit limiter
- Soft/medium/hard tyre compounds
- Fuel load and race strategy
- Yellow flags, penalties and track limits
- Dynamic weather + wet grip + drying line
- Better overtaking/defending AI
- Replays and race highlights
- Garage/car-setup screen
- Controller/gamepad mapping

## Research notes

See `V2_RESEARCH.md` and `F1_25_RESEARCH_BLUEPRINT.md`.

## Branding / licensing

This project is Formula-racing inspired. It should use original game branding, fictional teams/drivers, original liveries, original sponsors and original circuit environments unless separate permission is obtained for licensed content.
