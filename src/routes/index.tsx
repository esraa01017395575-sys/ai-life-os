import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    window.location.href = user ? "/dashboard" : "/auth";
  }, [user, loading]);
  return (
    <div className="min-h-screen bg-app flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  );
}
