import { RPCHandler } from '@orpc/server/fetch'
import { router } from '../../orpc/router'

const handler = new RPCHandler(router)

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event)
  const { response } = await handler.handle(request, {
    prefix: '/rpc',
    context: { headers: request.headers },
  })

  if (response) return response

  setResponseStatus(event, 404, 'Not Found')
  return 'Not found'
})
