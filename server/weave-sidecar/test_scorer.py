"""Tests for the quality scorer — mirrors server/pipeline/__tests__/scorer.test.ts"""

from scorer import score_trace, classify_tier


def test_success_trace_scores_high():
    trace = {
        "type": "success",
        "prompt": "Create a platformer level with enemies",
        "output": {
            "entities": [
                {"components": {"sprite": {"assetId": "hero"}, "behavior": {"type": "patrol"}}},
                {"components": {"sprite": {"assetId": "slime"}}},
                {"components": {"sprite": {"assetId": "platform"}}},
            ],
            "toolCalls": [
                {"name": "spawn_entity"},
                {"name": "set_position"},
                {"name": "add_behavior"},
            ],
        },
    }
    score = score_trace(trace)
    assert score["overall"] > 0.5
    assert score["success_rate"] == 1.0
    assert score["verification"] == 1.0
    assert score["efficiency"] == 1.0


def test_correction_trace_scores_lower():
    trace = {
        "type": "correction",
        "prompt": "Add trees",
        "rejected": {
            "entities": [{"components": {"sprite": {"assetId": "tree"}}}],
            "toolCalls": [{"name": "spawn_entity"}],
        },
        "chosen": {
            "entities": [
                {"components": {"sprite": {"assetId": "tree"}}},
                {"components": {"sprite": {"assetId": "bush"}}},
            ],
            "toolCalls": [{"name": "spawn_entity"}, {"name": "set_position"}],
        },
        "attempts": 3,
        "critiques": ["trees are too small", "add bushes too"],
    }
    score = score_trace(trace)
    assert score["overall"] > 0.0
    assert score["verification"] == 0.5
    assert score["efficiency"] < 1.0


def test_cognitive_data_boosts_score():
    base = {
        "type": "success",
        "prompt": "Build a castle",
        "output": {
            "entities": [{"components": {"sprite": {"assetId": "wall"}}}],
            "toolCalls": [{"name": "spawn_entity"}],
        },
    }
    score_without = score_trace(base)

    with_cog = {
        **base,
        "cognitive": {
            "thinking": "I need to create castle walls in a square formation with towers at corners",
            "plan": "1. Place four walls 2. Add corner towers 3. Add gate",
            "reflection": "The layout looks balanced and defensible",
            "decisionRationale": "Square formation is most recognizable castle shape",
        },
    }
    score_with = score_trace(with_cog)
    assert score_with["cognitive_quality"] > score_without["cognitive_quality"]


def test_tier_classification():
    assert classify_tier(0.80, 1) == "gold"
    assert classify_tier(0.80, 3) == "silver"  # too many attempts
    assert classify_tier(0.60) == "silver"
    assert classify_tier(0.45) == "bronze"
    assert classify_tier(0.30) == "failed"
