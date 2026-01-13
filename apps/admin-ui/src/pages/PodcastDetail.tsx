import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { fetchPodcast } from '../api'

export default function PodcastDetail() {
  const { id } = useParams<{ id: string }>()
  const podcastId = Number(id)

  const {
    data: podcast,
    isLoading,
    error
  } = useQuery({
    queryKey: ['podcast', podcastId],
    queryFn: () => fetchPodcast(podcastId),
    enabled: !Number.isNaN(podcastId)
  })

  if (isLoading) {
    return <div className="text-center py-8">読み込み中...</div>
  }

  if (error || !podcast) {
    return <div className="text-center py-8 text-red-500">Podcast が見つかりませんでした</div>
  }

  return (
    <div>
      <Link to="/podcasts" className="text-blue-600 hover:underline mb-4 inline-block">
        ← Podcast 一覧に戻る
      </Link>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start gap-4">
          {podcast.imageUrl && (
            <img
              src={podcast.imageUrl}
              alt={podcast.title}
              className="w-24 h-24 rounded-lg object-cover bg-gray-100"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{podcast.title}</h2>
            {podcast.author && <p className="text-gray-600 mt-1">{podcast.author}</p>}
            <div className="flex gap-2 mt-2">
              {podcast.language && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                  {podcast.language}
                </span>
              )}
            </div>
            {podcast.rssUrl && (
              <a
                href={podcast.rssUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 hover:underline mt-2 block"
              >
                RSS Feed
              </a>
            )}
          </div>
        </div>
      </div>

      <h3 className="text-xl font-semibold mb-4">エピソード ({podcast.episodes.length}件)</h3>

      <div className="space-y-3">
        {podcast.episodes.map((episode) => (
          <Link
            key={episode.id}
            to={`/episodes/${episode.id}`}
            className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <h4 className="font-medium text-gray-900">{episode.title}</h4>
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

      {podcast.episodes.length === 0 && (
        <p className="text-center text-gray-500 py-8">エピソードがありません</p>
      )}
    </div>
  )
}
