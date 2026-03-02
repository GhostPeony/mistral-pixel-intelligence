"""NVIDIA Data Designer amplification via NIM API.

Takes seed JSONL (SFT or DPO traces) and generates synthetic variations
using NVIDIA's Nemotron model through the OpenAI-compatible NIM endpoint.

Usage:
  python amplify.py <seed_dir> <output_dir> [amplification_factor]
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NIM_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions"
NIM_MODEL = "nvidia/llama-3.3-nemotron-super-49b-v1.5"


def nim_generate(prompt: str, system: str = "", temperature: float = 0.8, max_tokens: int = 2048) -> str:
    """Call NVIDIA NIM endpoint (OpenAI-compatible)."""
    import urllib.request
    import re

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload = json.dumps({
        "model": NIM_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }).encode()

    req = urllib.request.Request(
        NIM_ENDPOINT,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {NVIDIA_API_KEY}",
        },
    )

    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode())

    content = data["choices"][0]["message"]["content"]

    # Strip <think>...</think> tags from Nemotron reasoning models
    content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()

    # Extract JSON from markdown code blocks if present
    json_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", content, flags=re.DOTALL)
    if json_match:
        content = json_match.group(1).strip()

    return content


# ---------------------------------------------------------------------------
# Amplification strategies
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
You are a synthetic data generator for a pixel-art platformer game level editor.
The game uses tool calls to create entities (tiles, enemies, items, NPCs, structures).
You generate training examples that teach an AI to respond to natural language level design prompts.

Respond ONLY with valid JSON — no markdown, no explanation."""

# System message included in all training examples
TRAIN_SYSTEM_MSG = {
    "role": "system",
    "content": (
        "You are an AI level designer in Mistral Maker, a pixel-art platformer builder. "
        "The player describes what they want in natural language, and you use the available tools "
        "to create, modify, and arrange game entities on screen.\n\n"
        "## Scale Reference\n"
        "- Tiles are 32x32. Trees are 48x64. Structures are 64-128px.\n"
        "- Items and decorations are 16x16. Ground line at y=400. Positive Y is down.\n\n"
        "## Design Guidelines\n"
        "- Place entities on solid ground or platforms. Space tiles 32px apart.\n"
        "- Give every entity a descriptive name. Use multiple tool calls for complex scenes.\n"
        "- When critiqued, adjust rather than rebuild from scratch."
    ),
}


def entities_to_tool_calls(entities: list[dict]) -> list[dict]:
    """Convert entity list to OpenAI-style tool_calls for training."""
    calls = []
    for i, ent in enumerate(entities):
        calls.append({
            "id": f"call_{i}",
            "type": "function",
            "function": {
                "name": "create_entity",
                "arguments": json.dumps(ent),
            },
        })
    return calls


def make_sft_example(prompt: str, entities: list[dict], description: str = "", source: str = "amplified") -> dict:
    """Build a single SFT training example in chat messages format."""
    return {
        "messages": [
            TRAIN_SYSTEM_MSG,
            {"role": "user", "content": prompt},
            {
                "role": "assistant",
                "content": description or "Here is what I created.",
                "tool_calls": entities_to_tool_calls(entities),
            },
        ],
        "source": source,
    }


def make_dpo_example(
    prompt: str,
    chosen_entities: list[dict],
    rejected_entities: list[dict],
    feedback: str = "",
    source: str = "amplified_dpo",
) -> dict:
    """Build a single DPO training example in chat messages format."""
    user_msg = {"role": "user", "content": prompt}
    return {
        "prompt": prompt,
        "chosen": [
            TRAIN_SYSTEM_MSG,
            user_msg,
            {
                "role": "assistant",
                "content": feedback or "Here is the corrected scene.",
                "tool_calls": entities_to_tool_calls(chosen_entities),
            },
        ],
        "rejected": [
            TRAIN_SYSTEM_MSG,
            user_msg,
            {
                "role": "assistant",
                "content": "",
                "tool_calls": entities_to_tool_calls(rejected_entities),
            },
        ],
        "feedback": feedback,
        "source": source,
    }


def amplify_sft_seed(seed: dict) -> list[dict]:
    """Generate SFT variations from a single seed trace."""
    prompt_text = seed.get("prompt", "")
    # Handle both raw trace format and messages format
    messages = seed.get("messages", [])
    if messages:
        # Extract from messages format
        user_msg = next((m for m in messages if m.get("role") == "user"), {})
        asst_msg = next((m for m in messages if m.get("role") == "assistant"), {})
        prompt_text = prompt_text or user_msg.get("content", "")
        tool_calls = asst_msg.get("tool_calls", [])
        entity_desc = json.dumps(tool_calls[:5], indent=2)
    else:
        # Raw trace format
        entities = seed.get("output", {}).get("entities", [])
        completion = seed.get("completion", "")
        entity_desc = json.dumps(entities[:5], indent=2) if entities else completion[:500]

    variations = []

    # Strategy 1: Rephrase the prompt, keep similar output
    try:
        rephrased = nim_generate(
            f"""Given this game level design prompt and its output:

PROMPT: {prompt_text}
OUTPUT: {entity_desc}

Generate 3 different ways a player might ask for the same or very similar result.
Return as a JSON array of strings. Example: ["prompt 1", "prompt 2", "prompt 3"]""",
            system=SYSTEM_PROMPT,
            temperature=0.9,
        )
        prompts = json.loads(rephrased)
        if isinstance(prompts, list):
            for p in prompts[:3]:
                # Clone the seed but swap the prompt
                clone = json.loads(json.dumps(seed))
                if "messages" in clone:
                    for m in clone["messages"]:
                        if m.get("role") == "user":
                            m["content"] = str(p)
                else:
                    clone["prompt"] = str(p)
                clone["source"] = "amplified_rephrase"
                variations.append(clone)
    except Exception as e:
        print(f"  Rephrase failed: {e}", file=sys.stderr)

    # Strategy 2: Generate a scene variation (different positions/counts)
    try:
        varied = nim_generate(
            f"""Given this game level design interaction:

PROMPT: {prompt_text}
ENTITIES: {entity_desc}

Create a variation of this scene with:
- Different entity positions (x, y shifted by 50-200px)
- Possibly different entity count (add or remove 1-2)
- Same general concept and entity types

Return a JSON object with:
{{"prompt": "the original or slightly modified prompt", "entities": [array of entity objects with type, name, x, y, width, height fields]}}""",
            system=SYSTEM_PROMPT,
            temperature=0.85,
        )
        var_data = json.loads(varied)
        if isinstance(var_data, dict) and "entities" in var_data:
            variations.append(make_sft_example(
                prompt=var_data.get("prompt", prompt_text),
                entities=var_data["entities"],
                source="amplified_variation",
            ))
    except Exception as e:
        print(f"  Variation failed: {e}", file=sys.stderr)

    return variations


def amplify_dpo_seed(seed: dict) -> list[dict]:
    """Generate DPO pair variations from a correction trace."""
    prompt_text = seed.get("prompt", "")

    # Handle both raw trace format and messages format
    chosen_msgs = seed.get("chosen", [])
    rejected_msgs = seed.get("rejected", [])

    if isinstance(chosen_msgs, list) and chosen_msgs and isinstance(chosen_msgs[0], dict) and "role" in chosen_msgs[0]:
        # Already in messages format — extract tool calls for description
        chosen_asst = next((m for m in chosen_msgs if m.get("role") == "assistant"), {})
        rejected_asst = next((m for m in rejected_msgs if m.get("role") == "assistant"), {})
        chosen_desc = json.dumps(chosen_asst.get("tool_calls", [])[:5], indent=2)
        rejected_desc = json.dumps(rejected_asst.get("tool_calls", [])[:5], indent=2)
    else:
        # Raw trace format
        rejected = seed.get("rejected", {})
        chosen = seed.get("chosen", {})
        rejected_desc = json.dumps(rejected.get("entities", [])[:5], indent=2)
        chosen_desc = json.dumps(chosen.get("entities", [])[:5], indent=2)

    critiques = seed.get("critiques", [])
    feedback = seed.get("feedback", "")
    critique_text = "; ".join(critiques) if critiques else feedback

    variations = []

    # Strategy: Generate new rejected/chosen pairs for similar prompts
    try:
        result = nim_generate(
            f"""Given this game level design correction:

PROMPT: {prompt_text}
REJECTED (bad) OUTPUT: {rejected_desc}
PLAYER CRITIQUE: {critique_text}
CHOSEN (good) OUTPUT: {chosen_desc}

Generate a new DPO training pair for a similar scenario. Create:
1. A similar prompt (same concept, different details)
2. A plausible bad output (common mistakes an AI would make)
3. The corrected good output

Return JSON:
{{
  "prompt": "new prompt text",
  "rejected": {{"entities": [...]}},
  "chosen": {{"entities": [...]}},
  "feedback": "what was wrong with rejected"
}}""",
            system=SYSTEM_PROMPT,
            temperature=0.85,
        )
        pair = json.loads(result)
        if isinstance(pair, dict) and "rejected" in pair and "chosen" in pair:
            variations.append(make_dpo_example(
                prompt=pair.get("prompt", prompt_text),
                chosen_entities=pair["chosen"].get("entities", []),
                rejected_entities=pair["rejected"].get("entities", []),
                feedback=pair.get("feedback", ""),
            ))
    except Exception as e:
        print(f"  DPO variation failed: {e}", file=sys.stderr)

    # Strategy 2: Rephrase prompt, keep the same rejected/chosen
    try:
        rephrased = nim_generate(
            f"""Rephrase this game level design prompt 2 different ways, keeping the same intent:

PROMPT: {prompt_text}

Return as a JSON array of strings.""",
            system=SYSTEM_PROMPT,
            temperature=0.9,
        )
        prompts = json.loads(rephrased)
        if isinstance(prompts, list):
            for p in prompts[:2]:
                clone = json.loads(json.dumps(seed))
                clone["prompt"] = str(p)
                # Update user message in chosen/rejected if in messages format
                for conv_key in ("chosen", "rejected"):
                    conv = clone.get(conv_key, [])
                    if isinstance(conv, list):
                        for m in conv:
                            if isinstance(m, dict) and m.get("role") == "user":
                                m["content"] = str(p)
                clone["source"] = "amplified_rephrase"
                variations.append(clone)
    except Exception as e:
        print(f"  DPO rephrase failed: {e}", file=sys.stderr)

    return variations


def generate_novel_scenes(count: int = 10) -> list[dict]:
    """Generate entirely new SFT training examples from scratch."""
    scenes = []

    try:
        result = nim_generate(
            f"""Generate {count} diverse game level design prompts for a pixel-art platformer.
Cover a mix of:
- Simple tasks (place a single entity)
- Medium tasks (build a small scene with 3-5 entities)
- Complex tasks (design a full area with enemies, platforms, items, NPCs)

For each, provide the prompt AND the expected output entities.

Return a JSON array where each element has:
{{
  "prompt": "what the player would say",
  "entities": [
    {{"type": "tile|enemy|npc|item|structure", "name": "descriptive_name", "assetId": "sprite_id", "x": number, "y": number, "width": 32, "height": 32}}
  ]
}}

Available sprite IDs: tile_grass, tile_stone, tile_brick, tile_sand, tile_ice, tile_wood,
enemy_skeleton, enemy_spider, enemy_orc, hero_knight, item_sword, item_potion_red,
item_potion_blue, item_key, item_coin, tree_oak, tree_pine, bush_green, flower_red,
torch_wall, chest_wood, npc_villager, sign_wood, barrel_brown, crate_wood, flag_red.

Ground line is at y=400. Positive Y is down (screen coords). Tiles are 32x32.""",
            system=SYSTEM_PROMPT,
            temperature=0.9,
            max_tokens=4096,
        )
        items = json.loads(result)
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict) and "prompt" in item and "entities" in item:
                    scenes.append(make_sft_example(
                        prompt=item["prompt"],
                        entities=item["entities"],
                        source="synthetic_novel",
                    ))
    except Exception as e:
        print(f"  Novel scene generation failed: {e}", file=sys.stderr)

    return scenes


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def amplify(seed_dir: str, output_dir: str, factor: int = 5) -> dict:
    """Full amplification pipeline: load seeds, amplify, generate novel, save."""

    if not NVIDIA_API_KEY:
        return {"error": "NVIDIA_API_KEY not set"}

    os.makedirs(output_dir, exist_ok=True)

    # Load all seed files
    seeds: list[dict] = []
    seed_path = Path(seed_dir)
    for f in seed_path.glob("*.jsonl"):
        with open(f) as fh:
            for line in fh:
                line = line.strip()
                if line:
                    seeds.append(json.loads(line))

    if not seeds:
        return {"error": f"No seeds found in {seed_dir}"}

    print(f"Loaded {len(seeds)} seeds from {seed_dir}")
    amplified: list[dict] = []

    # Keep all originals
    amplified.extend(seeds)

    # Amplify each seed
    for i, seed in enumerate(seeds):
        print(f"  Amplifying seed {i+1}/{len(seeds)} (type={seed.get('type', '?')})...")

        if seed.get("type") == "correction":
            variations = amplify_dpo_seed(seed)
        else:
            variations = amplify_sft_seed(seed)

        amplified.extend(variations)
        print(f"    +{len(variations)} variations")

        # Rate limit: NIM free tier is ~5 req/min
        time.sleep(1)

    # Generate novel scenes to fill up to target count
    target = len(seeds) * factor
    if len(amplified) < target:
        novel_count = min(target - len(amplified), 20)
        print(f"  Generating {novel_count} novel scenes...")
        novel = generate_novel_scenes(novel_count)
        amplified.extend(novel)
        print(f"    +{len(novel)} novel scenes")

    # Split into SFT (has "messages") and DPO (has "chosen"/"rejected") files
    sft_items = [a for a in amplified if "messages" in a]
    dpo_items = [a for a in amplified if "chosen" in a and "rejected" in a]

    # Write combined output
    out_file = Path(output_dir) / "amplified.jsonl"
    with open(out_file, "w") as fh:
        for item in amplified:
            fh.write(json.dumps(item) + "\n")

    # Write split files that the trainer expects
    if sft_items:
        sft_file = Path(output_dir) / "sft_seeds.jsonl"
        with open(sft_file, "w") as fh:
            for item in sft_items:
                fh.write(json.dumps(item) + "\n")

    if dpo_items:
        dpo_file = Path(output_dir) / "dpo_seeds.jsonl"
        with open(dpo_file, "w") as fh:
            for item in dpo_items:
                fh.write(json.dumps(item) + "\n")

    result = {
        "status": "completed",
        "inputSeeds": len(seeds),
        "outputExamples": len(amplified),
        "amplificationRatio": round(len(amplified) / max(len(seeds), 1), 1),
        "outputFile": str(out_file),
        "breakdown": {
            "originals": len(seeds),
            "rephrased": len([a for a in amplified if a.get("source") == "amplified_rephrase"]),
            "variations": len([a for a in amplified if a.get("source") == "amplified_variation"]),
            "dpo_pairs": len([a for a in amplified if a.get("source") == "amplified_dpo"]),
            "novel": len([a for a in amplified if a.get("source") == "synthetic_novel"]),
        },
    }

    print(f"\nAmplification complete: {len(seeds)} -> {len(amplified)} examples ({result['amplificationRatio']}x)")
    print(json.dumps(result["breakdown"], indent=2))

    return result


def main():
    if len(sys.argv) < 3:
        print("Usage: python amplify.py <seed_dir> <output_dir> [factor]")
        sys.exit(1)

    seed_dir = sys.argv[1]
    output_dir = sys.argv[2]
    factor = int(sys.argv[3]) if len(sys.argv) > 3 else 5

    result = amplify(seed_dir, output_dir, factor)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
