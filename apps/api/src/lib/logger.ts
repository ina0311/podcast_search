import pino from 'pino'

const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
  base: { service: 'api' },
  ...(process.env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {})
})

export default logger
