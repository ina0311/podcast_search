import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { IngestStatus } from '../api'
import {
  addPersonalityToPodcast,
  fetchIngestStatus,
  fetchPersonalities,
  fetchPersonalitiesByPodcast,
  fetchPodcast,
  removePersonalityFromPodcast,
  triggerIngest
} from '../api'

export default function PodcastDetail() {
  const { id } = useParams<{ id: string }>()
  const podcastId = Number(id)

  const [ingestState, setIngestState] = useState<IngestStatus['status']>('idle')
  const [progress, setProgress] = useState({ total: 0, done: 0 })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const {
    data: podcast,
    isLoading,
    error
  } = useQuery({
    queryKey: ['podcast', podcastId],
    queryFn: () => fetchPodcast(podcastId),
    enabled: !Number.isNaN(podcastId)
  })

  const { data: allPersonalities = [] } = useQuery({
    queryKey: ['personalities'],
    queryFn: fetchPersonalities
  })

  const { data: podcastPersonalities = [] } = useQuery({
    queryKey: ['podcast-personalities', podcastId],
    queryFn: () => fetchPersonalitiesByPodcast(podcastId),
    enabled: !Number.isNaN(podcastId)
  })

  const addMutation = useMutation({
    mutationFn: ({ personalityId, role }: { personalityId: number; role?: string }) =>
      addPersonalityToPodcast(podcastId, personalityId, role),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['podcast-personalities', podcastId] })
  })

  const removeMutation = useMutation({
    mutationFn: (personalityId: number) => removePersonalityFromPodcast(podcastId, personalityId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['podcast-personalities', podcastId] })
  })

  const handleIngest = async (rssUrl: string) => {
    setIngestState('running')
    setProgress({ total: 0, done: 0 })
    try {
      await triggerIngest(rssUrl)
    } catch {
      setIngestState('error')
      return
    }
    intervalRef.current = setInterval(async () => {
      try {
        const status = await fetchIngestStatus()
        setProgress({ total: status.total, done: status.done })
        if (status.status === 'done' || status.status === 'error') {
          setIngestState(status.status)
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
      } catch {
        setIngestState('error')
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }, 1000)
  }

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
            {podcast.rssUrl && (
              <div className="mt-3">
                <button
                  type="button"
                  disabled={ingestState === 'running'}
                  onClick={() => handleIngest(podcast.rssUrl!)}
                  className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ingestState === 'running' ? '文字起こし中...' : '文字起こし開始'}
                </button>
                {ingestState === 'running' && progress.total > 0 && (
                  <span className="ml-3 text-sm text-gray-600">
                    {progress.done} / {progress.total} 件完了
                  </span>
                )}
                {ingestState === 'done' && (
                  <span className="ml-3 text-sm text-green-600">完了しました</span>
                )}
                {ingestState === 'error' && (
                  <span className="ml-3 text-sm text-red-600">エラーが発生しました</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-3">デフォルト出演者</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {podcastPersonalities.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
            >
              {p.name}
              <button
                type="button"
                onClick={() => removeMutation.mutate(p.id)}
                className="ml-1 text-indigo-500 hover:text-indigo-700"
              >
                ×
              </button>
            </span>
          ))}
          {podcastPersonalities.length === 0 && (
            <span className="text-sm text-gray-500">未設定（すべてのパーソナリティが対象）</span>
          )}
        </div>
        <select
          onChange={(e) => {
            if (e.target.value) {
              addMutation.mutate({ personalityId: Number(e.target.value) })
              e.target.value = ''
            }
          }}
          className="border rounded px-3 py-1.5 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            + パーソナリティを追加
          </option>
          {allPersonalities
            .filter((p) => !podcastPersonalities.some((pp) => pp.id === p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
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
