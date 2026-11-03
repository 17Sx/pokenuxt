import { handle } from '@hono/aws-lambda'
import { createApp, type AppOptions } from './create-app'

/** The app as a Lambda handler for API Gateway, binary sprites included. */
export function createHandler(options: AppOptions) {
  return handle(createApp(options))
}
