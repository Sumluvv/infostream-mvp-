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
  const [webpageUrl, setWebpageUrl] = useState('')
  const [showWebpageConverter, setShowWebpageConverter] = useState(false)
  const [webpagePreview, setWebpagePreview] = useState<any>(null)
  const [selectors, setSelectors] = useState({
    title: 'h1, h2, h3',
    content: 'p',
    link: 'a',
    time: 'time, .date, .published'
  })

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
    
    const res = await fetch('/api/feeds', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (data?.feeds) {
      setFeeds(data.feeds)
    }
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

  const previewWebpage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!token) return alert('请先登录')
    
    const res = await fetch('/api/feeds/webpage-preview', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ url: webpageUrl }),
    })
    const data = await res.json()
    if (data?.title) {
      setWebpagePreview(data)
      setShowWebpageConverter(true)
    } else {
      alert('预览失败')
    }
  }

  const convertWebpageToRSS = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!token) return alert('请先登录')
    
    const res = await fetch('/api/feeds/webpage-to-rss', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ url: webpageUrl, selectors }),
    })
    const data = await res.json()
    if (data?.id) {
      alert('网页转 RSS 成功！')
      setWebpageUrl('')
      setShowWebpageConverter(false)
      loadFeeds()
    } else {
      alert('转换失败')
    }
  }

  useEffect(() => {
    if (token) {
      loadFeeds()
    }
  }, [token])

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">信息流聚合</h1>
            <p className="text-gray-600">个人专属的信息聚合平台</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button className="py-2 px-4 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300">
                登录
              </button>
              <button className="py-2 px-4 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300">
                注册
              </button>
            </div>

            <form onSubmit={login} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <input 
                  name="email" 
                  type="email" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" 
                  placeholder="输入邮箱地址"
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                <input 
                  name="password" 
                  type="password" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" 
                  placeholder="输入密码"
                  required 
                />
              </div>
              <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                登录
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">或</span>
              </div>
            </div>

            <form onSubmit={signup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <input 
                  name="email" 
                  type="email" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" 
                  placeholder="输入邮箱地址"
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                <input 
                  name="password" 
                  type="password" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" 
                  placeholder="至少6位密码"
                  required 
                />
              </div>
              <button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                注册
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 顶部导航 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">信息流聚合</h1>
              <span className="ml-3 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                MVP
              </span>
            </div>
            <button 
              onClick={() => { localStorage.removeItem('token'); setToken(null) }}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              退出登录
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* 左侧：导入 RSS */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h2 className="ml-3 text-lg font-semibold text-gray-900">导入 RSS</h2>
              </div>
              <form onSubmit={importRSS} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">RSS 链接</label>
                  <input 
                    value={rssUrl}
                    onChange={(e) => setRssUrl(e.target.value)}
                    placeholder="https://example.com/rss" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" 
                    required 
                  />
                </div>
                <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                  导入订阅源
                </button>
              </form>
            </div>

            {/* 网页转 RSS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
                <h2 className="ml-3 text-lg font-semibold text-gray-900">网页转 RSS</h2>
              </div>
              <form onSubmit={previewWebpage} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">网页链接</label>
                  <input 
                    value={webpageUrl}
                    onChange={(e) => setWebpageUrl(e.target.value)}
                    placeholder="https://example.com/news" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors" 
                    required 
                  />
                </div>
                <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                  预览网页
                </button>
              </form>
            </div>

            {/* 订阅源列表 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h2 className="ml-3 text-lg font-semibold text-gray-900">订阅源</h2>
                <span className="ml-auto px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                  {feeds.length}
                </span>
              </div>
              <div className="space-y-2">
                {feeds.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="text-sm">暂无订阅源</p>
                    <p className="text-xs text-gray-400">导入 RSS 链接开始使用</p>
                  </div>
                ) : (
                  feeds.map(feed => (
                    <button
                      key={feed.id}
                      onClick={() => loadItems(feed.id)}
                      className={`w-full text-left p-3 rounded-lg text-sm transition-all duration-200 ${
                        selectedFeedId === feed.id 
                          ? 'bg-blue-50 border border-blue-200 text-blue-900' 
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="font-medium truncate">{feed.title || '未命名订阅源'}</div>
                      <div className="text-xs text-gray-500 truncate mt-1">{feed.url}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 右侧：文章列表 */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">文章列表</h2>
                  {selectedFeedId && (
                    <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                      {items.length} 篇文章
                    </span>
                  )}
                </div>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="text-center py-16">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">选择订阅源</h3>
                    <p className="text-gray-500">点击左侧订阅源查看文章列表</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {items.map(item => (
                      <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-medium text-gray-900 mb-2 line-clamp-2">
                              {item.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                              {item.content}
                            </p>
                            <div className="flex items-center text-xs text-gray-500">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {new Date(item.published).toLocaleDateString('zh-CN', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                          {item.link && (
                            <a 
                              href={item.link} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="ml-4 flex-shrink-0 inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              阅读原文
                              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
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

      {/* 网页转换器弹窗 */}
      {showWebpageConverter && webpagePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">网页转 RSS 配置</h3>
                <button 
                  onClick={() => setShowWebpageConverter(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                网页: <span className="font-medium">{webpagePreview.title}</span>
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* 页面预览 */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">页面元素预览</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-700">标题元素:</span>
                    <div className="mt-1 space-y-1">
                      {webpagePreview.headings?.slice(0, 5).map((h: any, i: number) => (
                        <div key={i} className="text-sm text-gray-600 bg-white p-2 rounded border">
                          <span className="font-mono text-xs text-gray-500">{h.tag}</span> {h.text}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">链接元素:</span>
                    <div className="mt-1 space-y-1">
                      {webpagePreview.links?.slice(0, 3).map((link: any, i: number) => (
                        <div key={i} className="text-sm text-gray-600 bg-white p-2 rounded border">
                          {link.text} → <span className="text-blue-600">{link.href}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 选择器配置 */}
              <form onSubmit={convertWebpageToRSS} className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900">CSS 选择器配置</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">标题选择器</label>
                    <input 
                      value={selectors.title}
                      onChange={(e) => setSelectors({...selectors, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="h1, h2, h3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">内容选择器</label>
                    <input 
                      value={selectors.content}
                      onChange={(e) => setSelectors({...selectors, content: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="p, .content"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">链接选择器</label>
                    <input 
                      value={selectors.link}
                      onChange={(e) => setSelectors({...selectors, link: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="a"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">时间选择器</label>
                    <input 
                      value={selectors.time}
                      onChange={(e) => setSelectors({...selectors, time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="time, .date"
                    />
                  </div>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowWebpageConverter(false)}
                    className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    转换为 RSS
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
