import { useState, useEffect } from 'react'

interface Feed {
  id: string
  title: string
  url: string
}

interface Item {
  id: string
  title: string
  link: string
  content: string
  published: string
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [selectedFeedId, setSelectedFeedId] = useState<string>('')
  const [rssUrl, setRssUrl] = useState('')

  const signup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email') || '')
    const password = String(form.get('password') || '')
    await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    alert('注册成功，去登录')
  }

  const login = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email') || '')
    const password = String(form.get('password') || '')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (data?.token) {
      localStorage.setItem('token', data.token)
      setToken(data.token)
      alert('登录成功')
    } else {
      alert('登录失败')
    }
  }

  const importRSS = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!token) return alert('请先登录')
    
    const res = await fetch('/api/feeds/import', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ url: rssUrl }),
    })
    const data = await res.json()
    if (data?.id) {
      alert('RSS 导入成功！')
      setRssUrl('')
      // 刷新订阅源列表
      loadFeeds()
    } else {
      alert('导入失败')
    }
  }

  const loadFeeds = async () => {
    if (!token) return
    // 这里应该调用获取用户订阅源的 API，暂时用模拟数据
    setFeeds([{ id: 'cmfe5p8ii0001je6l2et6mcyt', title: 'Hacker News', url: 'https://hnrss.org/frontpage' }])
  }

  const loadItems = async (feedId: string) => {
    if (!token) return
    
    const res = await fetch(`/api/feeds/${feedId}/items`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (data?.items) {
      setItems(data.items)
      setSelectedFeedId(feedId)
    }
  }

  useEffect(() => {
    if (token) {
      loadFeeds()
    }
  }, [token])

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-xl w-full p-6 space-y-6">
          <h1 className="text-2xl font-bold">个人信息流聚合 MVP</h1>
          <div className="grid md:grid-cols-2 gap-6">
            <form onSubmit={signup} className="space-y-3 p-4 rounded-lg border bg-white">
              <h2 className="font-semibold">注册</h2>
              <input name="email" placeholder="邮箱" type="email" className="w-full border rounded px-3 py-2" required />
              <input name="password" placeholder="密码（≥6位）" type="password" className="w-full border rounded px-3 py-2" required />
              <button className="w-full bg-black text-white rounded px-3 py-2">注册</button>
            </form>
            <form onSubmit={login} className="space-y-3 p-4 rounded-lg border bg-white">
              <h2 className="font-semibold">登录</h2>
              <input name="email" placeholder="邮箱" type="email" className="w-full border rounded px-3 py-2" required />
              <input name="password" placeholder="密码" type="password" className="w-full border rounded px-3 py-2" required />
              <button className="w-full bg-black text-white rounded px-3 py-2">登录</button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">个人信息流聚合</h1>
          <button 
            onClick={() => { localStorage.removeItem('token'); setToken(null) }}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            退出登录
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* 左侧：导入 RSS */}
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border">
              <h2 className="font-semibold mb-3">导入 RSS</h2>
              <form onSubmit={importRSS} className="space-y-3">
                <input 
                  value={rssUrl}
                  onChange={(e) => setRssUrl(e.target.value)}
                  placeholder="RSS 链接" 
                  className="w-full border rounded px-3 py-2" 
                  required 
                />
                <button className="w-full bg-blue-600 text-white rounded px-3 py-2">导入</button>
              </form>
            </div>

            {/* 订阅源列表 */}
            <div className="bg-white p-4 rounded-lg border">
              <h2 className="font-semibold mb-3">订阅源</h2>
              <div className="space-y-2">
                {feeds.map(feed => (
                  <button
                    key={feed.id}
                    onClick={() => loadItems(feed.id)}
                    className={`w-full text-left p-2 rounded text-sm ${
                      selectedFeedId === feed.id ? 'bg-blue-100' : 'hover:bg-gray-100'
                    }`}
                  >
                    {feed.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：文章列表 */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b">
                <h2 className="font-semibold">文章列表</h2>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="p-4 text-gray-500 text-center">选择订阅源查看文章</div>
                ) : (
                  <div className="divide-y">
                    {items.map(item => (
                      <div key={item.id} className="p-4 hover:bg-gray-50">
                        <h3 className="font-medium text-sm mb-1">{item.title}</h3>
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{item.content}</p>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>{new Date(item.published).toLocaleDateString()}</span>
                          {item.link && (
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              阅读原文
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
