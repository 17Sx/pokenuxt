const NAME = /^[a-z0-9-]{1,100}$/

/**
 * /pokemon/<name> for every Pokémon the API lists, to prerender: the national
 * Pokédex, then the forms.
 */
export async function pokemonRoutes(
  apiBase: string,
  fetcher: typeof fetch = fetch,
): Promise<string[]> {
  const url = `${apiBase.replace(/\/+$/, '')}/pokeapi/pokemon?limit=10000`
  const response = await fetcher(url)
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}`)
  }
  const { results } = (await response.json()) as {
    results?: { name?: unknown }[]
  }
  const names = (results ?? [])
    .map((pokemon) => pokemon?.name)
    .filter(
      (name): name is string => typeof name === 'string' && NAME.test(name),
    )
  if (!names.length) throw new Error(`${url} listed no Pokémon`)
  return [...new Set(names)].map((name) => `/pokemon/${name}`)
}
