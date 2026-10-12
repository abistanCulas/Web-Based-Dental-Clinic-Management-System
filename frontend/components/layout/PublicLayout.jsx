import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import AIChatbot from "../ui/AIChatbot";

export default function PublicLayout() {
  const location = useLocation();
  // Login and Register pages must NOT have the footer
  const hideFooter = ["/login", "/register", "/forgot-password"].includes(location.pathname);

  return (
    <div className="df-public-layout">
      <Navbar />
      <main>
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
      <AIChatbot />
    </div>
  );
}
