import React, { useEffect, useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { api } from '../utils/api'

interface KLineData {
  date: string
  open: number
  close: number
  high: number
  low: number
  volume: number
}

interface TechnicalIndicator {
  date: string
  ma5?: number
  ma10?: number
  ma20?: number
  ma60?: number
  macd?: number
  macd_signal?: number
  macd_histogram?: number
  rsi?: number
  boll_upper?: number
  boll_middle?: number
  boll_lower?: number
}

interface KLineChartProps {
  tsCode: string
}

export const KLineChart: React.FC<KLineChartProps> = ({ tsCode }) => {
  const [klineData, setKlineData] = useState<KLineData[]>([])
  const [indicators, setIndicators] = useState<TechnicalIndicator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // 后端返回: { ts_code, freq, prices, indicators }
        const resp = await api.get(`/feeds/kline/${tsCode}`)
        const payload = resp.data || {}

        const rawPrices = payload.prices || payload.data?.prices || []
        const rawIndicators = payload.indicators || payload.data?.indicators || []

        const mappedPrices: KLineData[] = rawPrices.map((p: any) => ({
          date: (p.trade_date || p.date || '').toString().slice(0, 10),
          open: Number(p.open ?? 0),
          close: Number(p.close ?? 0),
          high: Number(p.high ?? 0),
          low: Number(p.low ?? 0),
          volume: Number(p.vol ?? p.volume ?? 0),
        }))

        const mappedIndicators: TechnicalIndicator[] = rawIndicators.map((t: any) => ({
          date: (t.trade_date || t.date || '').toString().slice(0, 10),
          ma5: t.ma5,
          ma10: t.ma10,
          ma20: t.ma20,
          ma60: t.ma60,
          macd: t.macd,
          macd_signal: t.macd_signal,
          macd_histogram: t.macd_hist ?? t.macd_histogram,
          rsi: t.rsi14 ?? t.rsi6 ?? t.rsi,
          boll_upper: t.boll_upper,
          boll_middle: t.boll_mid ?? t.boll_middle,
          boll_lower: t.boll_lower,
        }))

        setKlineData(mappedPrices)
        setIndicators(mappedIndicators)
      } catch (err) {
        setError('获取K线数据失败')
        console.error('Error fetching kline data:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [tsCode])

  const getOption = () => {
    if (klineData.length === 0) return {}

    // 准备K线数据
    const dates = klineData.map(item => item.date)
    // ECharts蜡烛默认格式: [open, close, low, high]
    const ohlcData = klineData.map(item => [item.open, item.close, item.low, item.high])
    const volumeData = klineData.map(item => item.volume)

    // 准备技术指标数据
    const ma5Data = indicators.map(item => item.ma5).filter(val => val !== undefined)
    const ma10Data = indicators.map(item => item.ma10).filter(val => val !== undefined)
    const ma20Data = indicators.map(item => item.ma20).filter(val => val !== undefined)
    const ma60Data = indicators.map(item => item.ma60).filter(val => val !== undefined)

    return {
      title: {
        text: `${tsCode} K线图`,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: function (params: any) {
          let result = `${params[0].axisValue}<br/>`
          params.forEach((param: any) => {
            if (param.seriesName === 'K线') {
              const data = param.data
              // data: [open, close, low, high]
              result += `开盘: ${Number(data[0]).toFixed(2)}<br/>`
              result += `收盘: ${Number(data[1]).toFixed(2)}<br/>`
              result += `最低: ${Number(data[2]).toFixed(2)}<br/>`
              result += `最高: ${Number(data[3]).toFixed(2)}<br/>`
            } else if (param.seriesName === '成交量') {
              result += `成交量: ${param.data.toLocaleString()}<br/>`
            } else {
              result += `${param.seriesName}: ${Number(param.data).toFixed(2)}<br/>`
            }
          })
          return result
        }
      },
      legend: {
        data: ['K线', 'MA5', 'MA10', 'MA20', 'MA60', '成交量'],
        top: 30
      },
      grid: [
        {
          left: '3%',
          right: '4%',
          height: '60%'
        },
        {
          left: '3%',
          right: '4%',
          top: '75%',
          height: '20%'
        }
      ],
      xAxis: [
        {
          type: 'category',
          data: dates,
          scale: true,
          boundaryGap: false,
          axisLine: { onZero: false },
          splitLine: { show: false },
          min: 'dataMin',
          max: 'dataMax'
        },
        {
          type: 'category',
          gridIndex: 1,
          data: dates,
          scale: true,
          boundaryGap: false,
          axisLine: { onZero: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          min: 'dataMin',
          max: 'dataMax'
        }
      ],
      yAxis: [
        {
          scale: true,
          splitArea: {
            show: true
          }
        },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: 50,
          end: 100
        },
        {
          show: true,
          xAxisIndex: [0, 1],
          type: 'slider',
          top: '90%',
          start: 50,
          end: 100
        }
      ],
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: ohlcData,
          itemStyle: {
            color: '#ef4444',
            color0: '#22c55e',
            borderColor: '#ef4444',
            borderColor0: '#22c55e'
          }
        },
        {
          name: 'MA5',
          type: 'line',
          data: ma5Data,
          smooth: true,
          lineStyle: {
            width: 1,
            color: '#3b82f6'
          }
        },
        {
          name: 'MA10',
          type: 'line',
          data: ma10Data,
          smooth: true,
          lineStyle: {
            width: 1,
            color: '#f59e0b'
          }
        },
        {
          name: 'MA20',
          type: 'line',
          data: ma20Data,
          smooth: true,
          lineStyle: {
            width: 1,
            color: '#8b5cf6'
          }
        },
        {
          name: 'MA60',
          type: 'line',
          data: ma60Data,
          smooth: true,
          lineStyle: {
            width: 1,
            color: '#06b6d4'
          }
        },
        {
          name: '成交量',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumeData,
          itemStyle: {
            color: function(params: any) {
              const dataIndex = params.dataIndex
              if (dataIndex === 0) return '#999'
              const current = klineData[dataIndex]
              const previous = klineData[dataIndex - 1]
              return current.close >= previous.close ? '#22c55e' : '#ef4444'
            }
          }
        }
      ]
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="loading-spinner"></div>
        <span className="ml-3 text-gray-600">加载K线数据中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-red-600">
        <p>{error}</p>
      </div>
    )
  }

  if (klineData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        <p>暂无K线数据</p>
      </div>
    )
  }

  return (
    <div className="chart-container">
      <ReactECharts
        option={getOption()}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  )
}
