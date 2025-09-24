import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { StockDetailPage } from './pages/StockDetailPage'
import { HomePage } from './pages/HomePage'
import { Layout } from './components/Layout'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/stock/:tsCode" element={<StockDetailPage />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
