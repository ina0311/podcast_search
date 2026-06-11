import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import {
  addPersonalityToEpisode,
  fetchEpisode,
  fetchPersonalities,
  fetchPersonalitiesByEpisode,
  removePersonalityFromEpisode
} from '../api'

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export default function EpisodeDetail() {
  const { id } = useParams<{ id: string }>()
  const episodeId = Number(id)
  const queryClient = useQueryClient()

  const {
    data: episode,
    isLoading,
    error
  } = useQuery({
    queryKey: ['episode', episodeId],
    queryFn: () => fetchEpisode(episodeId),
    enabled: !Number.isNaN(episodeId)
  })

  const { data: allPersonalities = [] } = useQuery({
    queryKey: ['personalities'],
    queryFn: fetchPersonalities
  })

  const { data: episodePersonalities = [] } = useQuery({
    queryKey: ['episode-personalities', episodeId],
    queryFn: () => fetchPersonalitiesByEpisode(episodeId),
    enabled: !Number.isNaN(episodeId)
  })

  const addEpisodePersonalityMutation = useMutation({
    mutationFn: (personalityId: number) => addPersonalityToEpisode(episodeId, personalityId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['episode-personalities', episodeId] })
  })

  const removeEpisodePersonalityMutation = useMutation({
    mutationFn: (personalityId: number) => removePersonalityFromEpisode(episodeId, personalityId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['episode-personalities', episodeId] })
  })

  if (isLoading) {
    return <div className="text-center py-8">読み込み中...</div>
  }

  if (error || !episode) {
    return <div className="text-center py-8 text-red-500">Episode が見つかりませんでした</div>
  }

  return (
    <div>
      <div className="flex gap-4 mb-4">
        <Link to="/episodes" className="text-blue-600 hover:underline">
          ← Episode 一覧
        </Link>
        {episode.podcastId && (
          <Link to={`/podcasts/${episode.podcastId}`} className="text-blue-600 hover:underline">
            Podcast 詳細
          </Link>
        )}
      </div>

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

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-1">ゲスト出演者</h3>
        <p className="text-xs text-gray-500 mb-3">この回のみ出演するゲストを設定します</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {episodePersonalities.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
            >
              {p.name}
              <button
                type="button"
                onClick={() => removeEpisodePersonalityMutation.mutate(p.id)}
                className="ml-1 text-green-500 hover:text-green-700"
              >
                ×
              </button>
            </span>
          ))}
          {episodePersonalities.length === 0 && (
            <span className="text-sm text-gray-500">ゲストなし</span>
          )}
        </div>
        <select
          onChange={(e) => {
            if (e.target.value) {
              addEpisodePersonalityMutation.mutate(Number(e.target.value))
              e.target.value = ''
            }
          }}
          className="border rounded px-3 py-1.5 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            + ゲストを追加
          </option>
          {allPersonalities
            .filter((p) => !episodePersonalities.some((ep) => ep.id === p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
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
