import { AdminAuthShell } from "@/components/admin/AdminAuthShell";

export default function AdminLayout({ children }) {
  return <AdminAuthShell>{children}</AdminAuthShell>;
}
