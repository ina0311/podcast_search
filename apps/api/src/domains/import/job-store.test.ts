describe('jobStore', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('初期状態は idle', async () => {
    const { jobStore } = await import('./job-store')
    expect(jobStore.getState().status).toBe('idle')
  })

  it('start で running になり total がセットされる', async () => {
    const { jobStore } = await import('./job-store')
    jobStore.start(10)
    const state = jobStore.getState()
    expect(state.status).toBe('running')
    expect(state.total).toBe(10)
    expect(state.done).toBe(0)
    expect(state.errors).toHaveLength(0)
  })

  it('incrementDone で done が増加する', async () => {
    const { jobStore } = await import('./job-store')
    jobStore.start(3)
    jobStore.incrementDone()
    jobStore.incrementDone()
    expect(jobStore.getState().done).toBe(2)
  })

  it('addError でエラーが記録される', async () => {
    const { jobStore } = await import('./job-store')
    jobStore.start(1)
    jobStore.addError(5, 'download failed')
    expect(jobStore.getState().errors).toEqual([{ episodeId: 5, message: 'download failed' }])
  })

  it('complete で done になる', async () => {
    const { jobStore } = await import('./job-store')
    jobStore.start(1)
    jobStore.complete()
    expect(jobStore.getState().status).toBe('done')
  })

  it('fail で error になる', async () => {
    const { jobStore } = await import('./job-store')
    jobStore.start(1)
    jobStore.fail()
    expect(jobStore.getState().status).toBe('error')
  })

  it('start の再呼び出しで done と errors がリセットされる', async () => {
    const { jobStore } = await import('./job-store')
    jobStore.start(5)
    jobStore.incrementDone()
    jobStore.addError(1, 'error')
    jobStore.start(3)
    const state = jobStore.getState()
    expect(state.total).toBe(3)
    expect(state.done).toBe(0)
    expect(state.errors).toHaveLength(0)
  })
})
