import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { NavLink, Route, Routes } from 'react-router-dom'
import EpisodeDetail from './pages/EpisodeDetail'
import EpisodeList from './pages/EpisodeList'
import PodcastDetail from './pages/PodcastDetail'
import PodcastList from './pages/PodcastList'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1
    }
  }
})

function Home() {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Podcast Search Admin</h2>
      <p className="text-gray-600 mb-8">Podcast と Episode のデータを管理できます。</p>
      <div className="flex justify-center gap-4">
        <NavLink
          to="/podcasts"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Podcast 一覧
        </NavLink>
        <NavLink
          to="/episodes"
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Episode 一覧
        </NavLink>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <NavLink to="/" className="text-xl font-bold text-gray-900">
                🎙️ Podcast Search
              </NavLink>
              <nav className="flex gap-6">
                <NavLink
                  to="/podcasts"
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors ${
                      isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                    }`
                  }
                >
                  Podcasts
                </NavLink>
                <NavLink
                  to="/episodes"
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors ${
                      isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                    }`
                  }
                >
                  Episodes
                </NavLink>
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/podcasts" element={<PodcastList />} />
            <Route path="/podcasts/:id" element={<PodcastDetail />} />
            <Route path="/episodes" element={<EpisodeList />} />
            <Route path="/episodes/:id" element={<EpisodeDetail />} />
          </Routes>
        </main>
      </div>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
