"""Reference-derived motion measurements for Stick Nodes QA.

This module consumes observed landmark tracks, not hand-authored pose angles. It is
format-agnostic so a validated native timeline decoder can feed it later. Coordinates
must already be in a consistent world/stage coordinate system.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Dict, Iterable, List, Mapping, Optional, Sequence, Tuple
import math

Point = Tuple[float, float]


@dataclass(frozen=True)
class MotionSample:
    frame: int
    landmark: str
    x: float
    y: float
    vx: Optional[float]
    vy: Optional[float]
    speed: Optional[float]
    ax: Optional[float]
    ay: Optional[float]
    acceleration: Optional[float]
    jerk: Optional[float]


def _valid_point(p: object) -> bool:
    return (isinstance(p, (tuple, list)) and len(p) == 2
            and all(isinstance(v, (int, float)) and math.isfinite(v) for v in p))


def analyze_landmark_tracks(
    frames: Sequence[Mapping[str, Point]],
    fps: float,
) -> Dict[str, object]:
    """Measure position, velocity, acceleration and scalar jerk for each landmark.

    Missing landmarks stay missing; no interpolation is silently invented. Derivatives
    use actual frame spacing (1/fps). The first sample has no velocity, the first two
    have no acceleration, and the first three have no jerk.
    """
    if not math.isfinite(fps) or fps <= 0:
        raise ValueError("fps must be finite and positive")
    names = sorted({name for frame in frames for name in frame})
    tracks: Dict[str, List[Optional[Point]]] = {
        name: [tuple(frame[name]) if name in frame and _valid_point(frame[name]) else None
               for frame in frames]
        for name in names
    }
    output: Dict[str, List[dict]] = {}
    dt = 1.0 / fps
    for name, points in tracks.items():
        rows: List[MotionSample] = []
        velocities: List[Optional[Point]] = []
        accelerations: List[Optional[Point]] = []
        for i, p in enumerate(points):
            if p is None or i == 0 or points[i-1] is None:
                velocities.append(None)
            else:
                q = points[i-1]
                velocities.append(((p[0]-q[0])/dt, (p[1]-q[1])/dt))
        for i, v in enumerate(velocities):
            prev = velocities[i-1] if i else None
            if v is None or prev is None:
                accelerations.append(None)
            else:
                accelerations.append(((v[0]-prev[0])/dt, (v[1]-prev[1])/dt))
        for i, (p, v, a) in enumerate(zip(points, velocities, accelerations)):
            prev_a = accelerations[i-1] if i else None
            jmag = None
            if a is not None and prev_a is not None:
                jmag = math.hypot((a[0]-prev_a[0])/dt, (a[1]-prev_a[1])/dt)
            rows.append(MotionSample(
                frame=i, landmark=name,
                x=float(p[0]) if p else math.nan,
                y=float(p[1]) if p else math.nan,
                vx=v[0] if v else None, vy=v[1] if v else None,
                speed=math.hypot(*v) if v else None,
                ax=a[0] if a else None, ay=a[1] if a else None,
                acceleration=math.hypot(*a) if a else None, jerk=jmag))
        output[name] = [asdict(r) for r in rows]
    return {"fps": fps, "frame_count": len(frames), "landmarks": output,
            "derivative_units": {"velocity": "stage-units/second",
                                 "acceleration": "stage-units/second^2",
                                 "jerk": "stage-units/second^3"}}


def measure_contact_drift(
    frames: Sequence[Mapping[str, Point]],
    landmark: str,
    start_frame: int,
    end_frame: int,
) -> Dict[str, object]:
    """Measure a candidate planted landmark's world-space drift over an inclusive interval."""
    if start_frame < 0 or end_frame < start_frame or end_frame >= len(frames):
        raise ValueError("contact interval is outside the supplied frame range")
    points = []
    missing = []
    for i in range(start_frame, end_frame + 1):
        p = frames[i].get(landmark)
        if not _valid_point(p):
            missing.append(i)
        else:
            points.append((i, float(p[0]), float(p[1])))
    if missing:
        return {"landmark": landmark, "start_frame": start_frame, "end_frame": end_frame,
                "status": "inconclusive_missing_landmark", "missing_frames": missing}
    if not points:
        return {"landmark": landmark, "start_frame": start_frame, "end_frame": end_frame,
                "status": "inconclusive_no_samples"}
    xs = [p[1] for p in points]; ys = [p[2] for p in points]
    dx, dy = xs[-1]-xs[0], ys[-1]-ys[0]
    drift = math.hypot(dx, dy)
    max_from_start = max(math.hypot(x-xs[0], y-ys[0]) for _, x, y in points)
    return {"landmark": landmark, "start_frame": start_frame, "end_frame": end_frame,
            "sample_count": len(points), "status": "measured", "net_dx": dx, "net_dy": dy,
            "net_drift": drift, "max_drift_from_contact_start": max_from_start,
            "positions": [{"frame": i, "x": x, "y": y} for i, x, y in points]}


def summarize_motion_events(
    events: Sequence[Mapping[str, object]],
    frame_count: int,
) -> Dict[str, object]:
    """Validate event windows and report ordering/overlap without inventing timing."""
    issues = []
    normalized = []
    for idx, event in enumerate(events):
        name = str(event.get("name", f"event_{idx}"))
        start = event.get("start_frame")
        end = event.get("end_frame")
        if not isinstance(start, int) or not isinstance(end, int):
            issues.append({"event": name, "issue": "missing_integer_frame_window"})
            continue
        if start < 0 or end < start or end >= frame_count:
            issues.append({"event": name, "issue": "frame_window_out_of_range",
                           "start_frame": start, "end_frame": end})
            continue
        normalized.append({"name": name, "start_frame": start, "end_frame": end,
                           "kind": event.get("kind", "unspecified")})
    ordered = sorted(normalized, key=lambda e: (e["start_frame"], e["end_frame"]))
    for prev, curr in zip(ordered, ordered[1:]):
        if curr["start_frame"] < prev["start_frame"]:
            issues.append({"event": curr["name"], "issue": "non_monotonic_start"})
        if curr["start_frame"] <= prev["end_frame"]:
            issues.append({"event": curr["name"], "issue": "overlaps_previous_event",
                           "previous": prev["name"]})
    return {"frame_count": frame_count, "event_count": len(normalized),
            "events": ordered, "issues": issues}
