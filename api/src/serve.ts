// Local server: bun run dev, or bun run start.
import { createApp } from './create-app'
import { wishlistFromEnv } from './wishlist-from-env'

const port = Number(process.env.PORT ?? 8787)
const app = createApp({ wishlist: wishlistFromEnv(), log: true })

Bun.serve({ port, fetch: app.fetch })
console.log(`API on http://localhost:${port}`)
