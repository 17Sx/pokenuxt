import type { UseFetchOptions } from 'nuxt/app'

// API Gateway answers 429 past its rate limit, and PokéAPI can be briefly
// unavailable: try again a few times before giving up.
const RETRY = {
  retry: 3,
  retryDelay: 1000,
  retryStatusCodes: [429, 500, 502, 503, 504],
}

/** A PokéAPI resource through the API. transform can reshape it: DataT. */
export function usePokeApi<T, DataT = T>(
  path: MaybeRefOrGetter<string>,
  options: UseFetchOptions<T, DataT> = {},
) {
  const url = useApiUrl()
  return useFetch(() => url(`pokeapi/${toValue(path)}`), {
    ...RETRY,
    ...options,
  })
}

export function fetchPokeApi<T>(
  path: string,
  query?: Record<string, string | number>,
) {
  return $fetch<T>(useApiUrl()(`pokeapi/${path}`), { ...RETRY, query })
}
