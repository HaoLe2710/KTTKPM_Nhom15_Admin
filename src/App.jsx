import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './components/ThemeProvider'
import AdminLayout from './components/layout/AdminLayout'
import Dashboard from './features/analytics/Dashboard'
import ProductList from './features/catalog/ProductList'
import ProductDetail from './features/catalog/ProductDetail'
import SearchMetrics from './features/search/SearchMetrics'
import SearchHealth from './features/search/SearchHealth'
import EventPublications from './features/search/EventPublications'
import OptionsRegistry from './features/catalog/OptionsRegistry'
import SemanticMasters from './features/catalog/SemanticMasters'
import Login from './features/auth/Login'
import RequireAuth from './components/auth/RequireAuth'
import RequireRole from './components/auth/RequireRole'
import UserManagement from './features/users/UserManagement'
import CustomerChat from './features/chat/CustomerChat'
import VoucherManagement from './features/promotions/VoucherManagement'
import OrderManagement from './features/orders/OrderManagement'
import AppErrorBoundary from './components/common/AppErrorBoundary'

function App () {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<RequireAuth />}>
            <Route path="/" element={<AdminLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />

              <Route element={<RequireRole roles={['ADMIN']} />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="options" element={<OptionsRegistry />} />
                <Route path="masters" element={<SemanticMasters />} />
                <Route path="search" element={<SearchMetrics />} />
                <Route path="search-health" element={<SearchHealth />} />
                <Route path="event-publications" element={<EventPublications />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="vouchers" element={<VoucherManagement />} />
              </Route>

              <Route element={<RequireRole roles={['ADMIN', 'STAFF', 'EMPLOYEE']} />}>
                <Route path="products" element={<ProductList />} />
                <Route path="products/:id" element={<ProductDetail />} />
                <Route path="orders" element={<AppErrorBoundary><OrderManagement /></AppErrorBoundary>} />
                <Route path="orders/:id" element={<AppErrorBoundary><OrderManagement /></AppErrorBoundary>} />
                <Route path="chat" element={<CustomerChat />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
