// Entry point on Vercel, which finds the app through this file's import of hono.
import { Hono } from 'hono'
import { createApp } from './create-app'

const app = new Hono()
app.route('/', createApp({ log: true }))

export default app
