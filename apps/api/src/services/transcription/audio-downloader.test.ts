const mockFetch = jest.spyOn(global, 'fetch')

jest.mock('node:fs', () => ({
  createWriteStream: jest.fn(() => ({
    write: jest.fn(),
    end: jest.fn(),
    on: jest.fn((event: string, cb: () => void) => {
      if (event === 'finish') cb()
    })
  }))
}))

jest.mock('node:stream/promises', () => ({
  pipeline: jest.fn().mockResolvedValue(undefined)
}))

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined)
}))

describe('downloadAudio', () => {
  beforeEach(() => jest.clearAllMocks())

  it('200レスポンスでファイルパスを返す', async () => {
    const mockBody = {}
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: mockBody
    } as any)

    const { downloadAudio } = await import('./audio-downloader')
    const result = await downloadAudio('https://example.com/ep.mp3', 'ep-1.mp3')

    expect(result).toContain('ep-1.mp3')
  })

  it('非200レスポンスでエラーをスロー', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 } as any)

    const { downloadAudio } = await import('./audio-downloader')
    await expect(downloadAudio('https://example.com/ep.mp3', 'ep-1.mp3')).rejects.toThrow(
      'Audio download failed: 403'
    )
  })
})

describe('deleteAudio', () => {
  it('ファイルが存在しなくてもエラーをスローしない', async () => {
    const { unlink } = await import('node:fs/promises')
    jest.mocked(unlink).mockRejectedValueOnce(new Error('ENOENT'))

    const { deleteAudio } = await import('./audio-downloader')
    await expect(deleteAudio('/tmp/nonexistent.mp3')).resolves.not.toThrow()
  })
})
