import { useState, useEffect } from 'react'

export default function App() {
  const [mounted, setMounted] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [feeds, setFeeds] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null)
  const [rssUrl, setRssUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    console.log('App mounted')
    setMounted(true)
    
    try {
      const storedToken = localStorage.getItem('token')
      setToken(storedToken)
      console.log('Token loaded:', storedToken)
      
      if (storedToken) {
        loadFeeds()
      }
    } catch (error) {
      console.error('localStorage error:', error)
    }
  }, [])

  const loadFeeds = async () => {
    try {
      const response = await fetch('/api/feeds', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setFeeds(data)
      }
    } catch (error) {
      console.error('Failed to load feeds:', error)
    }
  }

  const importRSS = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rssUrl.trim()) return
    
    setIsImporting(true)
    setShowError(false)
    
    try {
      const response = await fetch('/api/feeds/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ url: rssUrl })
      })
      
      if (response.ok) {
        const newFeed = await response.json()
        setFeeds(prev => [...prev, newFeed])
        setRssUrl('')
        // 显示成功消息
        alert('RSS 导入成功！')
      } else {
        const errorData = await response.json()
        setErrorMessage(errorData.message || '导入失败，请检查RSS链接是否正确')
        setShowError(true)
      }
    } catch (error) {
      console.error('Import error:', error)
      setErrorMessage('网络错误，请检查网络连接或稍后重试')
      setShowError(true)
    } finally {
      setIsImporting(false)
    }
  }

  const loadItems = async (feedId: string) => {
    try {
      const response = await fetch(`/api/feeds/${feedId}/items`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setItems(data)
        setSelectedFeedId(feedId)
      }
    } catch (error) {
      console.error('Failed to load items:', error)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!token) {
  return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        {/* Apple 风格背景渐变 */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800"></div>
        
        {/* Apple 风格导航栏 - 毛玻璃效果 */}
        <nav 
          className="relative z-50 bg-black/20 border-b border-white/10 sticky top-0" 
          style={{backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)'}}
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-black font-bold text-sm">I</span>
                </div>
                <span className="ml-3 text-lg font-medium text-white">信息流聚合</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Apple 风格 Hero 区域 */}
        <div className="relative z-10">
          <div className="max-w-7xl mx-auto px-6 pt-20 pb-32">
            <div className="text-center">
              <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 tracking-tight">
                个人专属的
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  信息聚合
                </span>
                <br />
                平台
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-12">
                将任意网页转换为 RSS，统一管理你的信息源，让阅读更高效
              </p>
              
              {/* Apple 风格登录卡片 - 毛玻璃效果 */}
              <div className="max-w-md mx-auto">
                <div 
                  className="bg-white/10 border border-white/20 p-8 shadow-2xl" 
                  style={{
                    backdropFilter: 'blur(20px)', 
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '24px'
                  }}
                >
                  <div className="space-y-6">
                    <div className="text-center">
                      <h2 className="text-2xl font-semibold text-white mb-2">开始使用</h2>
                      <p className="text-gray-300">登录或注册账户</p>
                    </div>

                    <form onSubmit={(e) => {
                      e.preventDefault()
                      console.log('Login form submitted')
                      localStorage.setItem('token', 'test-token')
                      setToken('test-token')
                    }} className="space-y-4">
                      <div>
                        <input 
                          name="email" 
                          type="email" 
                          className="w-full px-4 py-4 text-white placeholder-gray-400 bg-white/10 border border-white/20 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200" 
                          placeholder="邮箱地址"
                          required 
                        />
                      </div>
                      <div>
                        <input 
                          name="password" 
                          type="password" 
                          className="w-full px-4 py-4 text-white placeholder-gray-400 bg-white/10 border border-white/20 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200" 
                          placeholder="密码"
                          required 
                        />
                      </div>
                      <button className="w-full bg-white text-black py-4 px-6 rounded-2xl font-semibold text-lg hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl">
                        登录
                      </button>
                    </form>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/20" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-black text-gray-400">或</span>
                      </div>
                    </div>

                    <form onSubmit={(e) => {
                      e.preventDefault()
                      console.log('Signup form submitted')
                      alert('注册成功！请登录')
                    }} className="space-y-4">
                      <div>
                        <input 
                          name="email" 
                          type="email" 
                          className="w-full px-4 py-4 text-white placeholder-gray-400 bg-white/10 border border-white/20 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200" 
                          placeholder="邮箱地址"
                          required 
                        />
                      </div>
      <div>
                        <input 
                          name="password" 
                          type="password" 
                          className="w-full px-4 py-4 text-white placeholder-gray-400 bg-white/10 border border-white/20 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200" 
                          placeholder="至少6位密码"
                          required 
                        />
                      </div>
                      <button className="w-full bg-blue-600 text-white py-4 px-6 rounded-2xl font-semibold text-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                        注册
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Apple 风格背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100"></div>
      
      {/* Apple 风格顶部导航 - 毛玻璃效果 */}
      <nav 
        className="relative z-50 bg-white/80 border-b border-gray-200/50 sticky top-0" 
        style={{backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)'}}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">I</span>
              </div>
              <span className="ml-3 text-lg font-semibold text-gray-900 tracking-tight">信息流聚合</span>
            </div>
            <button 
              onClick={() => { 
                localStorage.removeItem('token')
                setToken(null)
              }}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              退出登录
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* 左侧：功能面板 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 导入 RSS - Apple 风格卡片 - 毛玻璃效果 */}
            <div 
              className="bg-white/80 border border-white/30 p-8 shadow-lg hover:shadow-xl transition-all duration-300" 
              style={{
                backdropFilter: 'blur(25px)', 
                WebkitBackdropFilter: 'blur(25px)',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)'
              }}
            >
              <div className="flex items-center mb-6">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #1e40af 100%)',
                    boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                  }}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold text-gray-900 tracking-tight">导入 RSS</h2>
                  <p className="text-sm text-gray-500 mt-1">添加 RSS 订阅源</p>
                </div>
              </div>
              <form onSubmit={importRSS} className="space-y-5">
                <div>
                  <input 
                    value={rssUrl}
                    onChange={(e) => setRssUrl(e.target.value)}
                    placeholder="https://example.com/rss" 
                    className="w-full px-5 py-4 text-sm border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 focus:bg-white placeholder-gray-400" 
                    required 
                    disabled={isImporting}
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isImporting}
                  className="w-full bg-blue-600 text-white py-4 px-6 rounded-2xl font-semibold text-sm hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting ? '导入中...' : '导入订阅源'}
                </button>
              </form>
            </div>

            {/* 网页转 RSS - Apple 风格卡片 - 毛玻璃效果 */}
            <div 
              className="bg-white/80 border border-white/30 p-8 shadow-lg hover:shadow-xl transition-all duration-300" 
              style={{
                backdropFilter: 'blur(25px)', 
                WebkitBackdropFilter: 'blur(25px)',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)'
              }}
            >
              <div className="flex items-center mb-6">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 30%, #ec4899 70%, #f43f5e 100%)',
                    boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                  }}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold text-gray-900 tracking-tight">网页转 RSS</h2>
                  <p className="text-sm text-gray-500 mt-1">将任意网页转换为 RSS</p>
                </div>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault()
                alert('网页转 RSS 功能')
              }} className="space-y-5">
                <div>
                  <input 
                    placeholder="https://example.com/news" 
                    className="w-full px-5 py-4 text-sm border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/50 focus:bg-white placeholder-gray-400" 
                    required 
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-purple-600 text-white py-4 px-6 rounded-2xl font-semibold text-sm hover:bg-purple-700 transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
                >
                  预览网页
                </button>
              </form>
            </div>

            {/* 订阅源列表 - Apple 风格卡片 - 毛玻璃效果 */}
            <div 
              className="bg-white/80 border border-white/30 p-8 shadow-lg hover:shadow-xl transition-all duration-300" 
              style={{
                backdropFilter: 'blur(25px)', 
                WebkitBackdropFilter: 'blur(25px)',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)'
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 30%, #047857 70%, #065f46 100%)',
                      boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                    }}
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h2 className="text-xl font-semibold text-gray-900 tracking-tight">订阅源</h2>
                    <p className="text-sm text-gray-500 mt-1">管理你的信息源</p>
                  </div>
                </div>
                <span className="px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">                        
                  {feeds.length}
                </span>
              </div>
              <div className="space-y-2">
                {feeds.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">              
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">                
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">                  
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />               
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-700">暂无订阅源</p>                      
                    <p className="text-xs text-gray-400 mt-2">导入 RSS 链接开始使用</p>                    
                  </div>
                ) : (
                  feeds.map(feed => (
                    <button
                      key={feed.id}
                      onClick={() => loadItems(feed.id)}
                      className={`w-full text-left p-4 rounded-2xl text-sm transition-all duration-200 ${
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

          {/* 右侧：文章列表 - Apple 风格 - 毛玻璃效果 */}
          <div className="lg:col-span-3">
            <div 
              className="bg-white/80 border border-white/30 shadow-lg hover:shadow-xl transition-all duration-300" 
              style={{
                backdropFilter: 'blur(25px)', 
                WebkitBackdropFilter: 'blur(25px)',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)'
              }}
            >
              <div className="p-8 border-b border-gray-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">文章列表</h2>
                    <p className="text-sm text-gray-500 mt-1">浏览最新内容</p>
                  </div>
                </div>
              </div>
              <div className="max-h-[700px] overflow-y-auto">                
                {items.length === 0 ? (
                  <div className="text-center py-24">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-3xl flex items-center justify-center">              
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">              
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />                     
                      </svg>                         
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">选择订阅源</h3>             
                    <p className="text-gray-500 text-lg">点击左侧订阅源查看文章列表</p>                  
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

      {/* 错误弹窗 */}
      {showError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">导入失败</h3>
            </div>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowError(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                关闭
              </button>
              <button
                onClick={() => {
                  setShowError(false)
                  setRssUrl('')
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}