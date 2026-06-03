import { startServer } from './app'

try {
  startServer()
} catch (error) {
  console.error('[backend] startup failed')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
