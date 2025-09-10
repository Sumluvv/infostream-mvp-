export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-xl w-full p-6 space-y-4">
        <h1 className="text-2xl font-bold">个人信息流聚合 MVP</h1>
        <p className="text-gray-600">请选择要开始的功能：</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <a href="#login" className="rounded-lg border p-4 hover:bg-white bg-gray-100">登录/注册</a>
          <a href="#feeds" className="rounded-lg border p-4 hover:bg-white bg-gray-100">RSS 订阅管理</a>
        </div>
        <p className="text-xs text-gray-500">前端样式由 Tailwind 提供。</p>
      </div>
    </div>
  )
}
