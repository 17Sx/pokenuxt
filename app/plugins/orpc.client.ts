import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
import type { Router } from '~~/server/orpc/router'

export default defineNuxtPlugin(() => {
  const link = new RPCLink({ url: `${window.location.origin}/rpc` })
  const orpc: RouterClient<Router> = createORPCClient(link)

  return { provide: { orpc } }
})
