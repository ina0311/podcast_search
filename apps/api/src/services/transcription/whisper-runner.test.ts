import { EventEmitter } from 'node:events'

jest.mock('node:child_process', () => ({
  spawn: jest.fn()
}))

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn(),
  rm: jest.fn().mockResolvedValue(undefined)
}))

import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'

const mockSpawn = jest.mocked(spawn)
const mockReadFile = jest.mocked(readFile)

function createMockProcess(exitCode: number) {
  const proc = new EventEmitter() as any
  proc.kill = jest.fn()
  setTimeout(() => proc.emit('close', exitCode), 0)
  return proc
}

describe('transcribeAudio', () => {
  beforeEach(() => jest.clearAllMocks())

  it('whisper が正常終了したときセグメントを返す', async () => {
    mockSpawn.mockReturnValueOnce(createMockProcess(0) as any)
    const whisperOutput = JSON.stringify({
      segments: [
        { text: ' こんにちは', start: 0.0, end: 2.5 },
        { text: ' 世界', start: 2.5, end: 5.0 }
      ]
    })
    mockReadFile.mockResolvedValueOnce(whisperOutput as any)

    const { transcribeAudio } = await import('./whisper-runner')
    const segments = await transcribeAudio('/tmp/ep-1.mp3')

    expect(segments).toEqual([
      { text: 'こんにちは', startMs: 0, endMs: 2500 },
      { text: '世界', startMs: 2500, endMs: 5000 }
    ])
  })

  it('whisper が非ゼロで終了したときエラーをスロー', async () => {
    mockSpawn.mockReturnValueOnce(createMockProcess(1) as any)

    const { transcribeAudio } = await import('./whisper-runner')
    await expect(transcribeAudio('/tmp/ep-1.mp3')).rejects.toThrow('Whisper exited with code 1')
  })
})
