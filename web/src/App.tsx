import { useState, useEffect } from 'react'

export default function App() {
  const [mounted, setMounted] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [feeds, setFeeds] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [rssUrl, setRssUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [newlyCreatedGroups, setNewlyCreatedGroups] = useState<Set<string>>(new Set())
  
  // 网页转RSS相关状态
  const [webpageUrl, setWebpageUrl] = useState('')
  const [showWebpageModal, setShowWebpageModal] = useState(false)
  const [isScraping, setIsScraping] = useState(false)
  const [scrapedData, setScrapedData] = useState<any>(null)
  // 快照缩放/拖动
  const [snapScale, setSnapScale] = useState(1)
  const [snapOffset, setSnapOffset] = useState({ x: 0, y: 0 })
  const [snapDragging, setSnapDragging] = useState(false)
  const [snapDragStart, setSnapDragStart] = useState<{x:number;y:number}|null>(null)
  const [selectors, setSelectors] = useState({
    title: '',
    content: '',
    link: '',
    time: ''
  })
  const [detectedCategories, setDetectedCategories] = useState<any[]>([])
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [showCategorySelection, setShowCategorySelection] = useState(false)
  const [expandedCategoryNames, setExpandedCategoryNames] = useState<Set<string>>(new Set())

  // 新版：分段分组与拖拽替代（用选择勾选实现最小可用）
  const [segGroups, setSegGroups] = useState<any[]>([])
  const [segGroupsLocal, setSegGroupsLocal] = useState<any[]>([])
  const [segExpandedSet, setSegExpandedSet] = useState<Set<number>>(new Set())
  const [selectedSegGroupIdx, setSelectedSegGroupIdx] = useState<number | null>(null)
  const [selectedArticleIdxSet, setSelectedArticleIdxSet] = useState<Set<number>>(new Set())
  // 拖拽版：统一词条池（右侧）+ 左侧上下框
  const [dragSelectedTitle, setDragSelectedTitle] = useState<string | null>(null) // 存 titleToken 文本
  const [dragSelectedArticles, setDragSelectedArticles] = useState<any[]>([])
  // 分段策略模式
  const [segMode, setSegMode] = useState<string>('auto')
  // 建议标题
  const [suggestedTitle, setSuggestedTitle] = useState<string>('')
  // 空结果提示
  const [showEmptyResult, setShowEmptyResult] = useState(false)
  // 创建进度条
  const [creatingProgress, setCreatingProgress] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  // 标题框状态管理
  const [titleInputValue, setTitleInputValue] = useState<string>('')
  const [isTitleInputFocused, setIsTitleInputFocused] = useState(false)
  const [hasTitleBeenEdited, setHasTitleBeenEdited] = useState(false)
  // 网页快照加载状态
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(false)
  // 更新信息
  const [updateInfo, setUpdateInfo] = useState<{
    rssUpdateFrequency: number;
    webpageUpdateFrequency: number;
    lastRSSUpdate: string | null;
    lastWebpageUpdate: string | null;
  } | null>(null)

  useEffect(() => {
    console.log('App mounted')
    setMounted(true)
    
    try {
      const storedToken = localStorage.getItem('token')
      setToken(storedToken)
      console.log('Token loaded:', storedToken)
      
      if (storedToken) {
        loadFeedsWithToken(storedToken)
        loadGroupsWithToken(storedToken)
        loadUpdateInfo()
      }
    } catch (error) {
      console.error('localStorage error:', error)
    }
  }, [])

  // 定时刷新更新信息
  useEffect(() => {
    if (!token) return
    
    const interval = setInterval(() => {
      loadUpdateInfo()
    }, 5000) // 每5秒刷新一次更新信息
    
    return () => clearInterval(interval)
  }, [token])

  const loadFeedsWithToken = async (authToken: string) => {
    try {
      const response = await fetch('/api/feeds', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setFeeds(data.feeds || data)
      }
    } catch (error) {
      console.error('Failed to load feeds:', error)
    }
  }

  const loadGroupsWithToken = async (authToken: string) => {
    try {
      const response = await fetch('/api/feeds/groups', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setGroups(data.groups || data)
      }
    } catch (error) {
      console.error('Failed to load groups:', error)
    }
  }

  const loadFeeds = async () => {
    if (!token) return
    
    try {
      const response = await fetch('/api/feeds', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setFeeds(data.feeds || data)
      }
    } catch (error) {
      console.error('Failed to load feeds:', error)
    }
  }

  const loadUpdateInfo = async () => {
    if (!token) return
    
    try {
      const response = await fetch('/api/feeds/update-info', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUpdateInfo(data)
      }
    } catch (error) {
      console.error('Failed to load update info:', error)
    }
  }

  const importRSS = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rssUrl.trim()) return

    // 检查是否已经导入过这个RSS
    const existingFeed = feeds.find(feed => feed.url === rssUrl.trim())
    if (existingFeed) {
      setErrorMessage('该RSS源已经订阅过了！')
      setShowError(true)
      return
    }

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

        // 自动加载新导入的RSS的文章
        if (newFeed.id) {
          await loadItems(newFeed.id)
        }

        // 显示成功消息
        alert('RSS 导入成功！')
      } else {
        const errorData = await response.json()
        const errorMsg = errorData.message || '导入失败，请检查RSS链接是否正确'
        const suggestion = errorData.suggestion ? `\n\n建议：${errorData.suggestion}` : ''
        setErrorMessage(errorMsg + suggestion)
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
    if (!token) return
    
    try {
      const response = await fetch(`/api/feeds/${feedId}/items`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || data)
        setSelectedFeedId(feedId)
        setSelectedGroupId(null)
      }
    } catch (error) {
      console.error('Failed to load items:', error)
    }
  }

  const loadGroupItems = async (groupId: string) => {
    if (!token) return
    
    try {
      const response = await fetch(`/api/feeds/groups/${groupId}/items`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || data)
        setSelectedGroupId(groupId)
        setSelectedFeedId(null)
      }
    } catch (error) {
      console.error('Failed to load group items:', error)
    }
  }

  const loadAllItems = async () => {
    if (!token) return
    
    try {
      // 先获取最新的feeds数据（包含分组信息）
      const feedsResponse = await fetch('/api/feeds', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!feedsResponse.ok) return
      
      const feedsData = await feedsResponse.json()
      const currentFeeds = feedsData.feeds || feedsData
      
      // 获取所有订阅源的文章
      const allItems = []
      for (const feed of currentFeeds) {
        const response = await fetch(`/api/feeds/${feed.id}/items`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          const items = data.items || data
          // 为每个文章添加feed信息，包括分组信息
          const itemsWithFeed = items.map((item: any) => ({
            ...item,
            feed: {
              id: feed.id,
              title: feed.title,
              group: feed.group || null
            }
          }))
          allItems.push(...itemsWithFeed)
        }
      }
      
      // 按时间排序
      allItems.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())
      
      setItems(allItems)
      setSelectedGroupId(null)
      setSelectedFeedId(null)
    } catch (error) {
      console.error('Failed to load all items:', error)
    }
  }

  const deleteFeed = async (feedId: string) => {
    if (!token) return
    
    try {
      const response = await fetch(`/api/feeds/${feedId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        setFeeds(prev => prev.filter(feed => feed.id !== feedId))
        if (selectedFeedId === feedId) {
          setItems([])
          setSelectedFeedId(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete feed:', error)
    }
  }

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !newGroupName.trim()) return
    
    try {
      const response = await fetch('/api/feeds/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newGroupName.trim() })
      })
      
      if (response.ok) {
        const newGroup = await response.json()
        setGroups(prev => [...prev, newGroup])
        
        // 自动展开新创建的分组
        setExpandedGroups(prev => new Set([...prev, newGroup.id]))
        
        // 标记为新创建的分组
        setNewlyCreatedGroups(prev => new Set([...prev, newGroup.id]))
        
        // 3秒后移除"新建"标记
        setTimeout(() => {
          setNewlyCreatedGroups(prev => {
            const newSet = new Set(prev)
            newSet.delete(newGroup.id)
            return newSet
          })
        }, 3000)
        
        setNewGroupName('')
        setShowGroupModal(false)
      }
    } catch (error) {
      console.error('Failed to create group:', error)
    }
  }

  const updateFeedGroup = async (feedId: string, groupId: string | null) => {
    if (!token) return
    
    try {
      const response = await fetch(`/api/feeds/${feedId}/group`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ groupId })
      })
      
      if (response.ok) {
        setFeeds(prev => prev.map(feed => 
          feed.id === feedId ? { ...feed, groupId } : feed
        ))
      }
    } catch (error) {
      console.error('Failed to update feed group:', error)
    }
  }

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  const deleteGroup = async (groupId: string) => {
    if (!token) return
    
    const group = groups.find(g => g.id === groupId)
    if (!group) return
    
    // 检查分组中是否有订阅源
    const groupFeeds = feeds.filter(feed => feed.groupId === groupId)
    if (groupFeeds.length > 0) {
      if (!confirm(`分组"${group.name}"中还有 ${groupFeeds.length} 个订阅源，确定要删除吗？删除后这些订阅源将变为未分组状态。`)) {
        return
      }
    } else {
      if (!confirm(`确定要删除分组"${group.name}"吗？`)) {
        return
      }
    }
    
    try {
      const response = await fetch(`/api/feeds/groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        // 删除分组
        setGroups(prev => prev.filter(g => g.id !== groupId))
        
        // 将分组中的订阅源设为未分组
        setFeeds(prev => prev.map(feed => 
          feed.groupId === groupId ? { ...feed, groupId: null, group: null } : feed
        ))
        
        // 从展开状态中移除
        setExpandedGroups(prev => {
          const newSet = new Set(prev)
          newSet.delete(groupId)
          return newSet
        })
        
        // 从新建标记中移除
        setNewlyCreatedGroups(prev => {
          const newSet = new Set(prev)
          newSet.delete(groupId)
          return newSet
        })
      }
    } catch (error) {
      console.error('Failed to delete group:', error)
    }
  }

  // 生成默认标题格式
  const generateDefaultTitle = (url: string, title?: string) => {
    try {
      const urlObj = new URL(url)
      const domain = urlObj.hostname
      if (title) {
        return `${domain}/${title}`
      }
      return `${domain}/所选标题`
    } catch {
      return '网站地址/所选标题'
    }
  }

  // 网页转RSS相关函数
  const detectCategories = async (mode?: string) => {
    if (!webpageUrl.trim()) return
    
    setIsScraping(true)
    // 清空之前的状态
    setSegGroups([])
    setSegGroupsLocal([])
    setScrapedData(null)
    setSuggestedTitle('')
    setShowCategorySelection(false)
    // 重置标题框状态
    setTitleInputValue('')
    setHasTitleBeenEdited(false)
    setIsTitleInputFocused(false)
    // 重置快照加载状态
    setIsSnapshotLoading(false)
    
    try {
      // 1) 先拿分段结果，立即展示
      const segResp = await fetch('/api/feeds/webpage-segmentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url: webpageUrl, mode: mode || segMode })
      })
      if (segResp.ok) {
        const segData = await segResp.json()
        const groups = segData.groups || []
        setSegGroups(groups)
        setSegGroupsLocal(groups.map((g: any) => ({ ...g, articles: [...(g.articles || [])] })))
        setSegExpandedSet(new Set())
        setSelectedSegGroupIdx(null)
        setSelectedArticleIdxSet(new Set())
        setSuggestedTitle(segData.suggestedTitle || '')
        setShowCategorySelection(true)
        
        // 设置默认标题格式
        const defaultTitle = generateDefaultTitle(webpageUrl, segData.suggestedTitle)
        setTitleInputValue(defaultTitle)
        
        // 如果没有结果，显示空结果提示
        if (groups.length === 0) {
          setShowEmptyResult(true)
        } else {
          setShowEmptyResult(false)
        }
      } else {
        // 分段失败，尝试回退到"智能分类"接口
        try {
          const catResp = await fetch('/api/feeds/webpage-categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ url: webpageUrl })
          })
          if (catResp.ok) {
            const catData = await catResp.json()
            const mapped = (catData.categories || []).map((c: any) => ({
              titleToken: c.name,
              heading: c.name,
              articles: (c.articles || [])
            }))
            setSegGroups(mapped)
            setSegGroupsLocal(mapped.map((g: any) => ({ ...g, articles: [...(g.articles || [])] })))
            setShowCategorySelection(true)
          }
        } catch {}
      }

      // 3) 再异步拉快照，不阻塞分组显示
      setIsSnapshotLoading(true)
      fetch('/api/feeds/webpage-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url: webpageUrl })
      }).then(async r => {
        if (r.ok) {
          const d = await r.json()
          setScrapedData(d)
        }
      }).catch(() => {}).finally(() => {
        setIsSnapshotLoading(false)
      })
    } catch (error) {
      console.error('Category detection error:', error)
      setErrorMessage('网络错误，请检查网络连接')
      setShowError(true)
    } finally {
      setIsScraping(false)
    }
  }

  // 新版：根据选择构建 RSS
  const buildFromSegSelection = async () => {
    if (!token) return
    if (selectedSegGroupIdx === null) {
      alert('请先选择一个标题词条组')
      return
    }
    const group = segGroups[selectedSegGroupIdx]
    const chosen = group?.articles || []
    const filtered = chosen.filter((_: any, idx: number) => selectedArticleIdxSet.size === 0 || selectedArticleIdxSet.has(idx))
    if (filtered.length === 0) {
      alert('请至少选择一篇文章')
      return
    }
    try {
      setIsScraping(true)
      const resp = await fetch('/api/feeds/webpage-build-rss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          url: webpageUrl,
          titleToken: group.titleToken || group.heading || '未命名',
          articles: filtered.map((a: any) => ({ title: a.title || a.text || '无标题', link: a.link, pubDate: a.pubDate }))
        })
      })
      if (resp.ok) {
        const data = await resp.json()
        setFeeds(prev => [...prev, { id: data.id, title: data.title, url: webpageUrl, groupId: null, group: null }])
        setShowWebpageModal(false)
        setShowCategorySelection(false)
        setWebpageUrl('')
        setSegGroups([])
        setSelectedSegGroupIdx(null)
        setSelectedArticleIdxSet(new Set())
        setScrapedData(null)
        alert('RSS 创建成功！')
      } else {
        const err = await resp.json().catch(() => ({}))
        setErrorMessage(err.message || '创建失败')
        setShowError(true)
      }
    } catch (e) {
      setErrorMessage('网络错误，请稍后重试')
      setShowError(true)
    } finally {
      setIsScraping(false)
    }
  }

  const createCategoryRSS = async () => {
    if (!token || selectedCategories.size === 0) return
    
    setIsScraping(true)
    try {
      const selectedCategoryData = detectedCategories.filter(cat => 
        selectedCategories.has(cat.name)
      )
      
      const response = await fetch('/api/feeds/webpage-categories-rss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          url: webpageUrl,
          categories: selectedCategoryData.map(cat => ({
            name: cat.name,
            articles: cat.articles || []
          }))
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setFeeds(prev => [...prev, ...data.feeds])
        
        // 关闭模态框并重置状态
        setShowWebpageModal(false)
        setShowCategorySelection(false)
        setWebpageUrl('')
        setDetectedCategories([])
        setSelectedCategories(new Set())
        setScrapedData(null)
        
        alert(`成功创建 ${data.feeds.length} 个分类RSS订阅源！`)
      } else {
        const errorData = await response.json()
        setErrorMessage(errorData.message || '创建分类RSS失败')
        setShowError(true)
      }
    } catch (error) {
      console.error('Category RSS creation error:', error)
      setErrorMessage('网络错误，请检查网络连接')
      setShowError(true)
    } finally {
      setIsScraping(false)
    }
  }

  const createWebpageRSS = async () => {
    if (!webpageUrl.trim() || !selectors.title.trim()) return
    
    setIsScraping(true)
    try {
      const response = await fetch('/api/feeds/webpage-to-rss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          url: webpageUrl,
          selectors: {
            title: selectors.title,
            content: selectors.content,
            link: selectors.link,
            time: selectors.time
          }
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setFeeds(prev => [...prev, { 
          id: data.id, 
          title: `网页抓取: ${new URL(webpageUrl).hostname}`,
          url: webpageUrl,
          groupId: null,
          group: null
        }])
        
        // 关闭模态框并重置状态
        setShowWebpageModal(false)
        setWebpageUrl('')
        setSelectors({ title: '', content: '', link: '', time: '' })
        setScrapedData(null)
        
        alert('网页转RSS成功！')
      } else {
        const errorData = await response.json()
        setErrorMessage(errorData.message || '网页转RSS失败')
        setShowError(true)
      }
    } catch (error) {
      console.error('Webpage to RSS error:', error)
      setErrorMessage('网络错误，请检查网络连接')
      setShowError(true)
    } finally {
      setIsScraping(false)
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

                    <form onSubmit={async (e) => {
                      e.preventDefault()
                      const form = e.target as HTMLFormElement
                      const email = (form.elements.namedItem('email') as HTMLInputElement).value
                      const password = (form.elements.namedItem('password') as HTMLInputElement).value
                      try {
                        const resp = await fetch('/api/auth/login', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email, password })
                        })
                        if (!resp.ok) {
                          const err = await resp.json().catch(() => ({} as any))
                          alert(err.message || '登录失败')
                          return
                        }
                        const data = await resp.json()
                        localStorage.setItem('token', data.token)
                        setToken(data.token)
                        loadFeedsWithToken(data.token)
                        loadGroupsWithToken(data.token)
                      } catch (err) {
                        alert('网络错误，请稍后重试')
                      }
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

                    <form onSubmit={async (e) => {
                      e.preventDefault()
                      const form = e.target as HTMLFormElement
                      const email = (form.elements.namedItem('email') as HTMLInputElement).value
                      const password = (form.elements.namedItem('password') as HTMLInputElement).value
                      try {
                        const resp = await fetch('/api/auth/signup', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email, password })
                        })
                        if (!resp.ok) {
                          const err = await resp.json().catch(() => ({} as any))
                          alert(err.error || '注册失败')
                          return
                        }
                        // 注册成功后自动登录
                        const loginResp = await fetch('/api/auth/login', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email, password })
                        })
                        if (loginResp.ok) {
                          const data = await loginResp.json()
                          localStorage.setItem('token', data.token)
                          setToken(data.token)
                          loadFeedsWithToken(data.token)
                          loadGroupsWithToken(data.token)
                        } else {
                          alert('注册成功，但自动登录失败，请手动登录')
                        }
                      } catch (err) {
                        alert('网络错误，请稍后重试')
                      }
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
                const target = e.target as HTMLFormElement
                setWebpageUrl((target.elements.namedItem('url') as HTMLInputElement).value)
                setShowWebpageModal(true)
              }} className="space-y-5">
                <div>
                  <input 
                    name="url"
                    placeholder="https://example.com/news" 
                    className="w-full px-5 py-4 text-sm border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/50 focus:bg-white placeholder-gray-400" 
                    required 
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-purple-600 text-white py-4 px-6 rounded-2xl font-semibold text-sm hover:bg-purple-700 transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
                >
                  智能分类
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
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowGroupModal(true)}
                    className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                  >
                    + 新建分组
                  </button>
                  <span className="px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">                        
                    {feeds.length}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
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
                  <>
                    {/* 无分组的订阅源 */}
                    {feeds.filter(feed => !feed.groupId).length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-700 px-2">未分组</h3>
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                            {feeds.filter(feed => !feed.groupId).length}
                          </span>
                        </div>
                        {feeds.filter(feed => !feed.groupId).map(feed => (
                          <div
                            key={feed.id}
                            className={`w-full p-4 rounded-2xl text-sm transition-all duration-200 ${
                              selectedFeedId === feed.id 
                                ? 'bg-blue-50 border border-blue-200 text-blue-900' 
                                : 'hover:bg-gray-50 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center">
                              <button
                                onClick={() => loadItems(feed.id)}
                                className="flex-1 text-left min-w-0 mr-3"
                              >
                                <div className="font-medium truncate">{feed.title || '未命名订阅源'}</div>
                                <div className="text-xs text-gray-500 truncate mt-1">{feed.url}</div>
                              </button>
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <div className="relative">
                                  <select
                                    value={feed.groupId || ''}
                                    onChange={(e) => updateFeedGroup(feed.id, e.target.value || null)}
                                    className="appearance-none text-xs px-3 py-2 pr-8 border border-gray-200 rounded-xl bg-white/80 hover:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      backdropFilter: 'blur(10px)',
                                      WebkitBackdropFilter: 'blur(10px)'
                                    }}
                                  >
                                    <option value="">📁 选择分组</option>
                                    {groups.map(group => (
                                      <option key={group.id} value={group.id}>
                                        📁 {group.name}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (confirm('确定要删除这个订阅源吗？')) {
                                      deleteFeed(feed.id)
                                    }
                                  }}
                                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 分组的订阅源 - 按创建时间排序，最新的在前 */}
                    {groups
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map(group => {
                      const groupFeeds = feeds.filter(feed => feed.groupId === group.id)
                      // 移除这个条件，让所有分组都显示，即使没有订阅源
                      
                      const isExpanded = expandedGroups.has(group.id)
                      
                      return (
                        <div key={group.id} className="space-y-2">
                          <button
                            onClick={() => toggleGroupExpansion(group.id)}
                            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 group"
                          >
                            <div className="flex items-center space-x-3">
                              <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                                style={{
                                  backgroundColor: `${group.color}20`,
                                  color: group.color
                                }}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                </svg>
                              </div>
                              <div className="text-left">
                                <div className="flex items-center space-x-2">
                                  <span className="font-semibold text-gray-900 text-sm">{group.name}</span>
                                  {newlyCreatedGroups.has(group.id) && (
                                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full animate-pulse">
                                      新建
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">{groupFeeds.length} 个订阅源</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                {groupFeeds.length}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteGroup(group.id)
                                }}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                                title="删除分组"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                              <svg 
                                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180' : ''
                                }`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </button>
                          
                          {isExpanded && (
                            <div className="ml-4 space-y-2">
                              {groupFeeds.map(feed => (
                                <div
                                  key={feed.id}
                                  className={`w-full p-4 rounded-2xl text-sm transition-all duration-200 ${
                                    selectedFeedId === feed.id 
                                      ? 'bg-blue-50 border border-blue-200 text-blue-900' 
                                      : 'hover:bg-gray-50 border border-transparent'
                                  }`}
                                >
                                  <div className="flex items-center">
                                    <button
                                      onClick={() => loadItems(feed.id)}
                                      className="flex-1 text-left min-w-0 mr-3"
                                    >
                                      <div className="font-medium truncate">{feed.title || '未命名订阅源'}</div>
                                      <div className="text-xs text-gray-500 truncate mt-1">{feed.url}</div>
                                    </button>
                                    <div className="flex items-center space-x-2 flex-shrink-0">
                                      <div className="relative">
                                        <select
                                          value={feed.groupId || ''}
                                          onChange={(e) => updateFeedGroup(feed.id, e.target.value || null)}
                                          className="appearance-none text-xs px-3 py-2 pr-8 border border-gray-200 rounded-xl bg-white/80 hover:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                                          onClick={(e) => e.stopPropagation()}
                                          style={{
                                            backdropFilter: 'blur(10px)',
                                            WebkitBackdropFilter: 'blur(10px)'
                                          }}
                                        >
                                          <option value="">📁 选择分组</option>
                                          {groups.map(g => (
                                            <option key={g.id} value={g.id}>
                                              📁 {g.name}
                                            </option>
                                          ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                          </svg>
                                        </div>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (confirm('确定要删除这个订阅源吗？')) {
                                            deleteFeed(feed.id)
                                          }
                                        }}
                                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </>
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
                <div className="flex items-center justify-between mb-4">          
      <div>
                    <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">文章列表</h2>  
                    <p className="text-sm text-gray-500 mt-1">浏览最新内容</p>                         
      </div>
                  {updateInfo && (
                    <div className="text-right text-sm text-gray-500">
                      <div className="space-y-1">
                        <div>RSS更新: 每{updateInfo.rssUpdateFrequency}秒</div>
                        <div>网页RSS更新: 每{updateInfo.webpageUpdateFrequency}分钟</div>
                        {updateInfo.lastRSSUpdate && (
                          <div className="text-xs">
                            最后RSS更新: {new Date(updateInfo.lastRSSUpdate).toLocaleTimeString()}
                          </div>
                        )}
                        {updateInfo.lastWebpageUpdate && (
                          <div className="text-xs">
                            最后网页更新: {new Date(updateInfo.lastWebpageUpdate).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 分组选择器 */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={loadAllItems}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      !selectedGroupId && !selectedFeedId
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    全部
        </button>
                  {groups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => loadGroupItems(group.id)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        selectedGroupId === group.id
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      📁 {group.name}
        </button>
                  ))}
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
                              {item.feed?.title && (
                                <span className="ml-2 text-blue-600">
                                  • {item.feed.title}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="ml-4 flex-shrink-0 flex flex-col items-end space-y-2">
                            {item.link && (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                阅读原文
                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            )}
                            {/* 只在"全部"视图中显示分组标签，具体分组视图中隐藏 */}
                            {!selectedGroupId && item.feed?.group && (
                              <span 
                                className="px-2 py-1 text-xs font-medium rounded-full"
                                style={{ 
                                  backgroundColor: `${item.feed.group.color}20`,
                                  color: item.feed.group.color 
                                }}
                              >
                                📁 {item.feed.group.name}
                              </span>
                            )}
                          </div>
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

      {/* 网页转RSS模态框 */}
      {showWebpageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">网页转RSS</h3>
                </div>
                <button
                  onClick={() => {
                    setShowWebpageModal(false)
                    setWebpageUrl('')
                    setSelectors({ title: '', content: '', link: '', time: '' })
                    setScrapedData(null)
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">网页地址</label>
                  <div className="flex space-x-3">
                    <input
                      type="url"
                      value={webpageUrl}
                      onChange={(e) => setWebpageUrl(e.target.value)}
                      placeholder="https://example.com/news"
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                      readOnly
                    />
                    {/* 策略选择器 */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">策略模式:</label>
                      <select
                        value={segMode}
                        onChange={(e) => setSegMode(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white pr-8"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.5rem center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '1.5em 1.5em'
                        }}
                      >
                        <option value="auto">自动（推荐）</option>
                        <option value="headings">标题归属 - 适合有清晰标题结构的页面</option>
                        <option value="cluster">链接聚类 - 适合列表页面或链接密集的页面</option>
                        <option value="pattern">路径聚合 - 适合URL结构规整的网站</option>
                      </select>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => detectCategories()}
                      disabled={!webpageUrl.trim() || isScraping}
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      {isScraping ? '检测中...' : '智能分类'}
                    </button>
                  </div>
                </div>

                {/* 网页快照 */}
                {(scrapedData || isSnapshotLoading) && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700">网页快照</h4>
                    <div
                      className="border border-gray-200 rounded-lg overflow-hidden relative select-none"
                      onWheel={(e)=>{
                        e.preventDefault()
                        const delta = e.deltaY > 0 ? -0.1 : 0.1
                        setSnapScale(s=>Math.min(3, Math.max(0.2, Number((s+delta).toFixed(2)))))
                      }}
                      onMouseDown={(e)=>{
                        setSnapDragging(true)
                        setSnapDragStart({ x: e.clientX - snapOffset.x, y: e.clientY - snapOffset.y })
                      }}
                      onMouseMove={(e)=>{
                        if(!snapDragging || !snapDragStart) return
                        setSnapOffset({ x: e.clientX - snapDragStart.x, y: e.clientY - snapDragStart.y })
                      }}
                      onMouseUp={()=> setSnapDragging(false)}
                      onMouseLeave={()=> setSnapDragging(false)}
                      style={{ height: 400, cursor: snapDragging ? 'grabbing' : 'grab' }}
                    >
                      {isSnapshotLoading ? (
                        <div className="flex items-center justify-center h-full bg-gray-50">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
                            <p className="text-sm text-gray-600">网页快照正在加载...</p>
                          </div>
                        </div>
                      ) : scrapedData ? (
                        <>
                          <div
                            style={{
                              transform: `translate(${snapOffset.x}px, ${snapOffset.y}px) scale(${snapScale})`,
                              transformOrigin: '0 0'
                            }}
                          >
                            <img src={scrapedData.screenshot} alt="网页快照" draggable={false} />
                          </div>
                          <div className="absolute bottom-2 right-2 flex items-center space-x-2 bg-white/80 border rounded px-2 py-1">
                            <button className="px-2 text-sm" onClick={()=>setSnapScale(s=>Math.max(0.2, Number((s-0.1).toFixed(2))))}>-</button>
                            <span className="text-xs w-10 text-center">{Math.round(snapScale*100)}%</span>
                            <button className="px-2 text-sm" onClick={()=>setSnapScale(s=>Math.min(3, Number((s+0.1).toFixed(2))))}>+</button>
                            <button className="px-2 text-xs" onClick={()=>{setSnapScale(1); setSnapOffset({x:0,y:0})}}>重置</button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* 新版：分段选择（标题词条 + 文章词条） */}
                {/* 空结果提示 */}
                {showEmptyResult && segGroups.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-gray-500 mb-4">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">未找到可分段的内容</h3>
                    <p className="text-gray-600 mb-4">当前策略无法识别此页面的文章结构，请尝试其他策略模式</p>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => detectCategories('headings')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        尝试标题归属
                      </button>
                      <button
                        onClick={() => detectCategories('cluster')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        尝试链接聚类
                      </button>
                      <button
                        onClick={() => detectCategories('pattern')}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        尝试路径聚合
                      </button>
                    </div>
                  </div>
                )}

                {showCategorySelection && segGroups.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700">拖拽选择：左侧上框拖入1个标题词条，下框拖入多篇文章词条</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[600px]">
                      {/* 左：上下两个拖入框 */}
                      <div className="md:col-span-1 flex flex-col h-full">
                        <div
                          onDragOver={(e)=>e.preventDefault()}
                          onDrop={(e)=>{
                            e.preventDefault()
                            const type = e.dataTransfer.getData('type')
                            const payload = e.dataTransfer.getData('payload')
                            if(type==='title'){
                              setDragSelectedTitle(payload)
                              // 更新输入框值为网站地址/拖入的标题
                              const newTitle = generateDefaultTitle(webpageUrl, payload)
                              setTitleInputValue(newTitle)
                              setHasTitleBeenEdited(true)
                            }
                          }}
                          className="border-2 border-purple-400 rounded-lg p-3 bg-purple-50/40 mb-3"
                        >
                          <div className="text-xs text-gray-700 font-medium mb-2">标题词条（拖入或编辑）</div>
                          <input
                            type="text"
                            value={titleInputValue}
                            onChange={(e) => {
                              setTitleInputValue(e.target.value)
                              setHasTitleBeenEdited(true)
                            }}
                            onFocus={() => {
                              setIsTitleInputFocused(true)
                              if (!hasTitleBeenEdited) {
                                // 首次点击时，显示网站地址/格式
                                const baseTitle = generateDefaultTitle(webpageUrl)
                                setTitleInputValue(baseTitle)
                              }
                            }}
                            onBlur={() => setIsTitleInputFocused(false)}
                            placeholder={hasTitleBeenEdited ? "" : generateDefaultTitle(webpageUrl)}
                            className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                              !hasTitleBeenEdited && !isTitleInputFocused ? 'text-gray-400' : 'text-gray-900'
                            }`}
                          />
                        </div>
                        <div
                          onDragOver={(e)=>e.preventDefault()}
                          onDrop={(e)=>{
                            e.preventDefault()
                            const type = e.dataTransfer.getData('type')
                            const payload = e.dataTransfer.getData('payload')
                            if(type==='article'){
                              try{
                                const art = JSON.parse(payload)
                                setDragSelectedArticles(prev=>{
                                  if(prev.find(x=>x.link===art.link)) return prev
                                  return [...prev, art]
                                })
                              }catch{}
                            } else if (type==='group') {
                              try {
                                const data = JSON.parse(payload)
                                const gi = data.groupIndex
                                const groupArts = segGroupsLocal[gi]?.articles || []
                                setDragSelectedArticles(prev => {
                                  const exist = new Set(prev.map(x=>x.link))
                                  const merged = [...prev]
                                  for (const a of groupArts) {
                                    if (a.link && !exist.has(a.link)) merged.push(a)
                                  }
                                  return merged
                                })
                              } catch {}
                            }
                          }}
                          className="border-2 border-purple-400 rounded-lg p-3 flex-1 bg-purple-50/30 flex flex-col"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs text-gray-700 font-medium">
                              文章内容（可多个）
                              {dragSelectedArticles.length > 0 && (
                                <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-medium">
                                  {dragSelectedArticles.length} 篇
                                </span>
                              )}
                            </div>
                            <button className="text-[11px] text-gray-600" onClick={()=>setDragSelectedArticles([])}>清空</button>
                          </div>
                          <div className="space-y-1 flex-1 overflow-auto">
                            {dragSelectedArticles.map((a,i)=> (
                              <div key={i} className="text-xs bg-gray-50 p-2 rounded border flex items-center justify-between">
                                <span className="flex-1 break-words">{a.title || a.text || a.link}</span>
                                <button 
                                  className="text-gray-400 hover:text-red-500 transition-colors p-1 ml-2 flex-shrink-0"
                                  title="删除此文章"
                                  onClick={() => setDragSelectedArticles(prev => prev.filter((_, idx) => idx !== i))}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      {/* 右：统一候选池（标题 + 文章组） */}
                      <div className="md:col-span-2 border border-gray-200 rounded-lg p-3 flex flex-col h-full">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0">
                          <div className="flex flex-col">
                            <div className="text-xs text-gray-700 font-medium mb-2">标题词条（可拖动到左上框）</div>
                            <div className="space-y-2 flex-1 overflow-auto">
                              {segGroupsLocal.map((g, idx) => (
                                <div
                                  key={idx}
                                  draggable
                                  onDragStart={(e)=>{
                                    e.dataTransfer.setData('type','title')
                                    e.dataTransfer.setData('payload', g.titleToken || g.heading || '未命名')
                                  }}
                                  className="text-xs px-3 py-2 rounded border bg-purple-50 cursor-move"
                                  title="拖拽到左上框作为标题"
                                >
                                  {g.titleToken || g.heading}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs text-gray-700 font-medium">文章词条（可拖拽整组到左下框）</div>
                              <div className="flex items-center space-x-2">
                                <button className="text-[11px] text-gray-600" onClick={()=>{
                                  const all = segGroupsLocal.flatMap(g=>g.articles||[])
                                  setDragSelectedArticles(prev=>{
                                    const exist = new Set(prev.map(x=>x.link))
                                    const merged = [...prev]
                                    for(const a of all){ if(a.link && !exist.has(a.link)) merged.push(a) }
                                    return merged
                                  })
                                }}>全选</button>
                                <button className="text-[11px] text-gray-600" onClick={()=>setDragSelectedArticles([])}>清空</button>
                              </div>
                            </div>
                            <div className="space-y-3 flex-1 overflow-auto">
                              {segGroupsLocal.map((g, gi) => {
                                const expanded = segExpandedSet.has(gi)
                                const articles = g.articles || []
                                const preview = articles[0]
                                return (
                                  <div key={gi} className="border rounded-lg">
                                    <div className="flex items-center px-2 py-2 bg-gray-50 border-b">
                                      <div className="text-xs font-medium flex-1 truncate mr-3">{g.titleToken || g.heading}</div>
                                      <div className="flex items-center space-x-2 flex-shrink-0">
                                        <span className="text-[11px] text-gray-500">{articles.length} 篇</span>
                                        <button className="text-[11px] text-purple-600" onClick={()=>{
                                          setSegExpandedSet(prev=>{
                                            const next = new Set(prev)
                                            if(next.has(gi)) next.delete(gi); else next.add(gi)
                                            return next
                                          })
                                        }}>{expanded?'收起':'展开'}</button>
                                        <div
                                          draggable
                                          onDragStart={(e)=>{
                                            e.dataTransfer.setData('type','group')
                                            e.dataTransfer.setData('payload', JSON.stringify({ groupIndex: gi }))
                                          }}
                                          className="text-[11px] text-blue-600 cursor-move"
                                          title="拖拽整组到左下框"
                                        >拖整组</div>
                                      </div>
                                    </div>
                                    <div className="p-2">
                                      {expanded && (
                                        <div className="space-y-1">
                                          {articles.map((a:any, ai:number) => (
                                            <div
                                              key={ai}
                                              draggable
                                              onDragStart={(e)=>{
                                                e.dataTransfer.setData('type','article')
                                                e.dataTransfer.setData('payload', JSON.stringify(a))
                                              }}
                                              className="text-xs bg-gray-50 p-2 rounded border cursor-move flex items-center justify-between"
                                              title="拖拽到左下框或其他组"
                                            >
                                              <span className="truncate mr-2">{a.title || a.text || a.link}</span>
                                              <button 
                                                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                title="删除此文章"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  // 从当前分组中删除文章
                                                  setSegGroupsLocal(prev => 
                                                    prev.map((group, groupIndex) => 
                                                      groupIndex === gi 
                                                        ? {
                                                            ...group,
                                                            articles: group.articles?.filter((article: any) => article.link !== a.link) || []
                                                          }
                                                        : group
                                                    )
                                                  )
                                                  // 同时从左侧已选择的文章中删除
                                                  setDragSelectedArticles(prev => 
                                                    prev.filter(article => article.link !== a.link)
                                                  )
                                                }}
                                              >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 旧版：智能分类（保留以兼容） */}
                {showCategorySelection && detectedCategories.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700">选择要创建RSS的分类</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {detectedCategories.map((category, index) => {
                        const isExpanded = expandedCategoryNames.has(category.name)
                        const total = category.articles ? category.articles.length : 0
                        const list = category.articles ? (isExpanded ? category.articles : category.articles.slice(0, 3)) : []
                        return (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={selectedCategories.has(category.name)}
                                  onChange={(e) => {
                                    const newSelected = new Set(selectedCategories)
                                    if (e.target.checked) {
                                      newSelected.add(category.name)
                                    } else {
                                      newSelected.delete(category.name)
                                    }
                                    setSelectedCategories(newSelected)
                                  }}
                                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-sm font-medium text-gray-900">{category.name}</span>
                              </label>
                              <div className="flex items-center space-x-3">
                                <span className="text-xs text-gray-500">
                                  {total} 篇文章
                                </span>
                                {total > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = new Set(expandedCategoryNames)
                                      if (next.has(category.name)) next.delete(category.name)
                                      else next.add(category.name)
                                      setExpandedCategoryNames(next)
                                    }}
                                    className="text-xs text-purple-600 hover:text-purple-700"
                                  >
                                    {isExpanded ? '收起' : '展开'}
                                  </button>
                                )}
                              </div>
                            </div>
                            {list && list.map((article: any, articleIndex: number) => (
                              <div key={articleIndex} className="text-xs text-gray-700 bg-gray-50 p-2 rounded border mb-1">
                                {article.title || article.text || article.link}
                              </div>
                            ))}
                            {total > 3 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = new Set(expandedCategoryNames)
                                  if (next.has(category.name)) next.delete(category.name)
                                  else next.add(category.name)
                                  setExpandedCategoryNames(next)
                                }}
                                className="text-[11px] text-purple-600 mt-1 hover:text-purple-700"
                              >
                                {isExpanded ? '收起' : '展开可查看全部'}
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          const allNames = detectedCategories.map(cat => cat.name)
                          setSelectedCategories(new Set(allNames))
                        }}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        全选
                      </button>
                      <button
                        onClick={() => setSelectedCategories(new Set())}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        全不选
                      </button>
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowWebpageModal(false)
                      setShowCategorySelection(false)
                      setWebpageUrl('')
                      setSelectors({ title: '', content: '', link: '', time: '' })
                      setScrapedData(null)
                      setDetectedCategories([])
                      setSelectedCategories(new Set())
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                  
                  {showCategorySelection && segGroups.length>0 ? (
                    <button
                      onClick={async ()=>{
                        if (!token) return
                        if (!titleInputValue.trim()) { alert('请输入标题'); return }
                        const validArticles = dragSelectedArticles.filter(a=>a && a.link)
                        if (validArticles.length===0) { alert('请拖入至少一篇带链接的文章词条'); return }
                        try{
                          setIsScraping(true)
                          setIsCreating(true)
                          setCreatingProgress(10)
                          const timer = setInterval(()=>{
                            setCreatingProgress(p=> (p<90? p+5 : p))
                          }, 200)
                          const resp = await fetch('/api/feeds/webpage-build-rss', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({
                              url: webpageUrl,
                              titleToken: titleInputValue,
                              articles: validArticles.map((a:any)=>({ title: a.title || a.text || '无标题', link: a.link, pubDate: a.pubDate }))
                            })
                          })
                          if(resp.ok){
                            setCreatingProgress(100)
                            const data = await resp.json()
                            setFeeds(prev => [...prev, { id: data.id, title: data.title, url: webpageUrl, groupId: null, group: null }])
                            setShowWebpageModal(false)
                            setShowCategorySelection(false)
                            setWebpageUrl('')
                            setSegGroups([])
                            setDragSelectedTitle(null)
                            setDragSelectedArticles([])
                            setScrapedData(null)
                            setTitleInputValue('')
                            setHasTitleBeenEdited(false)
                            setIsTitleInputFocused(false)
                            alert('RSS 创建成功！')
                          } else {
                            const errText = await resp.text().catch(()=> '')
                            let msg = '创建失败'
                            try { const j = JSON.parse(errText); msg = j.message || msg } catch {}
                            setErrorMessage(msg)
                            setShowError(true)
                          }
                          setTimeout(()=>{ setIsCreating(false); setCreatingProgress(0) }, 400)
                          
                          
                        } finally {
                          setIsScraping(false)
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isCreating ? (
                        <span className="w-full inline-flex items-center">
                          <span className="mr-2">创建中</span>
                          <span className="flex-1 h-2 bg-white/20 rounded overflow-hidden">
                            <span className="h-2 bg-white block transition-all" style={{ width: `${creatingProgress}%` }}></span>
                          </span>
                        </span>
                      ) : '根据选择创建RSS'}
                    </button>
                  ) : showCategorySelection ? (
                    <button
                      onClick={createCategoryRSS}
                      disabled={selectedCategories.size === 0 || isScraping}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isScraping ? '创建中...' : `创建 ${selectedCategories.size} 个分类RSS`}
                    </button>
                  ) : (
                    <button
                      onClick={createWebpageRSS}
                      disabled={!webpageUrl.trim() || !selectors.title.trim() || isScraping}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isScraping ? '创建中...' : '创建RSS订阅源'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* 创建分组弹窗 */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">创建新分组</h3>
            </div>
            <form onSubmit={createGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">分组名称</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="例如：科技新闻、财经资讯"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowGroupModal(false)
                    setNewGroupName('')
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  创建分组
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}