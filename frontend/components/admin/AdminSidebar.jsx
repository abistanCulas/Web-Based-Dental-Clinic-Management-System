import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import SidebarIcon from "../icons/SidebarIcons";
import { ADMIN_NAV } from "../../config/roles";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import usersApi from "../../api/users";
import { pharmacyApi } from "../../api/pharmacy";
import { feedbackApi } from "../../api/feedback";
import { inquiriesApi } from "../../api/inquiries";
import { messagesApi } from "../../api/messages";

import logoImage from "../../assets/reference/dentaflow-logo.png";

function useAdminSidebarBadges() {
  const [badgeCounts, setBadgeCounts] = useState({
    deactivation: 0,
    purchase: 0,
    expiry: 0,
    negative: 0,
    inquiry: 0,
    messages: 0,
  });

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      usersApi.getDeactivationRequests().catch(() => []),
      pharmacyApi.getAllPurchaseOrders().catch(() => []),
      pharmacyApi.getLowStockMedicines().catch(() => []),
      feedbackApi.getAllFeedback().catch(() => []),
      inquiriesApi.getAllInquiries().catch(() => []),
      messagesApi.getUnreadCount().catch(() => ({ unreadCount: 0 })),
    ]).then(([deactReqs, purchaseOrders, lowStock, feedback, inquiries, msgData]) => {
      if (cancelled) return;

      const deactCount = Array.isArray(deactReqs) ? deactReqs.length : 0;
      const poPending = Array.isArray(purchaseOrders)
        ? purchaseOrders.filter((po) => {
            const st = String(po.status || "").toUpperCase();
            return st === "PENDING" || st === "ORDERED" || st === "DRAFT";
          }).length
        : 0;
      const lowStockCount = Array.isArray(lowStock) ? lowStock.length : 0;
      const negFeedback = Array.isArray(feedback)
        ? feedback.filter((f) => {
            const st = String(f.status || "").toLowerCase();
            const rating = Number(f.rating || 5);
            return st === "pending" || st === "pending-review" || rating <= 2;
          }).length
        : 0;
      const inqPending = Array.isArray(inquiries)
        ? inquiries.filter((i) => {
            const st = String(i.status || "").toLowerCase();
            return st === "pending" || st === "open";
          }).length
        : 0;
      const unreadMessages = msgData?.unreadCount || 0;

      setBadgeCounts({
        deactivation: deactCount,
        purchase: poPending,
        expiry: lowStockCount,
        negative: negFeedback,
        inquiry: inqPending,
        messages: unreadMessages,
      });
    }).catch(() => {
      // Keep defaults
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return badgeCounts;
}

export default function AdminSidebar({ collapsed = false }) {
  const { logout, user } = useAuth();
  const { notifications } = useNotifications();
  const navigate = useNavigate();

  const realBadgeCounts = useAdminSidebarBadges();
  const unreadNotifications = (notifications || []).filter((n) => !n.read).length;

  const badges = {
    ...realBadgeCounts,
    notifications: unreadNotifications,
  };

  const initials =
      user?.name
          ?.split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "AD";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
      <div className={`adm-sidebar-nav ${collapsed ? "collapsed" : ""}`}>
        {/* =========================================================
          DENTAFLOW BRAND
          Uses the actual DentaFlow image asset
         ========================================================= */}
        <div className="adm-sidebar-brand">
          <div className="adm-sidebar-brand-row">
          <span className="adm-brand-mark" aria-hidden="true">
            <img
                src={logoImage}
                alt="DentaFlow"
                className="adm-brand-logo"
            />
          </span>

            <span className="adm-brand-text">
            <strong>DentaFlow</strong>

              {!collapsed && (
                  <small>Care Today, Healthier Tomorrows</small>
              )}
          </span>
          </div>
        </div>

        {/* =========================================================
          ADMIN NAVIGATION
         ========================================================= */}
        <nav aria-label="Admin navigation">
          {ADMIN_NAV.map((group) => (
              <div className="adm-sidebar-group" key={group.label}>
                {!collapsed && (
                    <div className="adm-sidebar-group-label">
                      {group.label}
                    </div>
                )}

                {collapsed && (
                    <div
                        className="adm-sidebar-group-rule"
                        aria-hidden="true"
                    />
                )}

                {group.items.map((item) => {
                  const count = badges[item.badge];

                  return (
                      <NavLink
                          key={item.path}
                          to={item.path}
                          end={item.path === "/admin"}
                          className={({ isActive }) =>
                              `adm-sidebar-link ${
                                  isActive ? "active" : ""
                              } ${collapsed ? "icon-only" : ""}`
                          }
                          title={collapsed ? item.label : undefined}
                      >
                  <span className="adm-sidebar-link-icon">
                    <SidebarIcon
                        name={item.icon}
                        size={19}
                    />
                  </span>

                        {!collapsed && (
                            <span className="adm-sidebar-link-label">
                      {item.label}
                    </span>
                        )}

                        {!collapsed && count > 0 && (
                            <span
                                className={`adm-sidebar-badge tone-${item.badge}`}
                            >
                      {count}
                    </span>
                        )}
                      </NavLink>
                  );
                })}
              </div>
          ))}
        </nav>

        {/* =========================================================
          SIDEBAR FOOTER
         ========================================================= */}
        <div className="adm-sidebar-footer">
          {!collapsed && (
              <div
                  className="adm-sidebar-promo"
                  aria-hidden="true"
              >
                <div className="adm-promo-tooth-wrap">
                  <svg
                      className="adm-promo-tooth-3d"
                      viewBox="0 0 100 90"
                      fill="none"
                  >
                    <defs>
                      <radialGradient
                          id="promoToothLight"
                          cx="35%"
                          cy="30%"
                          r="70%"
                      >
                        <stop
                            offset="0%"
                            stopColor="#ffffff"
                        />
                        <stop
                            offset="65%"
                            stopColor="#dbeafe"
                        />
                        <stop
                            offset="100%"
                            stopColor="#93c5fd"
                        />
                      </radialGradient>

                      <filter
                          id="promoToothGlow"
                          x="-20%"
                          y="-20%"
                          width="140%"
                          height="140%"
                      >
                        <feDropShadow
                            dx="0"
                            dy="8"
                            stdDeviation="10"
                            floodColor="#38bdf8"
                            floodOpacity="0.35"
                        />
                      </filter>
                    </defs>

                    <path
                        d="M50 14C34 14 22 24 22 40C22 51 27 65 32 77C35 84 40 85 44 79C47 74 49 67 50 61C51 67 53 74 56 79C60 85 65 84 68 77C73 65 78 51 78 40C78 24 66 14 50 14Z"
                        fill="url(#promoToothLight)"
                        filter="url(#promoToothGlow)"
                    />

                    <ellipse
                        cx="40"
                        cy="28"
                        rx="8"
                        ry="4"
                        fill="#ffffff"
                        opacity="0.8"
                        transform="rotate(-15 40 28)"
                    />
                  </svg>
                </div>

                <div className="adm-sidebar-promo-text">
              <span className="adm-promo-script">
                Better Care
              </span>

                  <span className="adm-promo-sans">
                Brighter Smiles
              </span>
                </div>
              </div>
          )}

          {/* Logout */}
          <button
              type="button"
              className="adm-sidebar-link"
              onClick={handleLogout}
          >
          <span className="adm-sidebar-link-icon">
            <SidebarIcon
                name="logout"
                size={19}
            />
          </span>

            {!collapsed && (
                <span className="adm-sidebar-link-label">
              Logout
            </span>
            )}
          </button>

          {/* User */}
          <div className="adm-sidebar-user">
            <div className="adm-sidebar-avatar">
              {user?.profileImage ? (
                  <img
                      src={user.profileImage}
                      alt=""
                  />
              ) : (
                  initials
              )}
            </div>

            {!collapsed && (
                <div className="adm-sidebar-user-meta">
                  <strong>
                    {user?.name || "System Administrator"}
                  </strong>

                  <small>
                    System Administrator
                  </small>
                </div>
            )}
          </div>

          {/* Version */}
          {!collapsed && (
              <div className="adm-sidebar-version">
            <span className="adm-version-title">
              DentaFlow v1.0.0
            </span>

                <span className="adm-version-sub">
              Dental Clinic Management System
            </span>
              </div>
          )}
        </div>
      </div>
  );
}