// Entry point on AWS Lambda, behind API Gateway: see infra/.
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm'
import { connect } from './db'
import { createHandler } from './lambda-handler'
import { originsFromEnv } from './create-app'
import { createPostgresLikes } from './postgres-likes'
import { createPostgresWishlist } from './postgres-wishlist'

// The Supabase URL is a SecureString in SSM, read once per cold start.
async function databaseUrl() {
  const name = process.env.DATABASE_URL_PARAMETER
  if (!name) throw new Error('DATABASE_URL_PARAMETER is not set')
  const { Parameter } = await new SSMClient({}).send(
    new GetParameterCommand({ Name: name, WithDecryption: true }),
  )
  if (!Parameter?.Value) throw new Error(`${name} is empty`)
  return Parameter.Value
}

// An instance handles one request at a time, so one connection is enough.
const sql = connect(await databaseUrl(), 1)

export const handler = createHandler({
  wishlist: createPostgresWishlist(sql),
  likes: createPostgresLikes(sql),
  origins: originsFromEnv(),
  log: true,
})
