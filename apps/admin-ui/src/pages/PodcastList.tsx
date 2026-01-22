import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchPodcasts } from '../api'

export default function PodcastList() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['podcasts'],
    queryFn: fetchPodcasts
  })
  const podcasts = data?.podcasts

  if (isLoading) {
    return <div className="text-center py-8">読み込み中...</div>
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">エラーが発生しました</div>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          再試行
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Podcast 一覧</h2>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isFetching ? '更新中...' : '🔄 再読み込み'}
        </button>
      </div>
      <div className="grid gap-4">
        {podcasts?.map((podcast) => (
          <Link
            key={podcast.id}
            to={`/podcasts/${podcast.id}`}
            className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <div className="flex items-start gap-4">
              {podcast.imageUrl && (
                <img
                  src={podcast.imageUrl}
                  alt={podcast.title}
                  className="w-16 h-16 rounded-lg object-cover bg-gray-100"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">{podcast.title}</h3>
                {podcast.author && <p className="text-sm text-gray-600 mt-1">{podcast.author}</p>}
                <div className="flex gap-2 mt-2">
                  {podcast.language && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                      {podcast.language}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {podcasts?.length === 0 && (
        <p className="text-center text-gray-500 py-8">Podcast がありません</p>
      )}
    </div>
  )
}
