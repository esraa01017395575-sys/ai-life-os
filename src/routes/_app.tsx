import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/_app")({ component: AppLayout });

function AppLayout() {
  const { user, loading } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      window.location.href = "/auth";
      return;
    }
    setChecked(true);
  }, [loading, user]);

  if (loading || !checked) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app flex">
      <Sidebar />
      <div className="flex-1 ltr:pl-[48px] rtl:pr-[48px] flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
