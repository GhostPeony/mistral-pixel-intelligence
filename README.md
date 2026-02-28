# Mistral Maker

A self-improving pixel platformer where AI learns taste from player feedback.

## How It Works

1. **Ask** — Tell Mistral what to build via text or voice
2. **Critique** — Reshape the AI's output until it looks right
3. **Train** — Your corrections fine-tune the Mistral model via DPO

Built for the Mistral Worldwide Hackathon.

## Tech Stack

- **Game Engine:** Custom ECS + Canvas 2D (TypeScript)
- **AI:** Mistral AI (tool-calling level generation)
- **Voice:** ElevenLabs (STT + TTS)
- **Training:** Unsloth + QLoRA via HuggingFace Jobs
- **Data:** NVIDIA NeMo Data Designer (synthetic amplification)
- **Metrics:** Weights & Biases (training dashboards)

## Setup

```bash
npm install
cp .env.example .env
# Add your API keys to .env

# Terminal 1: server
npm run dev:server

# Terminal 2: game
npm run dev:game
```

## Architecture

```
mistral/
├── game/                     # Vite + TypeScript
│   └── src/
│       ├── ecs/              # Entity Component System
│       ├── engine/           # Game loop, Canvas 2D renderer
│       ├── systems/          # Physics, behavior, combat, health, patrol, doors
│       ├── ui/               # Editor panels, chat, asset browser
│       ├── ai/               # Mistral client, tool executor, voice
│       ├── telemetry/        # Trace capture (DPO data)
│       ├── assets/           # Pixel art sprite registry
│       └── config/           # Theme tokens
│
├── server/                   # Express + training pipeline
│   ├── routes/               # AI proxy, traces, pipeline, voice
│   └── pipeline/             # Scorer, dataset builder, data designer, trainer
│
└── .mistral-maker/           # Local data (gitignored)
    ├── traces.jsonl           # Raw player traces
    └── datasets/              # Training-ready seeds
```

## The Training Loop

```
Player prompt → Mistral generates (tool calls) → Snapshot A
    ↓
Player critiques / edits / has AI redo → Snapshot B
    ↓
Correction trace: { rejected: A, chosen: B }
    ↓
Quality scorer (6 metrics) → Tier classification
    ↓
Dataset builder → DPO seeds + SFT seeds
    ↓
NVIDIA Data Designer → 3x amplification
    ↓
HuggingFace Unsloth Jobs → Fine-tuned LoRA adapter
    ↓
Next generation is better
```

## Credits

- [Mistral AI](https://mistral.ai) — LLM inference + fine-tuning target
- [ElevenLabs](https://elevenlabs.io) — Voice synthesis
- [NVIDIA NeMo Data Designer](https://developer.nvidia.com/nemo) — Synthetic data amplification
- [Weights & Biases](https://wandb.ai) — Training metrics
- [HuggingFace](https://huggingface.co) — Model hosting + cloud training
- [Unsloth](https://unsloth.ai) — Fast fine-tuning

## License

MIT
