import { AccountPage } from "./ProfilePage";

export default function SettingsPage({ role = "user" }) {
  return <AccountPage role={role} section="settings" />;
}
