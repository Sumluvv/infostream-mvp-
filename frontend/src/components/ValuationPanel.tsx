import React, { useState, useEffect } from 'react'
import { Calculator, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react'
import { api } from '../utils/api'

interface ValuationData {
  ts_code: string
  as_of_date: string
  method: string
  current_price: number
  financials: {
    eps: number
    bps: number
    roe: number
    revenue: number
    net_profit: number
    latest_period: string
  }
  valuation: {
    pe_ratio: number
    pb_ratio: number
    pe_implied_price: number
    pb_implied_price: number
  }
  analysis: {
    pe_analysis: string
    pb_analysis: string
    overall_assessment: string
  }
  created_at: string
}

interface ValuationPanelProps {
  tsCode: string
}

export const ValuationPanel: React.FC<ValuationPanelProps> = ({ tsCode }) => {
  const [valuation, setValuation] = useState<ValuationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchValuation = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await api.get(`/valuation/${tsCode}`)
        setValuation(response.data)
      } catch (err) {
        setError('获取估值数据失败')
        console.error('Error fetching valuation:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchValuation()
  }, [tsCode])

  const getAssessmentColor = (assessment: string) => {
    if (assessment.includes('合理') || assessment.includes('值得关注')) {
      return 'text-success-600 bg-success-50'
    }
    if (assessment.includes('偏高') || assessment.includes('谨慎')) {
      return 'text-warning-600 bg-warning-50'
    }
    if (assessment.includes('过高') || assessment.includes('风险')) {
      return 'text-danger-600 bg-danger-50'
    }
    return 'text-gray-600 bg-gray-50'
  }

  const getAssessmentIcon = (assessment: string) => {
    if (assessment.includes('合理') || assessment.includes('值得关注')) {
      return <CheckCircle className="h-4 w-4" />
    }
    if (assessment.includes('偏高') || assessment.includes('谨慎')) {
      return <AlertTriangle className="h-4 w-4" />
    }
    if (assessment.includes('过高') || assessment.includes('风险')) {
      return <TrendingDown className="h-4 w-4" />
    }
    return <TrendingUp className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-primary-600" />
            <h2 className="card-title">估值分析</h2>
          </div>
        </div>
        <div className="card-content">
          <div className="flex items-center justify-center h-32">
            <div className="loading-spinner"></div>
            <span className="ml-3 text-gray-600">加载中...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !valuation) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-primary-600" />
            <h2 className="card-title">估值分析</h2>
          </div>
        </div>
        <div className="card-content">
          <div className="text-center text-gray-500 py-8">
            <p>{error || '暂无估值数据'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 估值分析卡片 */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-primary-600" />
            <h2 className="card-title">估值分析</h2>
          </div>
        </div>
        <div className="card-content space-y-4">
          {/* 当前价格 */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">当前价格</span>
            <span className="text-lg font-semibold">¥{valuation.current_price.toFixed(2)}</span>
          </div>

          {/* PE/PB比率 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">PE比率</div>
              <div className="text-xl font-bold text-primary-600">
                {valuation.valuation.pe_ratio.toFixed(2)}
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">PB比率</div>
              <div className="text-xl font-bold text-primary-600">
                {valuation.valuation.pb_ratio.toFixed(2)}
              </div>
            </div>
          </div>

          {/* 财务数据 */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900">财务数据</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">EPS</span>
                <span className="font-medium">{valuation.financials.eps.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">BPS</span>
                <span className="font-medium">{valuation.financials.bps.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ROE</span>
                <span className="font-medium">{valuation.financials.roe.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">营收</span>
                <span className="font-medium">{(valuation.financials.revenue / 100000000).toFixed(1)}亿</span>
              </div>
            </div>
          </div>

          {/* 分析结果 */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">分析结果</h4>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">PE分析:</span>
                <span className="text-sm">{valuation.analysis.pe_analysis}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">PB分析:</span>
                <span className="text-sm">{valuation.analysis.pb_analysis}</span>
              </div>
            </div>

            {/* 综合评估 */}
            <div className={`p-3 rounded-lg ${getAssessmentColor(valuation.analysis.overall_assessment)}`}>
              <div className="flex items-center space-x-2">
                {getAssessmentIcon(valuation.analysis.overall_assessment)}
                <span className="font-medium">综合评估</span>
              </div>
              <p className="text-sm mt-1">{valuation.analysis.overall_assessment}</p>
            </div>
          </div>

          {/* 更新时间 */}
          <div className="text-xs text-gray-500 text-center">
            更新时间: {new Date(valuation.created_at).toLocaleString()}
          </div>
        </div>
      </div>

      {/* 估值历史 */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title text-lg">估值历史</h3>
        </div>
        <div className="card-content">
          <div className="text-center text-gray-500 py-4">
            <p>估值历史功能开发中...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
