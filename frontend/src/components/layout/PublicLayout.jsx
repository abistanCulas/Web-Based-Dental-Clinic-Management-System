import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import AIChatbot from "../ui/AIChatbot";

export default function PublicLayout() {
  return (
    <div className="df-public-layout">
      <Navbar />
      <main><Outlet /></main>
      <Footer />
      <AIChatbot />
    </div>
  );
}
