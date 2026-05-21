#!/usr/bin/env python3
"""
WhisperX transcription with speaker diarization and identification.

Usage:
    python whisperx_transcribe.py \
        --audio /tmp/ep.mp3 \
        --output /tmp/result.json \
        --hf_token hf_xxx \
        [--personalities '[{"name":"山田","embedding":[0.1,0.2,...]}]'] \
        [--num_speakers 2]
"""

import argparse
import json
import sys
from pathlib import Path

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
    """
    diarize_segments: pyannote の diarization 出力
    personalities: [{"name": str, "embedding": list[float]}, ...]
    Returns: {"SPEAKER_00": "山田太郎", "SPEAKER_01": "ゲスト佐藤"} など
    """
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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--hf_token", default="")
    parser.add_argument("--personalities", default="[]")
    parser.add_argument("--num_speakers", type=int, default=None)
    parser.add_argument("--model", default="turbo")
    args = parser.parse_args()

    personalities: list[dict] = json.loads(args.personalities)

    audio = whisperx.load_audio(args.audio)

    device = "cpu"
    compute_type = "int8"
    model = whisperx.load_model(args.model, device, compute_type=compute_type)
    result = model.transcribe(audio, batch_size=16)

    model_a, metadata = whisperx.load_align_model(
        language_code=result["language"], device=device
    )
    result = whisperx.align(
        result["segments"], model_a, metadata, audio, device, return_char_alignments=False
    )

    diarize_model = whisperx.DiarizationPipeline(
        use_auth_token=args.hf_token, device=device
    )
    diarize_segments = diarize_model(
        args.audio,
        min_speakers=1,
        max_speakers=args.num_speakers if args.num_speakers else 10,
    )
    result = whisperx.assign_word_speakers(diarize_segments, result)

    speaker_map: dict[str, str] = {}
    if args.hf_token and personalities:
        try:
            speaker_map = resolve_speaker_names(
                args.audio, diarize_segments, personalities, args.hf_token
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

    Path(args.output).write_text(json.dumps(segments_out, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
