export default function App() {
  const signup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email') || '')
    const password = String(form.get('password') || '')
    await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    alert('注册成功，去登录')
  }

  const login = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email') || '')
    const password = String(form.get('password') || '')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (data?.token) {
      localStorage.setItem('token', data.token)
      alert('登录成功')
    } else {
      alert('登录失败')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-xl w-full p-6 space-y-6">
        <h1 className="text-2xl font-bold">个人信息流聚合 MVP</h1>
        <div className="grid md:grid-cols-2 gap-6">
          <form onSubmit={signup} className="space-y-3 p-4 rounded-lg border bg-white">
            <h2 className="font-semibold">注册</h2>
            <input name="email" placeholder="邮箱" type="email" className="w-full border rounded px-3 py-2" required />
            <input name="password" placeholder="密码（≥6位）" type="password" className="w-full border rounded px-3 py-2" required />
            <button className="w-full bg-black text-white rounded px-3 py-2">注册</button>
          </form>
          <form onSubmit={login} className="space-y-3 p-4 rounded-lg border bg-white">
            <h2 className="font-semibold">登录</h2>
            <input name="email" placeholder="邮箱" type="email" className="w-full border rounded px-3 py-2" required />
            <input name="password" placeholder="密码" type="password" className="w-full border rounded px-3 py-2" required />
            <button className="w-full bg-black text-white rounded px-3 py-2">登录</button>
          </form>
        </div>
      </div>
    </div>
  )
}
