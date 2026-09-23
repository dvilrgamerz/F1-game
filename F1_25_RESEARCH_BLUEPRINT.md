# Research Blueprint: Building an F1-25-style Browser Racing Game

## Reference feature pillars found in official F1 25 material

EA's official F1 25 material emphasizes:

1. Reworked handling: steering feel, tyre load/slip behavior, tyre overheating/wear, surface-dependent grip, clutch/throttle changes, ERS deployment and aerodynamic effects including dirty air.
2. More race-aware AI: overtaking, defensive moves and tactical DRS/ERS deployment.
3. High-authenticity circuits: several tracks rebuilt from LiDAR data, plus updated track-surface and lighting presentation.
4. Full race modes: Driver Career, My Team, Grand Prix, Time Trial, ranked/casual multiplayer and collaborative events.
5. Team ownership: engineering, personnel, corporate management, two-driver management, driver transfers and sponsors.
6. Customization: freer decal placement, custom liveries and driver-number styling.
7. Presentation: radio, commentary, podium sequences, replays, customizable HUD and broad controller/wheel support on PC.

Official references consulted:
- https://www.ea.com/games/f1/f1-25/news/f1-25-career-deep-dive
- https://www.ea.com/games/f1/f1-25/news/f1-25-braking-point
- https://www.ea.com/games/f1/f1-25/features/circuits
- https://www.ea.com/games/f1/f1-25/news/f1-25-advancements-deep-dive
- https://www.ea.com/games/f1/f1-25/news/f125-faq

## Browser implementation strategy

### Runtime
Use vanilla Three.js + TypeScript + Vite for direct control of the render loop, with the simulation stored outside scene objects. Move to Rapier for collision/rigid-body integration once the vehicle model needs real environment contact and crash response.

### Vehicle model
The production vehicle model should run in a fixed-step simulation (120 Hz is a good target) and separate:
- longitudinal tyre force
- lateral tyre force
- combined-slip limit
- wheel load
- aero downforce / drag
- yaw response
- differential
- braking
- engine / gears
- ERS harvesting + deployment
- tyre temperature / wear
- surface grip

### Track runtime
Ship tracks as optimized GLB/glTF 2.0 packages with stable pivots, collision proxies, LODs, reusable materials and compressed textures. Use spline metadata for racing line, marshal sectors, pit path, DRS detection/activation zones, timing lines and AI lanes.

### Garage and pit spaces
Treat the garage/pit box as an interactive gameplay room, not just decoration. The room-design workflow should lock player/vehicle circulation, production camera, interaction zones and performance budget before final 3D composition. Structural walls/floors/openings should be procedural, with generated/imported assets used as dressing.

### Rendering targets
- Desktop: 60 fps target, scalable shadows/post FX, high-quality reflections where affordable.
- Mobile: simplified shaders, reduced shadows, aggressive LOD, lower crowd density and render scale.
- WebGL2 baseline; WebGPU can be investigated as an optional high-end path rather than a launch dependency.

### Asset rule
Never ship raw DCC exports. Clean in Blender, export GLB/glTF, optimize meshes/textures, validate pivots/materials/collision and then test in the real runtime camera.

## Scope reality
A browser game can reproduce the *systems and feel* of a modern Formula racing title, but matching a AAA console/PC game's total art fidelity, licensed content, motion capture, voice library and production scale is a multi-stage project. The fastest route is to make one excellent car and one excellent original circuit first, then expand the race systems around a proven driving core.
