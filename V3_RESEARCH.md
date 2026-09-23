# DVILR GP V3 — Research-to-Code Notes

Research date: 2026-09-23

## Core decision

V3 should stop treating the car as a scalar speed plus heading and migrate to:

`input → powertrain/brakes/steering → four wheel slip → tyre forces → suspension/aero → rigid body → real motion/collision → race state`

The current playable loop remains temporarily so the repo does not become unusable during the migration.

## Physics direction

### Rapier
Use `@dimforge/rapier3d-compat` as the rigid-body/contact solver.

Why:
- browser/WASM support
- rigid bodies and colliders
- collision/contact events
- ray/scene queries
- force application at world-space points
- suitable foundation for car/barrier collisions

Official docs:
- https://rapier.rs/
- https://rapier.rs/docs/user_guides/javascript/getting_started_js/
- https://rapier.rs/docs/user_guides/javascript/rigid_bodies/
- https://rapier.rs/docs/user_guides/javascript/scene_queries/

### Tyres
Use a simplified Pacejka/Magic-Formula-inspired empirical model rather than claiming exact current Formula One tyre data.

V3 code now includes:
- longitudinal slip ratio
- lateral slip angle
- load-sensitive peak friction
- combined-slip ellipse
- temperature grip window
- wear grip loss
- compound definitions

Primary modelling reference:
- https://saemobilus.sae.org/papers/tyre-modelling-use-vehicle-dynamics-studies-870421

Temperature/condition reference:
- https://arxiv.org/abs/2305.18422

## Vehicle systems

V3 architecture now provides interfaces/models for:
- four wheels
- 8-speed-style sequential powertrain
- engine braking
- rear LSD torque split
- aero drag/downforce
- DRS drag/downforce reduction
- wake/slipstream aero effects
- ERS energy storage/deploy/harvest

These are fictional Formula-style parameters intended for tuning, not reproductions of a real current car.

## Track direction

Aurora International Circuit is the original V3 venue.

Its track metadata includes:
- elevation
- sectors
- DRS detection/activation data
- pit entry/exit
- pit speed limit
- race distance

Future production track assets should move to:
- GLB/glTF for runtime geometry
- low-detail collision meshes
- KTX2 compressed textures
- precomputed minimap path
- racing-line and checkpoint metadata

References:
- https://www.khronos.org/gltf/
- https://registry.khronos.org/KTX/specs/2.0/ktxspec.v2.html

## Full race systems

The target state machine is:

`grid → lights → racing → finishing → results`

Then extend to:

`practice → qualifying → grid → formation → lights → race → results`

Future race-control modules:
- sector timing
- track limits
- time penalties
- drive-through / stop-go style penalties
- pit limiter
- tyre compounds
- fuel
- damage
- local yellows
- VSC
- safety car
- weather/wet track

F1 race rules are used only as public reference material. The shipped ruleset should remain configurable and fictional.

Reference:
- https://www.formula1.com/en/latest/article/the-beginners-guide-to-f1-penalties.5lne3FfE8IXpGOagsmfq90

## AI

Physical V3 AI should send the same `VehicleInput` commands as a player.

Three layers:
1. driving — steering/throttle/brake
2. tactical — attack/defend/follow/recover
3. strategy — tyres/pits/weather

No AI teleporting when the physical migration is complete.

## Performance

Initial target:
- 60 Hz physics
- renderer interpolated independently
- 20 cars × 4 wheels = 80 wheel contacts per physics tick
- worker-based simulation later if profiling shows main-thread pressure
- visual LODs and instancing on mobile

## Legal/product boundary

DVILR GP stays original:
- fictional teams/drivers
- original liveries
- original sponsor marks
- original circuit
- no EA/Codemasters assets
- no official Formula One team logos or driver likenesses

F1 25 is used only as a systems-level design reference.
