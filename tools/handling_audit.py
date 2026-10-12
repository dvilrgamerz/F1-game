#!/usr/bin/env python3
"""Offline DVILR GP handling/circuit sanity report (standard library only).

The playable browser physics is TypeScript. This Python script is a QA/tuning
tool, not a replacement car simulator or fake Formula 1 telemetry.
"""
from __future__ import annotations

import math
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
MODEL = (ROOT / "src/v3/physics/SteeringModel.ts").read_text(encoding="utf-8")
TRACK = (ROOT / "src/v3/track/ardenneGP.ts").read_text(encoding="utf-8")


def constant(pattern: str, source: str) -> float:
    found = re.search(pattern, source)
    if not found:
        raise SystemExit(f"Unable to read model constant: {pattern}")
    return float(found.group(1))


WHEELBASE = constant(r"const WHEELBASE_M = ([0-9.]+)", MODEL)
LENGTH = constant(r"lengthMeters: ([0-9.]+)", TRACK)
LAPS = int(constant(r"laps: ([0-9.]+)", TRACK))
PTS = [(float(x), float(y), float(z))
       for x, y, z in re.findall(r"\{ x: (-?[0-9.]+), y: (-?[0-9.]+), z: (-?[0-9.]+) \}", TRACK)]
assert 3 <= WHEELBASE <= 3.6
assert len(PTS) >= 20
assert LENGTH > 1000
assert LAPS >= 1

raw_perimeter = sum(math.dist(PTS[i], PTS[(i + 1) % len(PTS)])
                    for i in range(len(PTS)))
elevation = max(p[1] for p in PTS) - min(p[1] for p in PTS)
print(f"ARDENNE GP | Target: {LENGTH:.0f} m | Laps: {LAPS} | Wheelbase: {WHEELBASE:.2f} m")
print(f"Raw control polygon: {raw_perimeter:.0f} m | Elevation range: {elevation:.1f} m")
print("Note: The running game uses a scaled Catmull-Rom curve, not the raw polygon.")
print(" Speed  Max steer    Grip limit   Min radius @ full lock")
for kmh in [30, 80, 140, 200, 270, 330]:
    v = kmh / 3.6
    steer_lock = 0.55 - 0.44 * min(v / 100, 1) ** 0.68
    max_lat = 15 + 30 * min(v / 95, 1) ** 2
    yaw = min(v / WHEELBASE * math.tan(steer_lock), max_lat / max(v, 0.5))
    radius = v / yaw if yaw > 0 else float("inf")
    print(f"{kmh:4d} km/h  {math.degrees(steer_lock):6.1f} deg      "
          f"{max_lat / 9.80665:4.1f} g        {radius:7.1f} m")
assert elevation < 200, "Check whether track elevation is unrealistic."
