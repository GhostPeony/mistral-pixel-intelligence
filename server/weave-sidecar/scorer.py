"""
Quality scorer — Python port of server/pipeline/scorer.ts

7-dimension scoring aligned with GhostGym quality_calculator.py.
Weights: successRate 25%, verification 20%, cognitiveQuality 15%,
         complexity 15%, toolDiversity 10%, efficiency 10%, length 5%.
"""

import math
from typing import Any

WEIGHTS = {
    "success_rate": 0.25,
    "verification": 0.20,
    "cognitive_quality": 0.15,
    "complexity": 0.15,
    "tool_diversity": 0.10,
    "efficiency": 0.10,
    "length": 0.05,
}


def score_trace(trace: dict[str, Any]) -> dict[str, float]:
    scores = {
        "success_rate": _success_rate(trace),
        "verification": _verification(trace),
        "cognitive_quality": _cognitive_quality(trace),
        "complexity": _complexity(trace),
        "tool_diversity": _tool_diversity(trace),
        "efficiency": _efficiency(trace),
        "length": _length(trace),
    }
    scores["overall"] = sum(scores[k] * WEIGHTS[k] for k in WEIGHTS)
    return scores


def classify_tier(score: float, attempts: int | None = None) -> str:
    if score >= 0.75 and (attempts is None or attempts <= 2):
        return "gold"
    if score >= 0.55:
        return "silver"
    if score >= 0.40:
        return "bronze"
    return "failed"


def _success_rate(trace: dict) -> float:
    if trace.get("type") == "success":
        return 1.0
    original = len((trace.get("rejected") or {}).get("toolCalls") or [])
    final = len((trace.get("chosen") or {}).get("toolCalls") or [])
    if original == 0:
        return 0.0
    return min(1.0, final / max(original, 1))


def _verification(trace: dict) -> float:
    return 1.0 if trace.get("type") == "success" else 0.5


def _cognitive_quality(trace: dict) -> float:
    cognitive = (
        trace.get("cognitive")
        or (trace.get("output") or {}).get("cognitive")
        or (trace.get("chosen") or {}).get("cognitive")
    )

    if not cognitive:
        critiques = trace.get("critiques") or []
        if critiques:
            return min(0.4, len(critiques) * 0.15)
        return 0.1

    thinking = cognitive.get("thinking") or ""
    plan = cognitive.get("plan") or ""
    reflection = cognitive.get("reflection") or ""

    thinking_score = min(1.0, len(thinking) / 200) if len(thinking) > 10 else 0.0
    plan_score = min(1.0, 0.5 + len(plan) / 400) if len(plan) > 10 else 0.0

    reflection_score = min(1.0, 0.5 + len(reflection) / 300) if len(reflection) > 10 else 0.0
    critiques = trace.get("critiques") or []
    if critiques:
        reflection_score = max(reflection_score, min(1.0, len(critiques) * 0.3))

    tool_calls = (
        (trace.get("output") or {}).get("toolCalls")
        or (trace.get("chosen") or {}).get("toolCalls")
        or []
    )
    alignment_score = 0.0
    if tool_calls and (len(thinking) > 10 or len(plan) > 10):
        alignment_score = 0.8
    rationale = cognitive.get("decisionRationale") or ""
    if len(rationale) > 10:
        alignment_score = max(alignment_score, 0.9)

    return (
        thinking_score * 0.30
        + plan_score * 0.25
        + reflection_score * 0.25
        + alignment_score * 0.20
    )


def _complexity(trace: dict) -> float:
    entities = (
        (trace.get("output") or {}).get("entities")
        or (trace.get("chosen") or {}).get("entities")
        or []
    )
    types = set()
    has_behaviors = False
    for e in entities:
        comps = e.get("components") or {}
        sprite = comps.get("sprite") or {}
        if sprite.get("assetId"):
            types.add(sprite["assetId"])
        if comps.get("behavior"):
            has_behaviors = True
    return min(1.0, len(types) / 10 + (0.3 if has_behaviors else 0.0))


def _tool_diversity(trace: dict) -> float:
    tool_calls = (
        (trace.get("output") or {}).get("toolCalls")
        or (trace.get("chosen") or {}).get("toolCalls")
        or []
    )
    unique = set(tc.get("name") for tc in tool_calls)
    return min(1.0, len(unique) / 5)


def _efficiency(trace: dict) -> float:
    if trace.get("type") == "success":
        return 1.0
    attempts = trace.get("attempts") or 1
    return max(0.0, 1.0 - (attempts - 1) * 0.2)


def _length(trace: dict) -> float:
    entities = (
        (trace.get("output") or {}).get("entities")
        or (trace.get("chosen") or {}).get("entities")
        or []
    )
    count = len(entities)
    ideal = 10
    spread = 8
    return math.exp(-((count - ideal) ** 2) / (2 * spread * spread))
