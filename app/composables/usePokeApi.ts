import type { UseFetchOptions } from 'nuxt/app'

export function usePokeApi<T>(
  path: MaybeRefOrGetter<string>,
  options: UseFetchOptions<T> = {},
) {
  return useFetch(() => `/api/pokeapi/${toValue(path)}`, options)
}

export function fetchPokeApi<T>(
  path: string,
  query?: Record<string, string | number>,
) {
  return $fetch<T>(`/api/pokeapi/${path}`, { query })
}
