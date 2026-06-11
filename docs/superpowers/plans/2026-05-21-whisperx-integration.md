# WhisperX Speaker Identification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **前提:** `2026-05-21-personality-management.md` の Task 1（DB スキーマ）と Task 2（リポジトリ）が完了していること。

**Goal:** Whisper CLI を WhisperX に置き換え、話者分離（diarization）と声紋マッチングを使って「SPEAKER_00」を登録済みパーソナリティ名に自動解決する。

**Architecture:** Python スクリプト `whisperx_transcribe.py` が WhisperX + pyannote で文字起こしと話者分離を実行し、DB から取得した声紋 embedding と照合して話者名を解決する。Node.js の `whisperx-runner.ts` がこの Python スクリプトを `child_process.spawn` で呼び出す。ingest パイプラインは `PersonalityRepository.findPersonalitiesForTranscription()` を使い、パーソナリティ情報を Python スクリプトに JSON で渡す。

**Tech Stack:** WhisperX（Python）、pyannote.audio（Python）、Node.js（child_process.spawn）、Hugging Face token（pyannote gated model）

---

## 前提条件

Python 環境に以下がインストールされていること：

```bash
pip install whisperx
pip install pyannote.audio
```

Hugging Face トークンが必要（pyannote は gated model）：
- https://huggingface.co/pyannote/speaker-diarization-3.1 でアクセス承認
- `.env.local` に `HUGGINGFACE_TOKEN=hf_xxx` を追加

---

## ファイル構成

| ファイル | 作成/変更 |
|---------|---------|
| `apps/api/src/services/transcription/whisperx_transcribe.py` | 新規 |
| `apps/api/src/services/transcription/whisperx-runner.ts` | 新規 |
| `apps/api/src/services/transcription/whisper-runner.ts` | 削除 |
| `apps/api/src/domains/import/import-podcast.usecase.ts` | 修正 |
| `packages/config/src/env/common.ts` | 修正（HF token追加） |

---

## Task 1: 環境変数追加

**Files:**
- Modify: `packages/config/src/env/common.ts`

- [ ] **Step 1: HUGGINGFACE_TOKEN を追加**

`packages/config/src/env/common.ts` の末尾フィールドに追加：

```typescript
HUGGINGFACE_TOKEN: z.string().optional(),
```

- [ ] **Step 2: .env.local に追記**

```
HUGGINGFACE_TOKEN=hf_xxxxxxxxxxxxxxxx
```

- [ ] **Step 3: コミット**

```bash
git add packages/config/src/env/common.ts
git commit -m "config: HUGGINGFACE_TOKEN 環境変数を追加"
```

---

## Task 2: Python スクリプト（WhisperX + 話者識別）

**Files:**
- Create: `apps/api/src/services/transcription/whisperx_transcribe.py`

- [ ] **Step 1: whisperx_transcribe.py を作成**

```python
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
import tempfile
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
    diarize_segments,
    personalities: list[dict],
    threshold: float = 0.85,
) -> dict[str, str]:
    """
    diarize_segments: pyannote の diarization 出力
    personalities: [{"name": str, "embedding": list[float]}, ...]
    Returns: {"SPEAKER_00": "山田太郎", "SPEAKER_01": "ゲスト佐藤"} など
    """
    if not personalities:
        return {}

    # 各スピーカーのセグメントを収集
    speaker_segments: dict[str, list] = {}
    for seg in diarize_segments.itertracks(yield_label=True):
        turn, _, label = seg
        if label not in speaker_segments:
            speaker_segments[label] = []
        speaker_segments[label].append((turn.start, turn.end))

    # pyannote の embedding モデルで各スピーカーの声紋を抽出
    from pyannote.audio import Inference, Model

    model = Model.from_pretrained("pyannote/embedding", use_auth_token=HF_TOKEN)
    inference = Inference(model, window="whole")

    # personalities でサンプル embedding がないものを除外
    personalities_with_emb = [
        p for p in personalities if p.get("embedding")
    ]
    if not personalities_with_emb:
        return {}

    mapping: dict[str, str] = {}
    for speaker_label, segments in speaker_segments.items():
        # 最長セグメントを代表として使う
        segments.sort(key=lambda x: x[1] - x[0], reverse=True)
        start, end = segments[0]

        # 音声スライスで embedding を計算
        from pyannote.audio.core.io import Audio
        audio_obj = Audio(sample_rate=16000, mono=True)
        waveform, sr = audio_obj.crop(AUDIO_PATH, {"start": start, "end": end})
        speaker_embedding = inference({"waveform": waveform, "sample_rate": sr}).tolist()

        # 各パーソナリティの事前登録 embedding と照合
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


# グローバル変数（argparse 後に設定）
HF_TOKEN: str = ""
AUDIO_PATH: str = ""


def main():
    global HF_TOKEN, AUDIO_PATH

    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--hf_token", default="")
    parser.add_argument("--personalities", default="[]")
    parser.add_argument("--num_speakers", type=int, default=None)
    parser.add_argument("--model", default="turbo")
    args = parser.parse_args()

    HF_TOKEN = args.hf_token
    AUDIO_PATH = args.audio

    personalities: list[dict] = json.loads(args.personalities)

    # Step 1: 音声ロード
    audio = whisperx.load_audio(args.audio)

    # Step 2: WhisperX 文字起こし
    device = "cpu"
    compute_type = "int8"
    model = whisperx.load_model(args.model, device, compute_type=compute_type)
    result = model.transcribe(audio, batch_size=16)

    # Step 3: 単語アライメント
    model_a, metadata = whisperx.load_align_model(
        language_code=result["language"], device=device
    )
    result = whisperx.align(
        result["segments"], model_a, metadata, audio, device, return_char_alignments=False
    )

    # Step 4: 話者分離（diarization）
    num_speakers = args.num_speakers
    diarize_model = whisperx.DiarizationPipeline(
        use_auth_token=HF_TOKEN, device=device
    )
    diarize_segments = diarize_model(
        args.audio,
        min_speakers=1,
        max_speakers=num_speakers if num_speakers else 10,
    )
    result = whisperx.assign_word_speakers(diarize_segments, result)

    # Step 5: 話者名の解決
    speaker_map: dict[str, str] = {}
    if HF_TOKEN and personalities:
        try:
            speaker_map = resolve_speaker_names(diarize_segments, personalities)
        except Exception as e:
            print(f"[whisperx] Speaker identification failed (non-fatal): {e}", file=sys.stderr)

    # Step 6: 出力整形
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
```

- [ ] **Step 2: 手動で動作確認（短い音声ファイルで）**

```bash
python apps/api/src/services/transcription/whisperx_transcribe.py \
  --audio /path/to/sample.mp3 \
  --output /tmp/test_result.json \
  --hf_token "$HUGGINGFACE_TOKEN" \
  --model turbo
cat /tmp/test_result.json | head -50
```

Expected: JSON 配列に `text`, `startMs`, `endMs`, `speakerLabel` フィールドが存在する

- [ ] **Step 3: コミット**

```bash
git add apps/api/src/services/transcription/whisperx_transcribe.py
git commit -m "feat: WhisperX 話者分離・識別 Python スクリプトを追加"
```

---

## Task 3: Node.js WhisperX ランナー

**Files:**
- Create: `apps/api/src/services/transcription/whisperx-runner.ts`
- Create: `apps/api/src/services/transcription/whisperx-runner.test.ts`
- Delete: `apps/api/src/services/transcription/whisper-runner.ts`

- [ ] **Step 1: テストを書く**

```typescript
// apps/api/src/services/transcription/whisperx-runner.test.ts
import { promises as fs } from 'node:fs'
import { spawn } from 'node:child_process'

jest.mock('node:child_process', () => ({ spawn: jest.fn() }))
jest.mock('node:fs', () => ({
  promises: { mkdir: jest.fn(), readFile: jest.fn(), rm: jest.fn() }
}))

describe('transcribeAudio', () => {
  beforeEach(() => jest.clearAllMocks())

  it('Python スクリプトを呼び出し WhisperSegment[] を返す', async () => {
    const mockSegments = [
      { text: 'こんにちは', startMs: 0, endMs: 1500, speakerLabel: 'SPEAKER_00' }
    ]
    jest.mocked(fs.mkdir).mockResolvedValue(undefined)
    jest.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockSegments) as any)
    jest.mocked(fs.rm).mockResolvedValue(undefined)

    const mockProc = { on: jest.fn(), kill: jest.fn() }
    mockProc.on.mockImplementation((event: string, cb: Function) => {
      if (event === 'close') setTimeout(() => cb(0), 0)
    })
    jest.mocked(spawn).mockReturnValue(mockProc as any)

    const { transcribeAudio } = await import('./whisperx-runner')
    const result = await transcribeAudio('/tmp/ep.mp3', { personalities: [] })

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('こんにちは')
    expect(result[0].speakerLabel).toBe('SPEAKER_00')
    expect(spawn).toHaveBeenCalledWith(
      'python3',
      expect.arrayContaining(['whisperx_transcribe.py', '--audio', '/tmp/ep.mp3']),
      expect.any(Object)
    )
  })

  it('タイムアウト時にエラーをスローする', async () => {
    jest.mocked(fs.mkdir).mockResolvedValue(undefined)
    jest.mocked(fs.rm).mockResolvedValue(undefined)

    const mockProc = { on: jest.fn(), kill: jest.fn() }
    // close イベントを発火させない → タイムアウトさせる
    mockProc.on.mockImplementation(() => {})
    jest.mocked(spawn).mockReturnValue(mockProc as any)

    const { transcribeAudio } = await import('./whisperx-runner')

    await expect(
      transcribeAudio('/tmp/ep.mp3', { personalities: [], timeoutMs: 100 })
    ).rejects.toThrow('WhisperX timed out')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest --testPathPatterns="whisperx-runner.test" 2>&1 | tail -10
```

Expected: `FAIL`

- [ ] **Step 3: whisperx-runner.ts を実装**

```typescript
// apps/api/src/services/transcription/whisperx-runner.ts
import { spawn } from 'node:child_process'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, extname, join } from 'node:path'
import { env } from '@podcast_search/config'
import type { PersonalityWithSamples } from '@podcast_search/database'

export interface WhisperSegment {
  text: string
  startMs: number
  endMs: number
  speakerLabel?: string
}

export interface TranscribeOptions {
  personalities: PersonalityWithSamples[]
  timeoutMs?: number
  model?: string
}

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname)
const PYTHON_SCRIPT = join(SCRIPT_DIR, 'whisperx_transcribe.py')

export async function transcribeAudio(
  audioPath: string,
  options: TranscribeOptions
): Promise<WhisperSegment[]> {
  const { personalities, timeoutMs = 20 * 60 * 1000, model = 'turbo' } = options

  const outputDir = join(tmpdir(), 'podcast-ingestion')
  await mkdir(outputDir, { recursive: true })

  const audioBasename = basename(audioPath, extname(audioPath))
  const outputPath = join(outputDir, `${audioBasename}-whisperx.json`)

  // personalities の embedding データを JSON 化して渡す
  const personalitiesPayload = personalities
    .filter((p) => p.audioSamples.length > 0)
    .flatMap((p) =>
      p.audioSamples
        .filter((s) => s.embedding != null)
        .map((s) => ({
          name: p.name,
          embedding: s.embedding as number[]
        }))
    )

  const numSpeakers = personalities.length > 0 ? personalities.length : undefined

  const args = [
    PYTHON_SCRIPT,
    '--audio', audioPath,
    '--output', outputPath,
    '--model', model,
    '--personalities', JSON.stringify(personalitiesPayload)
  ]
  if (env.HUGGINGFACE_TOKEN) {
    args.push('--hf_token', env.HUGGINGFACE_TOKEN)
  }
  if (numSpeakers) {
    args.push('--num_speakers', String(numSpeakers))
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('python3', args, { cwd: SCRIPT_DIR })

      proc.stderr?.on('data', (data) => {
        process.stderr.write(`[whisperx] ${data}`)
      })

      const timer = setTimeout(() => {
        proc.kill()
        reject(new Error('WhisperX timed out'))
      }, timeoutMs)

      proc.on('close', (code) => {
        clearTimeout(timer)
        if (code === 0) resolve()
        else reject(new Error(`WhisperX exited with code ${code}`))
      })

      proc.on('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })
    })

    const raw: WhisperSegment[] = JSON.parse(await readFile(outputPath, 'utf-8'))
    return raw
  } finally {
    try { await rm(outputPath) } catch {}
  }
}
```

- [ ] **Step 4: 旧 whisper-runner.ts を削除**

```bash
rm apps/api/src/services/transcription/whisper-runner.ts
rm apps/api/src/services/transcription/whisper-runner.test.ts  # 存在する場合
```

- [ ] **Step 5: テスト実行**

```bash
npx jest --testPathPatterns="whisperx-runner.test" 2>&1 | tail -20
```

Expected: `PASS`

- [ ] **Step 6: コミット**

```bash
git add apps/api/src/services/transcription/
git commit -m "feat: whisper-runner を whisperx-runner に置き換え（話者分離・識別対応）"
```

---

## Task 4: ingest パイプライン更新

**Files:**
- Modify: `apps/api/src/domains/import/import-podcast.usecase.ts`
- Modify: `apps/api/src/domains/import/import-podcast.usecase.test.ts`

- [ ] **Step 1: usecase.test.ts にテストを追加**

既存の `import-podcast.usecase.test.ts` の `jest.mock('@podcast_search/database', ...)` に `PersonalityRepository` を追加：

```typescript
// jest.mock('@podcast_search/database', ...) の中に追加
PersonalityRepository: jest.fn().mockImplementation(() => ({
  findPersonalitiesForTranscription: jest.fn().mockResolvedValue([])
}))
```

新しいテストを追加：

```typescript
it('whisperx-runner の transcribeAudio に personalities を渡す', async () => {
  const mockPersonality = {
    id: 1, name: 'ホスト', description: null, audioSamples: []
  }
  jest.mocked(PersonalityRepository).mockImplementationOnce(
    () => ({
      findPersonalitiesForTranscription: jest.fn().mockResolvedValue([mockPersonality])
    }) as any
  )
  jest.mocked(PodcastRepository).mockImplementationOnce(
    () => ({ findMany: jest.fn().mockResolvedValue([{ id: 1, rssUrl: 'https://example.com/rss' }]) }) as any
  )
  jest.mocked(fetchRssEpisodes).mockResolvedValueOnce([
    { title: 'Ep1', enclosureUrl: 'url', audioUrl: 'https://ex.mp3', publishedAt: null, durationSec: null, description: null }
  ])
  jest.mocked(EpisodeRepository).mockImplementationOnce(
    () => ({ upsertByEnclosureUrl: jest.fn().mockResolvedValue({ id: 10 }) }) as any
  )
  jest.mocked(TranscriptRepository).mockImplementationOnce(
    () => ({
      countByEpisodeId: jest.fn().mockResolvedValue(0),
      bulkCreate: jest.fn(),
      findByEpisodeId: jest.fn().mockResolvedValue([])
    }) as any
  )
  jest.mocked(downloadAudio).mockResolvedValueOnce('/tmp/ep-10.mp3')
  jest.mocked(transcribeAudio).mockResolvedValueOnce([])

  const { runImport } = await import('./import-podcast.usecase')
  await runImport()

  expect(transcribeAudio).toHaveBeenCalledWith(
    '/tmp/ep-10.mp3',
    expect.objectContaining({
      personalities: expect.arrayContaining([
        expect.objectContaining({ name: 'ホスト' })
      ])
    })
  )
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest --testPathPatterns="import-podcast.usecase.test" 2>&1 | tail -15
```

Expected: `FAIL`（transcribeAudio が personalities を受け取っていないため）

- [ ] **Step 3: import-podcast.usecase.ts を更新**

```typescript
// 変更前
import { downloadAudio, deleteAudio } from '../../services/transcription/audio-downloader'
import { transcribeAudio } from '../../services/transcription/whisper-runner'

// 変更後
import { downloadAudio, deleteAudio } from '../../services/transcription/audio-downloader'
import { transcribeAudio } from '../../services/transcription/whisperx-runner'
```

`PersonalityRepository` のインポートを追加：

```typescript
import {
  EpisodeRepository,
  PersonalityRepository,
  PodcastRepository,
  TranscriptRepository
} from '@podcast_search/database'
```

`runImport` 関数内の最初に `personalityRepo` を追加：

```typescript
export async function runImport(options?: { rssUrl?: string }): Promise<void> {
  const podcastRepo = new PodcastRepository()
  const episodeRepo = new EpisodeRepository()
  const transcriptRepo = new TranscriptRepository()
  const personalityRepo = new PersonalityRepository()  // 追加
  const searchCore = createSearchCoreFromEnv()
  // ...
```

音声ダウンロード後の `transcribeAudio` 呼び出しを変更：

```typescript
// 変更前
const segments = await transcribeAudio(audioPath)

// 変更後
const personalities = await personalityRepo.findPersonalitiesForTranscription({
  podcastId,
  episodeId: dbEpisodeId
})
const segments = await transcribeAudio(audioPath, { personalities })
```

`transcriptRepo.bulkCreate` の呼び出しを更新（speakerLabel を含める）：

```typescript
// 変更前
await transcriptRepo.bulkCreate(segments.map((s) => ({ episodeId: dbEpisodeId, ...s })))

// 変更後（speakerLabel を明示的にマップ）
await transcriptRepo.bulkCreate(
  segments.map((s) => ({
    episodeId: dbEpisodeId,
    text: s.text,
    startMs: s.startMs,
    endMs: s.endMs,
    speakerLabel: s.speakerLabel ?? null
  }))
)
```

- [ ] **Step 4: テスト実行**

```bash
npx jest --testPathPatterns="import-podcast.usecase.test|whisperx-runner.test|admin.test" 2>&1 | tail -30
```

Expected: 全テスト `PASS`

- [ ] **Step 5: 型チェック**

```bash
pnpm typecheck 2>&1 | grep "error TS" | grep -v "search.ts\|rss-fetcher"
```

Expected: 追加エラーなし

- [ ] **Step 6: コミット**

```bash
git add apps/api/src/domains/import/
git commit -m "feat: ingest パイプラインを WhisperX に移行し話者識別を統合"
```

---

## 検証手順

1. Python 環境確認：
   ```bash
   python3 -c "import whisperx; import pyannote.audio; print('OK')"
   ```

2. 短い音声ファイルで Python スクリプトを手動実行：
   ```bash
   python3 apps/api/src/services/transcription/whisperx_transcribe.py \
     --audio /path/to/test.mp3 \
     --output /tmp/out.json \
     --hf_token "$HUGGINGFACE_TOKEN"
   cat /tmp/out.json
   ```
   Expected: `speakerLabel` フィールドが含まれる JSON

3. Admin UI でパーソナリティに声サンプルを登録

4. `POST /admin/ingest` を実行

5. `GET /episodes/:id` の transcripts に `speakerLabel` が返ることを確認

6. 全テスト：
   ```bash
   pnpm test 2>&1 | tail -20
   ```
