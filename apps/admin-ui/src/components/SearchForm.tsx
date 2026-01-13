import { type FormEvent, useState } from 'react'

interface Episode {
  id: number
  title: string
  url: string
}

type Props = {
  onResults: (episodes: Episode[]) => void
}

export default function SearchForm({ onResults }: Props) {
  const [query, setQuery] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const res = await fetch(`/search?q=${encodeURIComponent(query)}`)
    const data = await res.json()
    onResults(data.episodes || [])
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="話題を入力..."
        style={{ flex: 1, padding: 8 }}
      />
      <button type="submit" style={{ padding: '8px 16px' }}>
        検索
      </button>
    </form>
  )
}
