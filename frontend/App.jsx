import { Route, Routes, Navigate } from "react-router-dom";
import PublicLayout from "./components/layout/PublicLayout";
import DashboardLayout from "./components/layout/DashboardLayout";
import { ROLE_MENUS } from "./config/roles";
import Home from "./pages/public/Home";
import Services from "./pages/public/Services.jsx";
import ServiceDetail from "./pages/public/ServiceDetail";
import Doctors from "./pages/public/Doctors";
import DoctorProfile from "./pages/public/DoctorProfile";
import BookAppointment from "./pages/public/BookAppointment";
import About from "./pages/public/About";
import Contact from "./pages/public/Contact";
import Reviews from "./pages/public/Reviews";
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import DashboardPage from "./pages/shared/DashboardPage";
import NotFound from "./pages/shared/NotFound";
import ToastContainer from "./components/common/ToastContainer";

const DASHBOARD_ROLES = ["patient", "doctor", "admin", "receptionist", "pharmacist", "user"];

function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/services" element={<Services />} />
        <Route path="/services/:id" element={<ServiceDetail />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/doctors/:id" element={<DoctorProfile />} />
        <Route path="/book-appointment" element={<BookAppointment />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/reviews" element={<Reviews />} />
      </Route>

      {DASHBOARD_ROLES.map((role) => {
        const pages = (ROLE_MENUS[role] || []).filter((item) => item.path.startsWith(`/${role}/`));
        return (
          <Route key={role} path={role} element={<DashboardLayout requiredRole={role} />}>
            <Route index element={<DashboardPage role={role} />} />
            {pages.map((item) => (
              <Route
                key={item.path}
                path={item.path.slice(role.length + 2)}
                element={<DashboardPage role={role} page={item.path.slice(role.length + 2)} />}
              />
            ))}
            <Route path="profile" element={<DashboardPage role={role} page="profile" />} />
            <Route path="settings/*" element={<DashboardPage role={role} page="settings" />} />
            <Route path="book" element={<Navigate to={`/${role}/book-appointment`} replace />} />
            {role === "patient" && (
              <Route path="payments" element={<Navigate to="/patient/billing" replace />} />
            )}
            {role === "pharmacist" && (
              <>
                <Route path="transactions" element={<Navigate to="/pharmacist/stock-transactions" replace />} />
                <Route path="history" element={<Navigate to="/pharmacist/medicine-history" replace />} />
              </>
            )}
            {role === "doctor" && (
              <Route path="availability" element={<Navigate to="/doctor/schedule" replace />} />
            )}
            <Route path="*" element={<DashboardPage role={role} page="not-found" />} />
          </Route>
        );
      })}

      {/* Medicines catalog is managed inside the Inventory workflow */}
      <Route path="/admin/medicines" element={<Navigate to="/admin/inventory" replace />} />

      {/* Pharmacist route aliases ensuring legacy paths redirect to new canonical paths */}
      <Route path="/pharmacist/transactions" element={<Navigate to="/pharmacist/stock-transactions" replace />} />
      <Route path="/pharmacist/history" element={<Navigate to="/pharmacist/medicine-history" replace />} />

      {/* Patient route aliases */}
      <Route path="/patient/payments" element={<Navigate to="/patient/billing" replace />} />

      {/* Doctor route aliases */}
      <Route path="/doctor/availability" element={<Navigate to="/doctor/schedule" replace />} />

      {/* Cashier route aliases ensuring /cashier routes map to /user */}
      <Route path="/cashier" element={<Navigate to="/user" replace />} />
      <Route path="/cashier/payments" element={<Navigate to="/user/payments" replace />} />
      <Route path="/cashier/invoices" element={<Navigate to="/user/invoices" replace />} />
      <Route path="/cashier/pending" element={<Navigate to="/user/pending" replace />} />
      <Route path="/cashier/messages" element={<Navigate to="/user/messages" replace />} />
      <Route path="/cashier/history" element={<Navigate to="/user/history" replace />} />
      <Route path="/cashier/refunds" element={<Navigate to="/user/refunds" replace />} />
      <Route path="/cashier/reports" element={<Navigate to="/user/reports" replace />} />
      <Route path="/cashier/notifications" element={<Navigate to="/user/notifications" replace />} />
      <Route path="/cashier/profile" element={<Navigate to="/user/profile" replace />} />
      <Route path="/cashier/settings/*" element={<Navigate to="/user/settings" replace />} />
      <Route path="/cashier/*" element={<Navigate to="/user" replace />} />

      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </>
  );
}

export default App;
