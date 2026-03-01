import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Products from './pages/Products';
import Cart from './pages/Cart';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Agent Pages
import AgentLayout from './pages/agent/AgentLayout';
import AgentLogin from './pages/agent/AgentLogin';
import AgentDashboard from './pages/agent/AgentDashboard';
import AgentClients from './pages/agent/AgentClients';
import AgentOrders from './pages/agent/AgentOrders';
import CreateDeliveryNote from './pages/agent/CreateDeliveryNote';
import AgentDocuments from './pages/agent/AgentDocuments';
import AgentProfile from './pages/agent/AgentProfile';
import Payment from './pages/Payment';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Client Routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="products" element={<Products />} />
            <Route path="cart" element={<Cart />} />
            <Route element={<ProtectedRoute />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="documents" element={<Documents />} />
              <Route path="checkout/:invoiceId" element={<Payment />} />
            </Route>
          </Route>

          {/* Agent Routes */}
          <Route path="/agent/login" element={<AgentLogin />} />
          <Route path="/agent" element={<AgentLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AgentDashboard />} />
            <Route path="profile" element={<AgentProfile />} />
            <Route path="clients" element={<AgentClients />} />
            <Route path="orders" element={<AgentOrders />} />
            <Route path="orders/:id/delivery" element={<CreateDeliveryNote />} />
            <Route path="documents" element={<AgentDocuments />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
