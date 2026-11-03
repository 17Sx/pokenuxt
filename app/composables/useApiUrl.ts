/** The Hono API's address, from runtimeConfig.public.apiBase: url('wishlist') */
export function useApiUrl() {
  const base = useRuntimeConfig().public.apiBase.replace(/\/+$/, '')
  return (path: string) => `${base}/${path.replace(/^\/+/, '')}`
}
