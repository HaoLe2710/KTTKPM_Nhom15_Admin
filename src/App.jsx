import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './components/ThemeProvider'
import AdminLayout from './components/layout/AdminLayout'
import Dashboard from './features/analytics/Dashboard'
import ProductList from './features/catalog/ProductList'
import ProductDetail from './features/catalog/ProductDetail'
import SearchMetrics from './features/search/SearchMetrics'
import SearchHealth from './features/search/SearchHealth'
import OptionsRegistry from './features/catalog/OptionsRegistry'

function App () {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="products" element={<ProductList />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="options" element={<OptionsRegistry />} />
            <Route path="search" element={<SearchMetrics />} />
            <Route path="search-health" element={<SearchHealth />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
