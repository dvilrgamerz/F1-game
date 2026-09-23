# DVILR GP V3 — Spa-Inspired Circuit + Real Pit Stop Blueprint

## Goal
Turn V3 into a complete start-to-finish Formula-style race experience with:
- a Spa-inspired elevation circuit
- functional pit entry, pit lane and pit box
- tyre changes and strategy
- a more realistic Formula-style car
- full race flow and classification
- deeper physical simulation using the existing V3 modules

## Circuit direction

The production-safe track should be an original **Spa-inspired** circuit rather than copied official assets.

Target characteristics:
- ~7 km scale
- 19-corner feel
- heavy elevation change
- tight Turn 1 hairpin
- steep uphill sequence inspired by Eau Rouge/Raidillon
- long high-speed straight
- fast flowing middle sector
- technical final sector
- pit lane beside start/finish straight
- two DRS-style zones
- three timing sectors

Recommended in-game name:
**Ardenne GP Circuit**

## Pit lane and pit stop flow

### Player flow
1. Player selects BOX THIS LAP.
2. HUD shows PIT CONFIRMED.
3. Player crosses pit entry trigger.
4. Pit limiter engages / player must stay under pit speed.
5. Pit spline guides car to assigned pit box.
6. Car stops inside pit-box tolerance.
7. Service timer starts.
8. Four tyre corners complete independently.
9. Optional front-wing repair extends stop.
10. Release waits for unsafe-release check.
11. Car follows pit-exit spline.
12. Player crosses pit exit and rejoins racing state.

### Service timings
Use tunable game values, not hard-coded real team data.

Base tyre stop:
- front-left: 2.0–2.8 s
- front-right: 2.0–2.8 s
- rear-left: 2.0–2.8 s
- rear-right: 2.0–2.8 s
- jack/release overhead: 0.2–0.5 s

Front wing repair:
- +5–10 s

### Pit penalties
- speeding in pit lane: time penalty
- crossing pit entry/exit line incorrectly: warning / penalty
- unsafe release: time penalty
- stopping outside box: extra delay

## Tyre strategy

Compounds:
- SOFT
- MEDIUM
- HARD

Each compound changes:
- peak grip
- optimum temperature
- wear
- warm-up
- pit strategy window

Race rule for V3:
- dry race requires at least two dry compounds
- optional configurable rules later

## Realistic Formula-style car

Use an original car named **DVILR F26**.

Visual targets:
- narrow nose
- layered front wing
- exposed wheels
- halo
- sculpted sidepods
- floor tunnels
- rear diffuser
- rear wing with DRS flap
- pushrod/pullrod-like suspension arms
- slick tyres
- brake discs and wheel rims
- fictional livery and sponsor marks

Physics targets:
- ~modern Formula-car mass scale
- four independent tyre contacts
- longitudinal/lateral slip
- combined grip
- load sensitivity
- spring/damper suspension
- anti-roll
- downforce and drag
- DRS
- slipstream/dirty air
- rear differential
- brake bias
- wheel lockup
- wheelspin
- ERS deployment

## Full race lifecycle

PRE_RACE
→ GRID
→ LIGHTS
→ RACING
→ PIT_WINDOW / FLAGS / INCIDENTS
→ LEADER_FINISH
→ FINISHING_FIELD
→ RESULTS

Race features:
- 20 cars
- grid positions
- five-light start
- timing sectors
- lap timing
- position updates
- penalties
- pit strategy
- AI pit stops
- chequered flag
- final classification
- best lap
- race restart

## Implementation order

### V3.1
- add Spa-inspired track metadata
- add pit stop state machine
- add tyre compound service
- add pit limiter and box detection
- connect results UI to race director

### V3.2
- migrate player to Rapier chassis
- raycast four wheel contacts
- suspension force at each corner
- tyre forces at contact patch
- aero and ERS forces

### V3.3
- migrate all AI to same physical car model
- overtaking/defending
- pit strategy
- collision avoidance
- mistakes

### V3.4
- car-to-car collision
- barrier collision
- front wing / floor / tyre damage
- flags and penalties
- VSC / safety car

### V3.5
- wet weather
- drying line
- replay
- controller/wheel bindings
- performance worker
