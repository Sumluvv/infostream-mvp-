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
  const [selectors, setSelectors] = useState({
    title: '',
    content: '',
    link: '',
    time: ''
  })
  const [detectedCategories, setDetectedCategories] = useState<any[]>([])
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [showCategorySelection, setShowCategorySelection] = useState(false)
  
  // 网页转RSS拖拽功能状态
  const [segGroups, setSegGroups] = useState<any[]>([])
  const [segGroupsLocal, setSegGroupsLocal] = useState<any[]>([])
  const [dragSelectedTitle, setDragSelectedTitle] = useState('')
  const [dragSelectedArticles, setDragSelectedArticles] = useState<any[]>([])
  const [suggestedTitle, setSuggestedTitle] = useState('')
  const [hiddenArticles, setHiddenArticles] = useState<Set<string>>(new Set())
  const [isTitleEditing, setIsTitleEditing] = useState(false)
  const [isCreatingRSS, setIsCreatingRSS] = useState(false)
  const [creationProgress, setCreationProgress] = useState(0)
  
  // 策略选择相关状态
  const [segmentationMode, setSegmentationMode] = useState<'auto' | 'headings' | 'cluster' | 'pattern'>('auto')
  const [showEmptyResult, setShowEmptyResult] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  // const [updatingFeeds, setUpdatingFeeds] = useState<Set<string>>(new Set())

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
      }
    } catch (error) {
      console.error('localStorage error:', error)
    }
  }, [])

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

  // const loadFeeds = async () => {
  //   if (!token) return
  //   
  //   try {
  //     const response = await fetch('/api/feeds', {
  //       headers: {
  //         'Authorization': `Bearer ${token}`
  //       }
  //     })
  //     
  //     if (response.ok) {
  //       const data = await response.json()
  //       setFeeds(data.feeds || data)
  //     }
  //   } catch (error) {
  //     console.error('Failed to load feeds:', error)
  //   }
  // }

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

  // const previewWebpage = async () => {
  //   if (!webpageUrl.trim()) return
  //   
  //   setIsScraping(true)
  //   try {
  //     const response = await fetch('/api/feeds/webpage-preview', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${token}`
  //       },
  //       body: JSON.stringify({ url: webpageUrl })
  //     })
  //     
  //     if (response.ok) {
  //       const data = await response.json()
  //       setScrapedData(data)
  //     } else {
  //       const errorData = await response.json()
  //       setErrorMessage(errorData.message || '网页预览失败')
  //       setShowError(true)
  //     }
  //   } catch (error) {
  //     console.error('Preview error:', error)
  //     setErrorMessage('网络错误，请检查网络连接')
  //     setShowError(true)
  //   } finally {
  //     setIsScraping(false)
  //   }
  // }

  const detectCategories = async (mode?: 'auto' | 'headings' | 'cluster' | 'pattern') => {
    if (!webpageUrl.trim()) return
    
    const selectedMode = mode || segmentationMode
    setIsScraping(true)
    setIsRetrying(false)
    
    // 清空之前的状态
    setSegGroups([])
    setSegGroupsLocal([])
    setScrapedData(null)
    setSuggestedTitle('')
    setShowCategorySelection(false)
    setShowEmptyResult(false)
    
    try {
      // 创建AbortController用于超时控制
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000) // 6秒超时
      
      // 同时获取网页快照和分段信息
      const [snapshotResponse, segmentationResponse] = await Promise.all([
        fetch('/api/feeds/webpage-snapshot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ url: webpageUrl }),
          signal: controller.signal
        }).catch(() => ({ ok: false })), // 快照失败不影响分段
        fetch('/api/feeds/webpage-segmentation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ url: webpageUrl, mode: selectedMode }),
          signal: controller.signal
        })
      ])
      
      clearTimeout(timeoutId)
      
      // 处理快照结果
      if (snapshotResponse.ok) {
        const snapshotData = await snapshotResponse.json()
        setScrapedData(snapshotData)
      }
      
      // 处理分段结果
      if (segmentationResponse.ok) {
        const segmentationData = await segmentationResponse.json()
        const groups = segmentationData.groups || []
        
        if (groups.length > 0) {
          setDetectedCategories(groups)
          setSegGroups(groups)
          setSegGroupsLocal(groups)
          setSuggestedTitle(segmentationData.suggestedTitle || '')
          setShowCategorySelection(true)
          setShowEmptyResult(false)
        } else {
          setShowEmptyResult(true)
          setShowCategorySelection(false)
        }
      } else {
        const errorData = await segmentationResponse.json().catch(() => ({}))
        setErrorMessage(errorData.message || '网页分析失败')
        setShowError(true)
      }
    } catch (error) {
      console.error('Category detection error:', error)
      if (error.name === 'AbortError') {
        setErrorMessage('请求超时，请检查网络连接或稍后重试')
      } else {
        setErrorMessage('网络错误，请检查网络连接')
      }
      setShowError(true)
    } finally {
      setIsScraping(false)
    }
  }

  // 拖拽处理函数
  const handleDragStart = (e: React.DragEvent, type: 'title' | 'article', data: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type, data }))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetType: 'title' | 'articles') => {
    e.preventDefault()
    const data = JSON.parse(e.dataTransfer.getData('application/json'))
    
    if (data.type === 'title' && targetType === 'title') {
      setDragSelectedTitle(data.data)
    } else if (data.type === 'article' && targetType === 'articles') {
      setDragSelectedArticles(prev => [...prev, data.data])
    }
  }

  // 删除文章
  const removeArticle = (articleLink: string) => {
    setDragSelectedArticles(prev => prev.filter(article => article.link !== articleLink))
  }

  // 隐藏文章
  const hideArticle = (articleLink: string) => {
    setHiddenArticles(prev => new Set([...prev, articleLink]))
  }

  // 恢复已删除的文章
  const restoreHiddenArticles = () => {
    setHiddenArticles(new Set())
  }

  // 创建RSS
  const createRSS = async () => {
    if (!dragSelectedTitle && !suggestedTitle) {
      alert('请选择或输入标题')
      return
    }
    
    if (dragSelectedArticles.length === 0) {
      alert('请选择至少一篇文章')
      return
    }

    setIsCreatingRSS(true)
    setCreationProgress(0)

    try {
      // 模拟进度
      const progressInterval = setInterval(() => {
        setCreationProgress(prev => Math.min(prev + 10, 90))
      }, 100)

      const response = await fetch('/api/feeds/webpage-build-rss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          url: webpageUrl,
          titleToken: dragSelectedTitle || suggestedTitle,
          articles: dragSelectedArticles
        })
      })

      clearInterval(progressInterval)
      setCreationProgress(100)

      if (response.ok) {
        const data = await response.json()
        setFeeds(prev => [...prev, { 
          id: data.id, 
          title: data.title, 
          url: webpageUrl,
          groupId: null,
          group: null
        }])
        
        // 重置状态
        setDragSelectedTitle('')
        setDragSelectedArticles([])
        setSuggestedTitle('')
        setSegGroups([])
        setSegGroupsLocal([])
        setHiddenArticles(new Set())
        setShowCategorySelection(false)
        setWebpageUrl('')
        setScrapedData(null)
        
        alert(`成功创建RSS订阅源：${data.title}，包含 ${data.articlesCount} 篇文章`)
      } else {
        const errorData = await response.json()
        setErrorMessage(errorData.message || '创建RSS失败')
        setShowError(true)
      }
    } catch (error) {
      console.error('RSS creation error:', error)
      setErrorMessage('网络错误，请检查网络连接')
      setShowError(true)
    } finally {
      setIsCreatingRSS(false)
      setCreationProgress(0)
    }
  }

  const createCategoryRSS = async () => {
    if (selectedCategories.size === 0) return
    
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
                        baseUrl: webpageUrl,
                        categories: selectedCategoryData.map(cat => ({
                          name: cat.name,
                          url: cat.url,
                          selector: cat.selector,
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

  // const updateWebpageFeed = async (feedId: string) => {
  //   if (!token) return
  //   
  //   setUpdatingFeeds(prev => new Set(prev).add(feedId))
  //   try {
  //     const response = await fetch(`/api/feeds/webpage-update/${feedId}`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${token}`
  //       }
  //     })
  //     
  //     if (response.ok) {
  //       const data = await response.json()
  //       // 重新加载文章列表
  //       await loadItems(feedId)
  //       alert(data.message || '更新成功！')
  //     } else {
  //       const errorData = await response.json()
  //       setErrorMessage(errorData.message || '更新失败')
  //       setShowError(true)
  //     }
  //   } catch (error) {
  //     console.error('Webpage update error:', error)
  //     setErrorMessage('网络错误，请检查网络连接')
  //     setShowError(true)
  //   } finally {
  //     setUpdatingFeeds(prev => {
  //       const newSet = new Set(prev)
  //       newSet.delete(feedId)
  //       return newSet
  //     })
  //   }
  // }

  // const updateAllWebpageFeeds = async () => {
  //   if (!token) return
  //   
  //   setIsScraping(true)
  //   try {
  //     const response = await fetch('/api/feeds/webpage-update-all', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${token}`
  //       }
  //     })
  //     
  //     if (response.ok) {
  //       const data = await response.json()
  //       // 重新加载所有文章
  //       await loadAllItems()
  //       alert(data.message || '批量更新完成！')
  //     } else {
  //       const errorData = await response.json()
  //       setErrorMessage(errorData.message || '批量更新失败')
  //       setShowError(true)
  //     }
  //   } catch (error) {
  //     console.error('Batch update error:', error)
  //     setErrorMessage('网络错误，请检查网络连接')
  //     setShowError(true)
  //   } finally {
  //     setIsScraping(false)
  //   }
  // }

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
          <div className="max-w-[95vw] mx-auto px-6">
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
          <div className="max-w-[95vw] mx-auto px-6 pt-20 pb-32">
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
                      <button className="w-full bg-black text-white py-4 px-6 rounded-2xl font-semibold text-lg hover:bg-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl">
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
        <div className="max-w-[95vw] mx-auto px-6">
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

      <div className="relative z-10 max-w-[95vw] mx-auto px-6 py-8">
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
                  转换网页
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
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => loadItems(feed.id)}
                                className="flex-1 text-left"
                              >
                                <div className="font-medium truncate">{feed.title || '未命名订阅源'}</div>
                                <div className="text-xs text-gray-500 truncate mt-1">{feed.url}</div>
                              </button>
                              <div className="flex items-center space-x-2 ml-2">
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
                                {/* 自动更新标识 */}
                                {feed.type === 'webpage' && (
                                  <div className="p-2 text-green-500" title="网页转RSS - 每20分钟自动更新">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                )}
                                {feed.type === 'rss' && (
                                  <div className="p-2 text-blue-500" title="RSS订阅源 - 每10秒自动更新">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                )}
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
                                  <div className="flex items-center justify-between">
                                    <button
                                      onClick={() => loadItems(feed.id)}
                                      className="flex-1 text-left"
                                    >
                                      <div className="font-medium truncate">{feed.title || '未命名订阅源'}</div>
                                      <div className="text-xs text-gray-500 truncate mt-1">{feed.url}</div>
                                    </button>
                                    <div className="flex items-center space-x-2 ml-2">
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
                  {/* 自动更新状态提示 */}
                  <div className="px-4 py-2 text-sm text-gray-600 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>自动更新已启用</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      RSS: 每10秒 | 网页RSS: 每20分钟
                    </div>
                  </div>
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
                            <div className="flex space-x-2">
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
                              {/* 为网页转RSS的文章添加原始网页链接 */}
                              {item.originalUrl && (
                                <a
                                  href={item.originalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                                >
                                  原始网页
                                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              )}
      </div>
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
                className="flex-1 px-4 py-2 text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
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

      {/* 网页转RSS模态框 */}
      {showWebpageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
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
                  className="p-2 text-white hover:text-gray-300 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-6">
                {/* 网页URL输入 */}
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
                    />
                    <select
                      value={segmentationMode}
                      onChange={(e) => setSegmentationMode(e.target.value as any)}
                      className="px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
                      disabled={isScraping}
                    >
                      <option value="auto">自动</option>
                      <option value="headings">标题归属</option>
                      <option value="cluster">链接聚类</option>
                      <option value="pattern">路径聚合</option>
                    </select>
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
                {scrapedData && (
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-900">网页快照</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {scrapedData.screenshot ? (
                        <div className="relative overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                          <img 
                            src={scrapedData.screenshot} 
                            alt="网页截图" 
                            className="w-full"
                            style={{ maxHeight: '400px', objectFit: 'contain' }}
                          />
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          网页快照正在加载...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 空结果提示 */}
                {showEmptyResult && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <h3 className="text-sm font-medium text-yellow-800">
                          未检测到有效内容
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>当前策略未能识别到文章内容，请尝试其他策略：</p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => detectCategories('headings')}
                            disabled={isScraping}
                            className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 disabled:opacity-50"
                          >
                            标题归属
                          </button>
                          <button
                            onClick={() => detectCategories('cluster')}
                            disabled={isScraping}
                            className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 disabled:opacity-50"
                          >
                            链接聚类
                          </button>
                          <button
                            onClick={() => detectCategories('pattern')}
                            disabled={isScraping}
                            className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 disabled:opacity-50"
                          >
                            路径聚合
                          </button>
                          <button
                            onClick={() => detectCategories('auto')}
                            disabled={isScraping}
                            className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 disabled:opacity-50"
                          >
                            重试
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 智能分类选择 */}
                {showCategorySelection && detectedCategories.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-900">检测到的网站分类</h4>
                    <p className="text-sm text-gray-600">选择您想要订阅的分类，系统将自动为每个分类创建RSS订阅源</p>
                    
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {detectedCategories.map((category, index) => (
                        <div key={index} className="category-item border border-gray-200 rounded-lg">
                          <label className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer">
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
                              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{category.name}</div>
                              <div className="text-xs text-gray-500">
                                {category.articleCount} 篇文章
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                // 切换展开状态
                                const categoryElement = e.currentTarget.closest('.category-item')
                                if (categoryElement) {
                                  const preview = categoryElement.querySelector('.category-preview')
                                  if (preview) {
                                    preview.classList.toggle('hidden')
                                  }
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </label>
                          
                          {/* 文章预览 */}
                          <div className="category-preview hidden px-3 pb-3">
                            <div className="text-xs text-gray-500 mb-2">文章预览:</div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {category.articles && category.articles.slice(0, 5).map((article: any, articleIndex: number) => (
                                <div key={articleIndex} className="text-xs text-gray-600 bg-white p-2 rounded border">
                                  {article.text}
                                </div>
                              ))}
                              {category.articles && category.articles.length > 5 && (
                                <div className="text-xs text-gray-400 text-center">
                                  ... 还有 {category.articles.length - 5} 篇文章
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-sm text-gray-600">
                        已选择 {selectedCategories.size} 个分类
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedCategories(new Set(detectedCategories.map(cat => cat.name)))
                          }}
                          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                          全选
                        </button>
                        <button
                          onClick={() => setSelectedCategories(new Set())}
                          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                          清空
                        </button>
                      </div>
                    </div>
                  </div>
                )}


                {/* 选择器配置 */}
                {scrapedData && !showCategorySelection && (
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-900">配置内容选择器</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">标题选择器 *</label>
                        <input
                          type="text"
                          value={selectors.title}
                          onChange={(e) => setSelectors(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="例如: .news-title, h2, .article-title"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">内容选择器</label>
                        <input
                          type="text"
                          value={selectors.content}
                          onChange={(e) => setSelectors(prev => ({ ...prev, content: e.target.value }))}
                          placeholder="例如: .news-content, .article-body"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">链接选择器</label>
                        <input
                          type="text"
                          value={selectors.link}
                          onChange={(e) => setSelectors(prev => ({ ...prev, link: e.target.value }))}
                          placeholder="例如: a, .news-link"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">时间选择器</label>
                        <input
                          type="text"
                          value={selectors.time}
                          onChange={(e) => setSelectors(prev => ({ ...prev, time: e.target.value }))}
                          placeholder="例如: .publish-time, .date"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
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
                  
                  {showCategorySelection ? (
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
    </div>
  )
}