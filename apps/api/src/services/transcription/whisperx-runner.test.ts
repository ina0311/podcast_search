import { spawn } from 'node:child_process'
import * as fsp from 'node:fs/promises'

jest.mock('node:child_process', () => ({ spawn: jest.fn() }))
jest.mock('node:fs', () => ({
  promises: { mkdir: jest.fn(), readFile: jest.fn(), rm: jest.fn() }
}))
jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn(),
  readFile: jest.fn(),
  rm: jest.fn()
}))
jest.mock('@podcast_search/config', () => ({
  env: { HUGGINGFACE_TOKEN: undefined }
}))

describe('transcribeAudio', () => {
  beforeEach(() => jest.clearAllMocks())

  it('Python スクリプトを呼び出し WhisperSegment[] を返す', async () => {
    const mockSegments = [
      { text: 'こんにちは', startMs: 0, endMs: 1500, speakerLabel: 'SPEAKER_00' }
    ]
    jest.mocked(fsp.mkdir).mockResolvedValue(undefined)
    jest.mocked(fsp.readFile).mockResolvedValue(JSON.stringify(mockSegments) as any)
    jest.mocked(fsp.rm).mockResolvedValue(undefined)

    const mockProc = { on: jest.fn(), kill: jest.fn(), stderr: null }
    mockProc.on.mockImplementation((event: string, cb: Function) => {
      if (event === 'close') setTimeout(() => cb(0), 0)
      return mockProc
    })
    jest.mocked(spawn).mockReturnValue(mockProc as any)

    const { transcribeAudio } = await import('./whisperx-runner')
    const result = await transcribeAudio('/tmp/ep.mp3', { personalities: [] })

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('こんにちは')
    expect(result[0].speakerLabel).toBe('SPEAKER_00')
    expect(spawn).toHaveBeenCalledWith(
      'python3',
      expect.arrayContaining(['--audio', '/tmp/ep.mp3']),
      expect.any(Object)
    )
  })

  it('タイムアウト時にエラーをスローする', async () => {
    jest.mocked(fsp.mkdir).mockResolvedValue(undefined)
    jest.mocked(fsp.rm).mockResolvedValue(undefined)

    const mockProc = { on: jest.fn(), kill: jest.fn(), stderr: null }
    mockProc.on.mockImplementation(() => mockProc)
    jest.mocked(spawn).mockReturnValue(mockProc as any)

    const { transcribeAudio } = await import('./whisperx-runner')

    await expect(
      transcribeAudio('/tmp/ep.mp3', { personalities: [], timeoutMs: 100 })
    ).rejects.toThrow('WhisperX timed out')
  })
})
