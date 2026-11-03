import postgres from 'postgres'

// prepare: false so it also works through a pooler in transaction mode, like
// Supabase's, which serverless functions need.
export function connect(url: string, max = 5) {
  return postgres(url, { prepare: false, max, onnotice: () => {} })
}
