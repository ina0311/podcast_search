import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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

export default function AddEpisode() {
  const { id } = useParams<{ id: string }>()
  const podcastId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [rssUrl, setRssUrl] = useState('')
  const [ingestState, setIngestState] = useState<IngestStatus['status']>('idle')
  const [progress, setProgress] = useState({ total: 0, done: 0 })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const { data: podcast } = useQuery({
    queryKey: ['podcast', podcastId],
    queryFn: () => fetchPodcast(podcastId),
    enabled: !Number.isNaN(podcastId)
  })

  useEffect(() => {
    if (podcast?.rssUrl) setRssUrl(podcast.rssUrl)
  }, [podcast?.rssUrl])

  const { data: allPersonalities = [] } = useQuery({
    queryKey: ['personalities'],
    queryFn: fetchPersonalities
  })

  const { data: podcastPersonalities = [] } = useQuery({
    queryKey: ['podcast-personalities', podcastId],
    queryFn: () => fetchPersonalitiesByPodcast(podcastId),
    enabled: !Number.isNaN(podcastId)
  })

  const removeMutation = useMutation({
    mutationFn: (personalityId: number) => removePersonalityFromPodcast(podcastId, personalityId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['podcast-personalities', podcastId] })
  })

  const [addError, setAddError] = useState<string | null>(null)

  const addMutation = useMutation({
    mutationFn: (personalityId: number) =>
      addPersonalityToPodcast(podcastId, personalityId, 'guest'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['podcast-personalities', podcastId] })
      setSelectedId('')
      setAddError(null)
    },
    onError: () => setAddError('追加に失敗しました')
  })

  const handleIngest = async () => {
    const url = rssUrl.trim()
    if (!url) return
    setIngestState('running')
    setProgress({ total: 0, done: 0 })
    try {
      await triggerIngest({ rssUrl: url, podcastId })
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
          if (status.status === 'done') {
            queryClient.invalidateQueries({ queryKey: ['podcast', podcastId] })
          }
        }
      } catch {
        setIngestState('error')
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }, 1000)
  }

  const mainPersonalities = podcastPersonalities.filter((p) => p.role !== 'guest')
  const guestPersonalities = podcastPersonalities.filter((p) => p.role === 'guest')
  const unregistered = allPersonalities.filter(
    (p) => !podcastPersonalities.some((pp) => pp.id === p.id)
  )

  const tagClass = (role: string | null | undefined) =>
    role === 'guest' ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800'

  return (
    <div className="max-w-2xl">
      <Link
        to={`/podcasts/${podcastId}`}
        className="text-blue-600 hover:underline mb-6 inline-block text-sm"
      >
        ← {podcast?.title ?? 'Podcast'} に戻る
      </Link>

      <h2 className="text-2xl font-bold mb-8">エピソード追加</h2>

      <section className="mb-8">
        <h3 className="text-base font-semibold text-gray-900 mb-4">出演者</h3>

        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">メイン</p>
          <div className="flex flex-wrap gap-2 min-h-8">
            {mainPersonalities.map((p) => (
              <span
                key={p.id}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${tagClass(p.role)}`}
              >
                {p.name}
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(p.id)}
                  disabled={ingestState === 'running'}
                  className="ml-1 opacity-50 hover:opacity-100 disabled:opacity-30"
                >
                  ×
                </button>
              </span>
            ))}
            {mainPersonalities.length === 0 && (
              <span className="text-sm text-gray-400">未設定</span>
            )}
          </div>
        </div>

        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">ゲスト</p>
          <div className="flex flex-wrap gap-2 min-h-8">
            {guestPersonalities.map((p) => (
              <span
                key={p.id}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${tagClass(p.role)}`}
              >
                {p.name}
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(p.id)}
                  disabled={ingestState === 'running'}
                  className="ml-1 opacity-50 hover:opacity-100 disabled:opacity-30"
                >
                  ×
                </button>
              </span>
            ))}
            {guestPersonalities.length === 0 && <span className="text-sm text-gray-400">なし</span>}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={ingestState === 'running' || unregistered.length === 0}
            className="flex-1 border rounded px-3 py-1.5 text-sm text-gray-600 disabled:opacity-50"
          >
            <option value="">パーソナリティを選択...</option>
            {unregistered.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => selectedId && addMutation.mutate(Number(selectedId))}
            disabled={!selectedId || addMutation.isPending || ingestState === 'running'}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            追加
          </button>
        </div>

        {addError && <p className="text-xs text-red-500 mt-2">{addError}</p>}
        <p className="text-xs text-gray-400 mt-3">
          リストにいない場合は{' '}
          <Link to="/personalities" className="text-indigo-500 hover:underline">
            パーソナリティ一覧
          </Link>{' '}
          から先に登録してください
        </p>
        <p className="text-xs text-gray-400 mt-1">
          出演者を確定してから文字起こしすると話者識別の精度が上がります
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-base font-semibold text-gray-900 mb-3">文字起こし</h3>
        <div className="flex gap-2">
          <input
            type="url"
            value={rssUrl}
            onChange={(e) => setRssUrl(e.target.value)}
            placeholder="RSS URL"
            disabled={ingestState === 'running'}
            className="flex-1 border rounded px-3 py-2 text-sm disabled:opacity-50"
          />
          <button
            type="button"
            disabled={ingestState === 'running' || !rssUrl.trim()}
            onClick={handleIngest}
            className="px-5 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {ingestState === 'running' ? '処理中...' : '開始'}
          </button>
        </div>
        <div className="mt-2 h-5 text-sm">
          {ingestState === 'running' && (
            <span className="text-gray-500">
              {progress.total > 0 ? `${progress.done} / ${progress.total} 件完了` : '準備中...'}
            </span>
          )}
          {ingestState === 'done' && <span className="text-green-600">完了しました</span>}
          {ingestState === 'error' && <span className="text-red-600">エラーが発生しました</span>}
        </div>
      </section>

      <div className="flex justify-end pt-4 border-t">
        <button
          type="button"
          onClick={() => navigate(`/podcasts/${podcastId}`)}
          className="px-5 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-700"
        >
          保存して戻る
        </button>
      </div>
    </div>
  )
}
