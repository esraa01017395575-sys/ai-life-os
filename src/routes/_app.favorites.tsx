import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefs } from "@/contexts/PrefsContext";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/favorites")({ component: FavoritesPage });

interface Favorite { id: string; title: string; content: string | null; source_type: string; created_at: string }

function FavoritesPage() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const [favs, setFavs] = useState<Favorite[]>([]);

  useEffect(() => {
    if (!user) return;
    void supabase.from("favorites").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setFavs((data ?? []) as Favorite[]));
  }, [user]);

  async function remove(id: string) {
    await supabase.from("favorites").delete().eq("id", id);
    setFavs((f) => f.filter((x) => x.id !== id));
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Heart className="h-7 w-7 text-accent" />
        <h1 className="text-3xl font-display font-bold">{t("favorites")}</h1>
      </div>
      {favs.length === 0 && <p className="text-app-muted text-sm">{t("favoritesEmpty")}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {favs.map((f) => (
          <div key={f.id} className="glass-card p-4 hover-lift">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <span className="text-xs uppercase text-app-muted">{f.source_type}</span>
                <h3 className="font-medium text-app truncate">{f.title}</h3>
              </div>
              <button onClick={() => remove(f.id)} className="text-app-muted hover:text-danger" aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {f.content && <p className="text-sm text-app-muted line-clamp-3">{f.content}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
