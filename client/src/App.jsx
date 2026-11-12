import { useSelector } from 'react-redux';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Spinner } from './components/ui/primitives.jsx';
import { StoreLayout } from './components/layout.jsx';
import {
  AccountOrderPage, AddressesPage, LoginPage, OrdersPage, ProfilePage, RegisterPage,
} from './pages/AccountPages.jsx';
import { NotificationsPage } from './components/LiveNotifications.jsx';
import { AdminInvoicePage, CustomerInvoicePage } from './pages/InvoicePages.jsx';
import {
  AdminLayout, CategoriesAdminPage, CustomersAdminPage, DashboardPage, InboxPage, OrderAdminPage,
  OrdersAdminPage, ProductFormPage, ProductsAdminPage, PromotionsPage, SettingsAdminPage,
} from './pages/AdminPages.jsx';
import { ProductDetailPage, ProductListPage } from './pages/CatalogPages.jsx';
import { CartPage, CheckoutPage, ConfirmationPage, ContentPages, TrackPage } from './pages/CheckoutPages.jsx';
import { HomePage } from './pages/HomePage.jsx';

function Gate({ admin = false }) {
  const { user, status } = useSelector((state) => state.auth);
  const location = useLocation();
  if (status !== 'ready') return <div className="py-24"><Spinner /></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return null;
}

function Protected({ admin = false, children }) {
  const gate = Gate({ admin });
  if (gate) return gate;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductListPage />} />
        <Route path="category/:slug" element={<ProductListPage />} />
        <Route path="product/:slug" element={<ProductDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="order/:orderNumber" element={<ConfirmationPage />} />
        <Route path="track" element={<TrackPage />} />
        <Route path="about" element={<ContentPages kind="about" />} />
        <Route path="contact" element={<ContentPages kind="contact" />} />
        <Route path="delivery" element={<ContentPages kind="delivery" />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="account" element={<Protected><ProfilePage /></Protected>} />
        <Route path="account/orders" element={<Protected><OrdersPage /></Protected>} />
        <Route path="account/orders/:orderNumber/invoice" element={<Protected><CustomerInvoicePage /></Protected>} />
        <Route path="account/orders/:orderNumber" element={<Protected><AccountOrderPage /></Protected>} />
        <Route path="account/notifications" element={<Protected><NotificationsPage /></Protected>} />
        <Route path="account/addresses" element={<Protected><AddressesPage /></Protected>} />
      </Route>
      <Route path="admin/orders/:id/invoice" element={<Protected admin><AdminInvoicePage /></Protected>} />
      <Route path="admin" element={<Protected admin><AdminLayout /></Protected>}>
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsAdminPage />} />
        <Route path="products/new" element={<ProductFormPage />} />
        <Route path="products/:id" element={<ProductFormPage />} />
        <Route path="categories" element={<CategoriesAdminPage />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="orders" element={<OrdersAdminPage />} />
        <Route path="orders/:id" element={<OrderAdminPage />} />
        <Route path="customers" element={<CustomersAdminPage />} />
        <Route path="promotions" element={<PromotionsPage />} />
        <Route path="settings" element={<SettingsAdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
