// Entry point on Vercel, which finds the app through this file's import of hono.
import { Hono } from 'hono'
import { createApp } from './create-app'
import { wishlistFromEnv } from './wishlist-from-env'

const app = new Hono()
app.route('/', createApp({ wishlist: wishlistFromEnv(), log: true }))

export default app
