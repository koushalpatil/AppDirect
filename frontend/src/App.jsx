import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import PublicLayout from './layouts/PublicLayout';

// Auth
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import ProductList from './pages/admin/ProductList';
import ProductCreate from './pages/admin/ProductCreate';
import ProductEdit from './pages/admin/ProductEdit';
import CatalogManagement from './pages/admin/CatalogManagement';
import ContactFormConfig from './pages/admin/ContactFormConfig';
import HomepageConfig from './pages/admin/HomepageConfig';

// Public pages
import HomePage from './pages/public/HomePage';
import ProductDetail from './pages/public/ProductDetail';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Admin */}
      <Route path="/admin" element={
        <ProtectedRoute adminOnly>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProductCreate />} />
        <Route path="products/:id/edit" element={<ProductEdit />} />
        <Route path="catalog" element={<CatalogManagement />} />
        <Route path="config/contact" element={<ContactFormConfig />} />
        <Route path="config/homepage" element={<HomepageConfig />} />
      </Route>

      {/* Public */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products/:id" element={<ProductDetail />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#161625',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
