import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { deleteAudioSample, fetchPersonality, updatePersonality, uploadAudioSample } from '../api'

export default function PersonalityDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const { data: personality, isLoading } = useQuery({
    queryKey: ['personality', id],
    queryFn: () => fetchPersonality(id ?? ''),
    enabled: !!id
  })

  const updateMutation = useMutation({
    mutationFn: () => updatePersonality(id ?? '', { name: editName, description: editDesc }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personality', id] })
      setIsEditing(false)
    }
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAudioSample(id ?? '', file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['personality', id] })
  })

  const deleteSampleMutation = useMutation({
    mutationFn: (sampleId: number) => deleteAudioSample(id ?? '', sampleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['personality', id] })
  })

  if (isLoading) return <div className="text-center py-8">読み込み中...</div>
  if (!personality) return <div className="text-center py-8 text-red-500">見つかりませんでした</div>

  const handleEditStart = () => {
    setEditName(personality.name)
    setEditDesc(personality.description ?? '')
    setIsEditing(true)
  }

  return (
    <div>
      <Link to="/personalities" className="text-blue-600 hover:underline mb-4 inline-block">
        ← パーソナリティ一覧に戻る
      </Link>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        {isEditing ? (
          <div>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-2 text-xl font-bold"
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="特徴・説明（任意）"
              className="w-full border rounded px-3 py-2 mb-3 h-20 resize-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{personality.name}</h2>
              {personality.description && (
                <p className="text-gray-600 mt-1">{personality.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleEditStart}
              className="text-sm text-indigo-600 hover:underline"
            >
              編集
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">声サンプル</h3>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {uploadMutation.isPending ? 'アップロード中...' : '+ サンプルを追加'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) uploadMutation.mutate(file)
              e.target.value = ''
            }}
          />
        </div>

        {personality.audioSamples.length === 0 ? (
          <p className="text-sm text-gray-500">
            サンプルなし（登録すると文字起こし時の話者識別精度が向上します）
          </p>
        ) : (
          <ul className="space-y-2">
            {personality.audioSamples.map((sample) => (
              <li key={sample.id} className="flex items-center gap-3 p-3 border rounded">
                {/* biome-ignore lint/a11y/useMediaCaption: 音声サンプルはキャプション不要 */}
                <audio controls src={sample.storageUrl} className="flex-1 h-8" />
                <button
                  type="button"
                  onClick={() => deleteSampleMutation.mutate(sample.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
