import type { PodcastEpisode } from '@podcast_search/database'
import { useQuery } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import { searchPodcastEpisodes } from '../api'

type Props = {
  onResults: (episodes: PodcastEpisode[]) => void
}

export default function SearchForm({ onResults }: Props) {
  const [query, setQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['searchPodcastEpisodes', searchQuery],
    queryFn: () => searchPodcastEpisodes(searchQuery),
    enabled: searchQuery.length > 0,
    staleTime: 1000 * 60 * 5 // 5分間キャッシュ
  })

  // 検索結果が更新されたら親コンポーネントに通知
  useEffect(() => {
    if (data?.episodes && searchQuery.length > 0) {
      onResults(data.episodes)
    }
  }, [data, searchQuery, onResults])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmedQuery = query.trim()
    if (trimmedQuery.length > 0) {
      setSearchQuery(trimmedQuery)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="話題を入力..."
        style={{ flex: 1, padding: 8 }}
      />
      <button type="submit" disabled={isLoading} style={{ padding: '8px 16px' }}>
        {isLoading ? '検索中...' : '検索'}
      </button>
      {error && <div style={{ color: 'red', fontSize: '12px' }}>エラーが発生しました</div>}
    </form>
  )
}
