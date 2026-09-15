import { Route, Routes } from "react-router-dom";
import PublicLayout from "./components/layout/PublicLayout";
import DashboardLayout from "./components/layout/DashboardLayout";
import { ROLE_MENUS } from "./config/roles";
import Home from "./pages/public/Home";
import Services from "./pages/public/Services";
import ServiceDetail from "./pages/public/ServiceDetail";
import Doctors from "./pages/public/Doctors";
import DoctorProfile from "./pages/public/DoctorProfile";
import BookAppointment from "./pages/public/BookAppointment";
import About from "./pages/public/About";
import Contact from "./pages/public/Contact";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
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
            <Route path="*" element={<DashboardPage role={role} page="not-found" />} />
          </Route>
        );
      })}

      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </>
  );
}

export default App;
