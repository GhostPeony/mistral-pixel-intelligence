"""Weave sidecar — logs Mistral Maker traces to W&B Weave."""

import json
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# Load .env from project root (two levels up: weave-sidecar -> server -> mistral)
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

import wandb
import weave
from fastapi import FastAPI
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field

from scorer import score_trace, classify_tier

WANDB_PROJECT = os.getenv("WANDB_PROJECT", "mistral-maker")
WEAVE_PROJECT = os.getenv("WEAVE_PROJECT", f"cadecr-ghost-peony/{WANDB_PROJECT}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    api_key = os.getenv("WANDB_API_KEY")
    if api_key:
        wandb.login(key=api_key)
    weave.init(WEAVE_PROJECT)
    yield


app = FastAPI(title="Mistral Maker Weave Sidecar", lifespan=lifespan)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


@app.get("/health")
async def health():
    return {"status": "ok", "weave_project": WEAVE_PROJECT}


# ---------------------------------------------------------------------------
# Trace logging (Task 3)
# ---------------------------------------------------------------------------


class TraceContext(BaseModel):
    model: str = ""
    sessionId: str = ""
    timestamp: str = ""
    canvasSize: dict = Field(default_factory=dict)


class TracePayload(BaseModel):
    id: str = ""
    type: str  # "success" or "correction"
    prompt: str
    output: Optional[dict] = None
    rejected: Optional[dict] = None
    chosen: Optional[dict] = None
    feedback: Optional[str] = None
    critiques: Optional[list[str]] = None
    attempts: Optional[int] = None
    score: Optional[float] = None
    cognitive: Optional[dict] = None
    context: TraceContext = Field(default_factory=TraceContext)


@weave.op(name="game_interaction")
def log_game_interaction(
    prompt: str,
    trace_type: str,
    context: dict,
    output: dict | None = None,
    rejected: dict | None = None,
    chosen: dict | None = None,
    cognitive: dict | None = None,
    critiques: list[str] | None = None,
    feedback: str | None = None,
    attempts: int | None = None,
) -> dict:
    """Log a single player-AI game interaction as a Weave trace."""
    trace_dict = {
        "type": trace_type,
        "prompt": prompt,
        "output": output,
        "rejected": rejected,
        "chosen": chosen,
        "cognitive": cognitive,
        "critiques": critiques,
        "feedback": feedback,
        "attempts": attempts,
    }

    scores = score_trace(trace_dict)
    tier = classify_tier(scores["overall"], attempts)

    return {
        "type": trace_type,
        "scores": scores,
        "tier": tier,
        "entity_count": len(
            (output or chosen or {}).get("entities", [])
        ),
        "tool_count": len(
            (output or chosen or {}).get("toolCalls", [])
        ),
        "has_cognitive": cognitive is not None,
        "critique_count": len(critiques or []),
    }


@app.post("/trace")
async def receive_trace(payload: TracePayload):
    result = log_game_interaction(
        prompt=payload.prompt,
        trace_type=payload.type,
        context=payload.context.model_dump(),
        output=payload.output,
        rejected=payload.rejected,
        chosen=payload.chosen,
        cognitive=payload.cognitive,
        critiques=payload.critiques,
        feedback=payload.feedback,
        attempts=payload.attempts,
    )
    return {"status": "logged", "tier": result["tier"], "scores": result["scores"]}


# ---------------------------------------------------------------------------
# Evaluation (Task 4)
# ---------------------------------------------------------------------------

# Resolve relative to this file, not cwd (which varies by how sidecar is started)
TRACES_FILE = Path(__file__).resolve().parent.parent / ".mistral-maker" / "traces.jsonl"


class QualityScorer(weave.Scorer):
    @weave.op
    def score(self, output: dict) -> dict:
        trace_data = output.get("trace", output)
        scores = score_trace(trace_data)
        tier = classify_tier(scores["overall"], trace_data.get("attempts"))
        return {**scores, "tier": tier}


@weave.op(name="format_trace")
def format_trace_for_eval(trace: dict) -> dict:
    """Identity model — passes trace through for scoring."""
    return {"trace": trace}


@app.post("/eval")
async def run_evaluation():
    """Run quality evaluation over all stored traces."""
    if not TRACES_FILE.exists():
        return {"status": "error", "message": "No traces file found"}

    lines = TRACES_FILE.read_text().strip().split("\n")
    traces = [json.loads(line) for line in lines if line.strip()]

    if not traces:
        return {"status": "error", "message": "No traces to evaluate"}

    dataset = weave.Dataset(
        name="game_traces",
        rows=[{"trace": t, "id": t.get("id", f"trace_{i}")} for i, t in enumerate(traces)],
    )

    evaluation = weave.Evaluation(
        name="quality_evaluation",
        dataset=dataset,
        scorers=[QualityScorer()],
    )

    results = await evaluation.evaluate(format_trace_for_eval)

    return {
        "status": "completed",
        "trace_count": len(traces),
        "results": results,
    }
