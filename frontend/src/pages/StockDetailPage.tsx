import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, TrendingUp, TrendingDown, Calculator, BarChart3 } from 'lucide-react'
import { KLineChart } from '../components/KLineChart'
import { ValuationPanel } from '../components/ValuationPanel'
import { TechnicalIndicators } from '../components/TechnicalIndicators'
import DCFPanel from '../components/DCFPanel'
import { AIScorePanel } from '../components/AIScorePanel'
import { api } from '../utils/api'

interface StockDetail {
  ts_code: string
  name: string
  industry: string
  market: string
  list_date: string
  last_price: number
  change_percent: number
  pe_ratio?: number
  pb_ratio?: number
  eps?: number
  bps?: number
  roe?: number
}

export const StockDetailPage: React.FC = () => {
  const { tsCode } = useParams<{ tsCode: string }>()
  const [stock, setStock] = useState<StockDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tsCode) return
    
    const fetchStockDetail = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // 获取股票概览信息
        const overviewResponse = await api.get(`/feeds/overview/${tsCode}`)
        const overview = overviewResponse.data
        
        // 获取估值信息
        let valuation = null
        try {
          const valuationResponse = await api.get(`/valuation/${tsCode}`)
          valuation = valuationResponse.data
        } catch (err) {
          console.warn('估值数据获取失败:', err)
        }
        
        // 合并数据
        const stockDetail: StockDetail = {
          ts_code: overview.basic?.ts_code || tsCode,
          name: overview.basic?.name || '未知股票',
          industry: overview.basic?.industry || '未知行业',
          market: overview.basic?.market || '未知市场',
          list_date: overview.basic?.list_date || '',
          last_price: overview.last_price?.close || 0,
          change_percent: overview.last_price?.change_percent || 0,
          pe_ratio: valuation?.valuation?.pe_ratio,
          pb_ratio: valuation?.valuation?.pb_ratio,
          eps: valuation?.financials?.eps,
          bps: valuation?.financials?.bps,
          roe: valuation?.financials?.roe,
        }
        
        setStock(stockDetail)
      } catch (err) {
        setError('获取股票信息失败')
        console.error('Error fetching stock detail:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStockDetail()
  }, [tsCode])

  const formatPrice = (price: number) => {
    return price.toFixed(2)
  }

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : ''
    return `${sign}${percent.toFixed(2)}%`
  }

  const getPriceColor = (percent: number) => {
    if (percent > 0) return 'price-up'
    if (percent < 0) return 'price-down'
    return 'price-neutral'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="loading-spinner"></div>
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    )
  }

  if (error || !stock) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-lg">{error || '股票信息不存在'}</p>
        <button 
          onClick={() => window.history.back()}
          className="btn btn-outline mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <button 
        onClick={() => window.history.back()}
        className="btn btn-ghost"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回
      </button>

      {/* 股票基本信息 */}
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="card-title text-3xl">{stock.name}</h1>
              <p className="text-lg text-gray-600">{stock.ts_code}</p>
              <p className="text-sm text-gray-500">{stock.industry} · {stock.market}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                ¥{formatPrice(stock.last_price)}
              </div>
              <div className={`flex items-center justify-end space-x-2 ${getPriceColor(stock.change_percent)}`}>
                {stock.change_percent >= 0 ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
                <span className="text-lg font-semibold">
                  {formatPercent(stock.change_percent)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* K线图表 */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-primary-600" />
                <h2 className="card-title">K线图表</h2>
              </div>
            </div>
            <div className="card-content">
              <KLineChart tsCode={tsCode!} />
            </div>
          </div>
        </div>

        {/* 估值信息 */}
        <div className="space-y-6">
          <ValuationPanel tsCode={tsCode!} />
          <AIScorePanel tsCode={tsCode!} />
        </div>
      </div>

      {/* DCF估值分析 */}
      <DCFPanel tsCode={tsCode!} />

      {/* 技术指标 */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">技术指标</h2>
        </div>
        <div className="card-content">
          <TechnicalIndicators tsCode={tsCode!} />
        </div>
      </div>
    </div>
  )
}
