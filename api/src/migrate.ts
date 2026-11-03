// bun run db:migrate: applies db/ to the database in DATABASE_URL.
import { connect } from './db'
import { migrate } from './migrations'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const sql = connect(url, 1)
try {
  const ran = await migrate(sql)
  console.log(ran.length ? `Applied ${ran.join(', ')}` : 'Nothing to apply.')
} finally {
  await sql.end()
}
