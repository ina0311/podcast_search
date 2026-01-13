import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { fetchEpisode } from '../api'

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export default function EpisodeDetail() {
  const { id } = useParams<{ id: string }>()
  const episodeId = Number(id)

  const {
    data: episode,
    isLoading,
    error
  } = useQuery({
    queryKey: ['episode', episodeId],
    queryFn: () => fetchEpisode(episodeId),
    enabled: !Number.isNaN(episodeId)
  })

  if (isLoading) {
    return <div className="text-center py-8">読み込み中...</div>
  }

  if (error || !episode) {
    return <div className="text-center py-8 text-red-500">Episode が見つかりませんでした</div>
  }

  return (
    <div>
      <Link to="/episodes" className="text-blue-600 hover:underline mb-4 inline-block">
        ← Episode 一覧に戻る
      </Link>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{episode.title}</h2>

        <div className="flex items-center gap-3 mb-4">
          <span
            className={`px-2 py-0.5 rounded text-sm ${
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
            <span className="text-sm text-gray-500">
              {new Date(episode.publishedAt).toLocaleDateString('ja-JP')}
            </span>
          )}
          {episode.durationSec && (
            <span className="text-sm text-gray-500">{Math.floor(episode.durationSec / 60)}分</span>
          )}
        </div>

        {episode.description && <p className="text-gray-600 mb-4">{episode.description}</p>}

        <a
          href={episode.enclosureUrl}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline text-sm"
        >
          音声ファイルを開く
        </a>
      </div>

      <h3 className="text-xl font-semibold mb-4">
        トランスクリプト ({episode.transcripts.length}セグメント)
      </h3>

      {episode.transcripts.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600 font-medium w-24">時間</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium w-24">話者</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">テキスト</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {episode.transcripts.map((segment) => (
                <tr key={segment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 font-mono">
                    {formatTime(segment.startMs)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{segment.speakerLabel || '-'}</td>
                  <td className="px-4 py-3 text-gray-900">{segment.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-gray-500 py-8 bg-white rounded-lg shadow">
          トランスクリプトがありません
        </p>
      )}
    </div>
  )
}
