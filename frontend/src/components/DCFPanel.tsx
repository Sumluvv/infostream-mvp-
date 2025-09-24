import React, { useState, useEffect } from 'react';
import { apiFunctions } from '../utils/api';

interface DCFData {
  ts_code: string;
  as_of_date: string;
  current_price: number;
  dcf_value: number;
  dcf_range: {
    low: number;
    high: number;
  };
  upside_downside: number;
  valuation_ratios: {
    pe_ratio: number;
    pb_ratio: number;
  };
  parameters: {
    discount_rate: number;
    terminal_growth_rate: number;
    projection_years: number;
  };
  growth_rates: {
    roe: number;
    profit_growth: number;
    revenue_growth: number;
  };
  projections: Array<{
    year: number;
    projected_eps: number;
    fcf: number;
    pv_fcf: number;
  }>;
  sensitivity_analysis: {
    matrix: Array<{
      discount_rate: number;
      terminal_growth_rate: number;
      dcf_value: number;
      pe_ratio: number;
    }>;
  };
  enterprise_value: number;
  terminal_value: number;
  analysis: {
    dcf_analysis: string;
    risk_assessment: string;
    recommendation: string;
  };
}

interface DCFPanelProps {
  tsCode: string;
}

const DCFPanel: React.FC<DCFPanelProps> = ({ tsCode }) => {
  const [dcfData, setDcfData] = useState<DCFData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDCFData = async () => {
      try {
        setLoading(true);
        const response = await apiFunctions.getDCFValuation(tsCode);
        setDcfData(response.data);
        setError(null);
      } catch (err) {
        setError('获取DCF估值数据失败');
        console.error('DCF data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (tsCode) {
      fetchDCFData();
    }
  }, [tsCode]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">DCF估值分析</h3>
        <div className="flex items-center justify-center py-8">
          <div className="loading-spinner"></div>
          <span className="ml-2 text-gray-600">加载中...</span>
        </div>
      </div>
    );
  }

  if (error || !dcfData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">DCF估值分析</h3>
        <div className="text-center py-8">
          <p className="text-red-600">{error || '暂无DCF估值数据'}</p>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('zh-CN', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  const formatPercent = (num: number) => {
    return (num * 100).toFixed(1) + '%';
  };

  const getUpsideDownsideColor = (value: number) => {
    if (value > 20) return 'text-green-600';
    if (value > 0) return 'text-green-500';
    if (value > -20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRecommendationColor = (recommendation: string) => {
    if (recommendation.includes('强烈买入') || recommendation.includes('买入')) return 'text-green-600';
    if (recommendation.includes('持有')) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">DCF估值分析</h3>
      
      {/* 核心估值指标 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">当前股价</div>
          <div className="text-xl font-semibold text-gray-900">
            ¥{formatNumber(dcfData.current_price)}
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">DCF估值</div>
          <div className="text-xl font-semibold text-gray-900">
            ¥{formatNumber(dcfData.dcf_value)}
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">涨跌空间</div>
          <div className={`text-xl font-semibold ${getUpsideDownsideColor(dcfData.upside_downside)}`}>
            {formatPercent(dcfData.upside_downside / 100)}
          </div>
        </div>
      </div>

      {/* 估值范围 */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-2">估值范围</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">保守估计</span>
            <span className="text-lg font-semibold text-red-600">
              ¥{formatNumber(dcfData.dcf_range.low)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-gray-600">乐观估计</span>
            <span className="text-lg font-semibold text-green-600">
              ¥{formatNumber(dcfData.dcf_range.high)}
            </span>
          </div>
        </div>
      </div>

      {/* 估值参数 */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-2">估值参数</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">折现率</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatPercent(dcfData.parameters.discount_rate)}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">终值增长率</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatPercent(dcfData.parameters.terminal_growth_rate)}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">预测年数</div>
            <div className="text-lg font-semibold text-gray-900">
              {dcfData.parameters.projection_years}年
            </div>
          </div>
        </div>
      </div>

      {/* 增长率分析 */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-2">增长率分析</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">ROE</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatPercent(dcfData.growth_rates.roe)}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">利润增长率</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatPercent(dcfData.growth_rates.profit_growth)}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">收入增长率</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatPercent(dcfData.growth_rates.revenue_growth)}
            </div>
          </div>
        </div>
      </div>

      {/* 投资建议 */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-2">投资建议</h4>
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">DCF分析</div>
            <div className="text-sm text-gray-900">{dcfData.analysis.dcf_analysis}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">风险评估</div>
            <div className="text-sm text-gray-900">{dcfData.analysis.risk_assessment}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">投资建议</div>
            <div className={`text-sm font-medium ${getRecommendationColor(dcfData.analysis.recommendation)}`}>
              {dcfData.analysis.recommendation}
            </div>
          </div>
        </div>
      </div>

      {/* 未来现金流预测 */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-2">未来现金流预测</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">年份</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">预测EPS</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">自由现金流</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">现值</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dcfData.projections.map((projection) => (
                <tr key={projection.year}>
                  <td className="px-3 py-2 text-sm text-gray-900">{projection.year}</td>
                  <td className="px-3 py-2 text-sm text-gray-900">¥{formatNumber(projection.projected_eps)}</td>
                  <td className="px-3 py-2 text-sm text-gray-900">¥{formatNumber(projection.fcf)}</td>
                  <td className="px-3 py-2 text-sm text-gray-900">¥{formatNumber(projection.pv_fcf)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 企业价值分析 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-sm text-gray-600">企业价值</div>
          <div className="text-lg font-semibold text-gray-900">
            ¥{formatNumber(dcfData.enterprise_value, 0)}亿
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-sm text-gray-600">终值</div>
          <div className="text-lg font-semibold text-gray-900">
            ¥{formatNumber(dcfData.terminal_value, 0)}亿
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-sm text-gray-600">估值日期</div>
          <div className="text-sm text-gray-900">
            {new Date(dcfData.as_of_date).toLocaleDateString('zh-CN')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DCFPanel;
