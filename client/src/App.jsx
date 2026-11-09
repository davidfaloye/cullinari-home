import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { RequireAuth } from './auth.jsx';
import Landing from './pages/Landing.jsx';
import Signup from './pages/Signup.jsx';
import Login from './pages/Login.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Terms from './pages/Terms.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PaymentReturn from './pages/PaymentReturn.jsx';
import AdminList from './pages/admin/AdminList.jsx';
import AdminDetail from './pages/admin/AdminDetail.jsx';
import NotFound from './pages/NotFound.jsx';

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/dashboard/payment" element={<RequireAuth><PaymentReturn /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth admin><AdminList /></RequireAuth>} />
        <Route path="/admin/applications/:id" element={<RequireAuth admin><AdminDetail /></RequireAuth>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
