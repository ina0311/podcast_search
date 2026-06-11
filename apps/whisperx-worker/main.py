from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional

from whisperx_transcribe import run_transcription

app = FastAPI(title="whisperx-worker")


class TranscribeRequest(BaseModel):
    audio_path: str
    personalities: list[dict] = []
    num_speakers: Optional[int] = None
    model: str = "turbo"
    hf_token: str = ""


class TranscribeResponse(BaseModel):
    segments: list[dict]


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(req: TranscribeRequest):
    try:
        segments = run_transcription(
            audio_path=req.audio_path,
            personalities=req.personalities,
            num_speakers=req.num_speakers,
            model=req.model,
            hf_token=req.hf_token,
        )
        return {"segments": segments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
