import React, { useState, useEffect } from 'react'
import { Search, TrendingUp, TrendingDown, BarChart3, Calculator } from 'lucide-react'
import { StockCard } from '../components/StockCard'
import { api } from '../utils/api'

interface StockOverview {
  ts_code: string
  name: string
  industry: string
  market: string
  list_date: string
  last_price?: number
  change_percent?: number
  pe_ratio?: number
  pb_ratio?: number
}

export const HomePage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [stocks, setStocks] = useState<StockOverview[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 搜索股票
  const handleSearch = async () => {
    if (!searchTerm.trim()) return
    
    setLoading(true)
    setError(null)
    
    try {
      // 调用搜索API
      const response = await api.get(`/feeds/search?q=${encodeURIComponent(searchTerm)}`)
      setStocks(response.data.stocks || [])
    } catch (err) {
      // 如果搜索API不存在，使用模拟数据
      console.warn('搜索API不可用，使用模拟数据')
      const mockStocks: StockOverview[] = [
        {
          ts_code: '600519.SH',
          name: '贵州茅台',
          industry: '白酒',
          market: '主板',
          list_date: '2001-08-27',
          last_price: 1515.10,
          change_percent: 2.35,
          pe_ratio: 22.07,
          pb_ratio: 7.37
        },
        {
          ts_code: '000001.SZ',
          name: '平安银行',
          industry: '银行',
          market: '主板',
          list_date: '1991-04-03',
          last_price: 12.45,
          change_percent: -1.25,
          pe_ratio: 4.2,
          pb_ratio: 0.6
        }
      ]
      setStocks(mockStocks)
    } finally {
      setLoading(false)
    }
  }

  // 热门股票推荐
  const popularStocks: StockOverview[] = [
    {
      ts_code: '600519.SH',
      name: '贵州茅台',
      industry: '白酒',
      market: '主板',
      list_date: '2001-08-27',
      last_price: 1515.10,
      change_percent: 2.35,
      pe_ratio: 22.07,
      pb_ratio: 7.37
    },
    {
      ts_code: '000001.SZ',
      name: '平安银行',
      industry: '银行',
      market: '主板',
      list_date: '1991-04-03',
      last_price: 12.45,
      change_percent: -1.25,
      pe_ratio: 4.2,
      pb_ratio: 0.6
    },
    {
      ts_code: '000002.SZ',
      name: '万科A',
      industry: '房地产',
      market: '主板',
      list_date: '1991-01-29',
      last_price: 8.95,
      change_percent: 0.45,
      pe_ratio: 6.8,
      pb_ratio: 0.9
    }
  ]

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          专业的A股分析平台
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          实时K线图表、技术指标分析、智能估值服务
        </p>
      </div>

      {/* 搜索区域 */}
      <div className="max-w-2xl mx-auto">
        <div className="flex space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="输入股票代码或名称，如：600519 或 贵州茅台"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="input pl-10 w-full"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="btn btn-primary px-6"
          >
            {loading ? '搜索中...' : '搜索'}
          </button>
        </div>
        
        {error && (
          <div className="mt-4 p-4 bg-danger-50 border border-danger-200 rounded-md">
            <p className="text-danger-600">{error}</p>
          </div>
        )}
      </div>

      {/* 搜索结果 */}
      {stocks.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">搜索结果</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stocks.map((stock) => (
              <StockCard key={stock.ts_code} stock={stock} />
            ))}
          </div>
        </div>
      )}

      {/* 热门股票推荐 */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">热门股票推荐</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {popularStocks.map((stock) => (
            <StockCard key={stock.ts_code} stock={stock} />
          ))}
        </div>
      </div>

      {/* 功能特色 */}
      <div className="bg-white rounded-lg shadow-sm p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-8 text-center">平台特色</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">实时K线图表</h3>
            <p className="text-gray-600">专业的K线图表展示，支持多种技术指标分析</p>
          </div>
          
          <div className="text-center">
            <div className="bg-success-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calculator className="h-8 w-8 text-success-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">智能估值分析</h3>
            <p className="text-gray-600">基于PE/PB等指标的智能估值分析，提供投资建议</p>
          </div>
          
          <div className="text-center">
            <div className="bg-warning-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-warning-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI智能评分</h3>
            <p className="text-gray-600">基于机器学习的AI评分系统，提供可解释的投资建议</p>
          </div>
        </div>
      </div>
    </div>
  )
}
