export function useSearch() {
  const search = useState('search', () => '')

  return { search }
}
