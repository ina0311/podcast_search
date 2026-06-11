"""
WhisperX transcription with speaker diarization and identification.
Provides run_transcription() for use as a library (called by main.py).
"""

import sys
from typing import Optional

import numpy as np
import whisperx


def cosine_similarity(a: list[float], b: list[float]) -> float:
    a_arr = np.array(a, dtype=np.float32)
    b_arr = np.array(b, dtype=np.float32)
    denom = np.linalg.norm(a_arr) * np.linalg.norm(b_arr)
    if denom == 0:
        return 0.0
    return float(np.dot(a_arr, b_arr) / denom)


def resolve_speaker_names(
    audio_path: str,
    diarize_segments,
    personalities: list[dict],
    hf_token: str,
    threshold: float = 0.85,
) -> dict[str, str]:
    personalities_with_emb = [p for p in personalities if p.get("embedding")]
    if not personalities_with_emb:
        return {}

    speaker_segments: dict[str, list] = {}
    for seg in diarize_segments.itertracks(yield_label=True):
        turn, _, label = seg
        if label not in speaker_segments:
            speaker_segments[label] = []
        speaker_segments[label].append((turn.start, turn.end))

    from pyannote.audio import Inference, Model
    from pyannote.audio.core.io import Audio

    model = Model.from_pretrained("pyannote/embedding", use_auth_token=hf_token)
    inference = Inference(model, window="whole")
    audio_obj = Audio(sample_rate=16000, mono=True)

    mapping: dict[str, str] = {}
    for speaker_label, segments in speaker_segments.items():
        segments.sort(key=lambda x: x[1] - x[0], reverse=True)
        start, end = segments[0]

        waveform, sr = audio_obj.crop(audio_path, {"start": start, "end": end})
        speaker_embedding = inference({"waveform": waveform, "sample_rate": sr}).tolist()

        best_name = None
        best_score = threshold
        for p in personalities_with_emb:
            score = cosine_similarity(speaker_embedding, p["embedding"])
            if score > best_score:
                best_score = score
                best_name = p["name"]

        if best_name:
            mapping[speaker_label] = best_name

    return mapping


def run_transcription(
    audio_path: str,
    personalities: list[dict],
    num_speakers: Optional[int],
    model: str = "turbo",
    hf_token: str = "",
) -> list[dict]:
    device = "cpu"
    compute_type = "int8"

    audio = whisperx.load_audio(audio_path)

    whisper_model = whisperx.load_model(model, device, compute_type=compute_type)
    result = whisper_model.transcribe(audio, batch_size=16)

    model_a, metadata = whisperx.load_align_model(
        language_code=result["language"], device=device
    )
    result = whisperx.align(
        result["segments"], model_a, metadata, audio, device, return_char_alignments=False
    )

    diarize_model = whisperx.DiarizationPipeline(
        use_auth_token=hf_token, device=device
    )
    diarize_segments = diarize_model(
        audio_path,
        min_speakers=1,
        max_speakers=num_speakers if num_speakers else 10,
    )
    result = whisperx.assign_word_speakers(diarize_segments, result)

    speaker_map: dict[str, str] = {}
    if hf_token and personalities:
        try:
            speaker_map = resolve_speaker_names(
                audio_path, diarize_segments, personalities, hf_token
            )
        except Exception as e:
            print(f"[whisperx] Speaker identification failed (non-fatal): {e}", file=sys.stderr)

    segments_out = []
    for seg in result["segments"]:
        raw_label = seg.get("speaker", "SPEAKER_UNKNOWN")
        speaker_label = speaker_map.get(raw_label, raw_label)
        segments_out.append(
            {
                "text": seg["text"].strip(),
                "startMs": round(seg["start"] * 1000),
                "endMs": round(seg["end"] * 1000),
                "speakerLabel": speaker_label,
            }
        )

    return segments_out
