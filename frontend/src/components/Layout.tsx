import React from 'react'
import { TrendingUp, BarChart3, Calculator, Brain } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-primary-600" />
              <h1 className="text-xl font-bold text-gray-900">Infostream MVP</h1>
            </div>
            
            {/* 导航菜单 */}
            <nav className="hidden md:flex space-x-8">
              <a href="/" className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors">
                <BarChart3 className="h-4 w-4" />
                <span>股票分析</span>
              </a>
              <a href="#" className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors">
                <Calculator className="h-4 w-4" />
                <span>估值计算</span>
              </a>
              <a href="#" className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors">
                <Brain className="h-4 w-4" />
                <span>AI评分</span>
              </a>
            </nav>
            
            {/* 用户菜单 */}
            <div className="flex items-center space-x-4">
              <button className="btn btn-outline btn-sm">
                登录
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* 主内容区域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      
      {/* 页脚 */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 text-sm">
            <p>© 2025 Infostream MVP. 专业的A股分析平台</p>
            <p className="mt-2">数据来源：Tushare Pro | 技术支持：Fastify + React + ECharts</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
