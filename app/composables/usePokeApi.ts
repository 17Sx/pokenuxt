import type { UseFetchOptions } from 'nuxt/app'

export function usePokeApi<T>(
  path: MaybeRefOrGetter<string>,
  options: UseFetchOptions<T> = {},
) {
  const url = useApiUrl()
  return useFetch(() => url(`pokeapi/${toValue(path)}`), options)
}

export function fetchPokeApi<T>(
  path: string,
  query?: Record<string, string | number>,
) {
  return $fetch<T>(useApiUrl()(`pokeapi/${path}`), { query })
}
