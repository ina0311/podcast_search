import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchEpisodes } from '../api'

export default function EpisodeList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['episodes'],
    queryFn: fetchEpisodes
  })
  const episodes = data?.episodes

  if (isLoading) {
    return <div className="text-center py-8">読み込み中...</div>
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">エラーが発生しました</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Episode 一覧</h2>
      <div className="space-y-3">
        {episodes?.map((episode) => (
          <Link
            key={episode.id}
            to={`/episodes/${episode.id}`}
            className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <h3 className="font-medium text-gray-900">{episode.title}</h3>
            {episode.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{episode.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span
                className={`px-2 py-0.5 rounded ${
                  episode.status === 'PUBLISHED'
                    ? 'bg-green-100 text-green-800'
                    : episode.status === 'DRAFT'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                }`}
              >
                {episode.status}
              </span>
              {episode.publishedAt && (
                <span>{new Date(episode.publishedAt).toLocaleDateString('ja-JP')}</span>
              )}
              {episode.durationSec && <span>{Math.floor(episode.durationSec / 60)}分</span>}
            </div>
          </Link>
        ))}
      </div>
      {episodes?.length === 0 && (
        <p className="text-center text-gray-500 py-8">Episode がありません</p>
      )}
    </div>
  )
}
