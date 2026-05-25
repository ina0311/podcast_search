import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createPersonality, fetchPersonalities } from '../api'

export default function PersonalityList() {
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [showForm, setShowForm] = useState(false)

  const { data: personalities = [], isLoading } = useQuery({
    queryKey: ['personalities'],
    queryFn: fetchPersonalities
  })

  const createMutation = useMutation({
    mutationFn: () => createPersonality({ name: newName, description: newDesc || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personalities'] })
      setNewName('')
      setNewDesc('')
      setShowForm(false)
    }
  })

  if (isLoading) return <div className="text-center py-8">読み込み中...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">パーソナリティ一覧</h2>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          + 新規追加
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="font-semibold mb-3">新しいパーソナリティ</h3>
          <input
            type="text"
            placeholder="名前（必須）"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full border rounded px-3 py-2 mb-2"
          />
          <textarea
            placeholder="特徴・説明（任意）例: ホスト。低めのトーンで話す"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full border rounded px-3 py-2 mb-3 h-20 resize-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!newName || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              作成
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {personalities.map((p) => (
          <Link
            key={p.id}
            to={`/personalities/${p.publicId}`}
            className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">{p.name}</span>
              <span className="text-xs text-gray-500">{p.audioSamples.length} サンプル</span>
            </div>
            {p.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-1">{p.description}</p>
            )}
          </Link>
        ))}
        {personalities.length === 0 && (
          <p className="text-center text-gray-500 py-8">パーソナリティが登録されていません</p>
        )}
      </div>
    </div>
  )
}
