import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchPersonalitiesByPodcast, fetchPodcast } from '../api'

export default function PodcastDetail() {
  const { id } = useParams<{ id: string }>()
  const podcastId = Number(id)
  const navigate = useNavigate()

  const {
    data: podcast,
    isLoading,
    error
  } = useQuery({
    queryKey: ['podcast', podcastId],
    queryFn: () => fetchPodcast(podcastId),
    enabled: !Number.isNaN(podcastId)
  })

  const { data: podcastPersonalities = [] } = useQuery({
    queryKey: ['podcast-personalities', podcastId],
    queryFn: () => fetchPersonalitiesByPodcast(podcastId),
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
      <Link to="/podcasts" className="text-blue-600 hover:underline mb-4 inline-block text-sm">
        ← Podcast 一覧に戻る
      </Link>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start gap-4">
          {podcast.imageUrl && (
            <img
              src={podcast.imageUrl}
              alt={podcast.title}
              className="w-24 h-24 rounded-lg object-cover bg-gray-100 shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-900">{podcast.title}</h2>
            {podcast.author && <p className="text-gray-500 mt-1 text-sm">{podcast.author}</p>}
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
                className="text-xs text-blue-600 hover:underline mt-2 block"
              >
                RSS Feed
              </a>
            )}
          </div>
        </div>
      </div>

      {podcastPersonalities.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold">出演者</h3>
            <button
              type="button"
              onClick={() => navigate(`/podcasts/${podcastId}/add-episode`)}
              className="text-xs text-indigo-600 hover:underline"
            >
              編集
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {podcastPersonalities.map((p) => (
              <span
                key={p.id}
                className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">
          エピソード
          <span className="text-base font-normal text-gray-400 ml-2">
            {podcast.episodes.length}件
          </span>
        </h3>
        <button
          type="button"
          onClick={() => navigate(`/podcasts/${podcastId}/add-episode`)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
        >
          + エピソード追加
        </button>
      </div>

      {podcast.episodes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow border border-dashed border-gray-300">
          <p className="text-gray-400 mb-4">まだエピソードがありません</p>
          <button
            type="button"
            onClick={() => navigate(`/podcasts/${podcastId}/add-episode`)}
            className="px-5 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
          >
            最初のエピソードを追加する
          </button>
        </div>
      ) : (
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
      )}
    </div>
  )
}
