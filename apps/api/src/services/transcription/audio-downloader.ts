import { createWriteStream } from 'node:fs'
import { mkdir, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

export async function downloadAudio(audioUrl: string, fileName: string): Promise<string> {
  const dir = join(tmpdir(), 'podcast-ingestion')
  await mkdir(dir, { recursive: true })
  const filePath = join(dir, fileName)

  const res = await fetch(audioUrl)
  if (!res.ok) throw new Error(`Audio download failed: ${res.status}`)
  if (!res.body) throw new Error('Response body is empty')

  const writer = createWriteStream(filePath)
  await pipeline(Readable.fromWeb(res.body as any), writer)

  return filePath
}

export async function deleteAudio(filePath: string): Promise<void> {
  try {
    await unlink(filePath)
  } catch {
    // ファイルが既に削除されていても無視する
  }
}
