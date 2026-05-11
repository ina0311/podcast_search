export type JobStatus = 'idle' | 'running' | 'done' | 'error'

export interface JobError {
  episodeId: number
  message: string
}

export interface JobState {
  status: JobStatus
  total: number
  done: number
  errors: JobError[]
}

const state: JobState = {
  status: 'idle',
  total: 0,
  done: 0,
  errors: []
}

export const jobStore = {
  getState(): JobState {
    return { ...state, errors: [...state.errors] }
  },
  start(total: number): void {
    state.status = 'running'
    state.total = total
    state.done = 0
    state.errors = []
  },
  complete(): void {
    state.status = 'done'
  },
  fail(): void {
    state.status = 'error'
  },
  incrementDone(): void {
    state.done++
  },
  addError(episodeId: number, message: string): void {
    state.errors.push({ episodeId, message })
  }
}
