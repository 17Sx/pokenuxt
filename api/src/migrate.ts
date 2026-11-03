// bun run db:migrate: applies db/migrations/ to the database in DATABASE_URL.
import { connect } from './db'
import { migrate, MigrationError } from './migrations'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const sql = connect(url, 1)
try {
  const ran = await migrate(sql)
  console.log(ran.length ? `Applied ${ran.join(', ')}` : 'Nothing to apply.')
} catch (error) {
  if (!(error instanceof MigrationError)) throw error
  console.error(error.message)
  process.exitCode = 1
} finally {
  await sql.end()
}
