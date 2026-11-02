import { createRouterClient } from '@orpc/server'
import type { RouterClient } from '@orpc/server'
import { router } from '~~/server/orpc/router'
import type { Router } from '~~/server/orpc/router'

// During SSR, call procedures directly instead of going through HTTP
export default defineNuxtPlugin(() => {
  const event = useRequestEvent()
  const orpc: RouterClient<Router> = createRouterClient(router, {
    context: () => ({ headers: new Headers(event?.headers) }),
  })

  return { provide: { orpc } }
})
