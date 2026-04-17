import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, StickyNote, Trash2, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefs } from "@/contexts/PrefsContext";
import { supabase } from "@/integrations/supabase/client";
import { SECTION_COLORS } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/notes")({ component: NotesPage });

interface Section { id: string; name: string; color: string; order_index: number }
interface Note { id: string; title: string; content: string | null; color: string; section_id: string | null; updated_at: string }

function NotesPage() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const [sections, setSections] = useState<Section[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [active, setActive] = useState<Note | null>(null);
  const [newSectionName, setNewSectionName] = useState("");
  const [creatingSection, setCreatingSection] = useState(false);

  useEffect(() => { void load(); }, [user]);

  async function load() {
    if (!user) return;
    const { data: ss } = await supabase.from("note_sections").select("*").eq("user_id", user.id).order("order_index");
    setSections((ss ?? []) as Section[]);
    const { data: ns } = await supabase.from("notes").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
    setNotes((ns ?? []) as Note[]);
  }

  async function createSection() {
    if (!user || !newSectionName.trim()) return;
    const color = SECTION_COLORS[sections.length % SECTION_COLORS.length];
    const { error } = await supabase.from("note_sections").insert({
      user_id: user.id, name: newSectionName.trim(), color, order_index: sections.length,
    });
    if (error) { toast.error(error.message); return; }
    setNewSectionName(""); setCreatingSection(false); void load();
  }

  async function createNote() {
    if (!user) return;
    const color = activeSection ? sections.find((s) => s.id === activeSection)?.color ?? "#7C5CFC" : "#7C5CFC";
    const { data, error } = await supabase.from("notes").insert({
      user_id: user.id, title: "Untitled", section_id: activeSection, color,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setNotes((n) => [data as Note, ...n]);
    setActive(data as Note);
  }

  async function saveNote(n: Note) {
    await supabase.from("notes").update({ title: n.title, content: n.content }).eq("id", n.id);
    setNotes((all) => all.map((x) => x.id === n.id ? n : x));
  }

  async function deleteNote(id: string) {
    await supabase.from("notes").delete().eq("id", id);
    setNotes((n) => n.filter((x) => x.id !== id));
    if (active?.id === id) setActive(null);
  }

  async function favoriteNote(n: Note) {
    if (!user) return;
    await supabase.from("favorites").insert({ user_id: user.id, source_type: "note", source_id: n.id, title: n.title, content: n.content });
    toast.success("Starred");
  }

  const visible = activeSection ? notes.filter((n) => n.section_id === activeSection) : notes;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <aside className="w-56 border-r border-app bg-app-secondary flex flex-col shrink-0">
        <div className="p-3 space-y-1">
          <button onClick={() => setActiveSection(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm ${!activeSection ? "bg-app-card text-app" : "text-app-muted hover:bg-app-card"}`}>
            All notes
          </button>
          {sections.map((s) => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${activeSection === s.id ? "bg-app-card text-app" : "text-app-muted hover:bg-app-card"}`}>
              <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
              <span className="truncate">{s.name}</span>
            </button>
          ))}
          {creatingSection ? (
            <div className="flex gap-1">
              <input autoFocus value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createSection()}
                className="flex-1 h-8 px-2 rounded bg-app-elevated border border-app text-sm text-app outline-none" />
              <button onClick={createSection} className="h-8 px-2 rounded bg-accent text-white text-xs">+</button>
            </div>
          ) : (
            <button onClick={() => setCreatingSection(true)} className="w-full text-left px-3 py-2 rounded-lg text-xs text-app-muted hover:bg-app-card flex items-center gap-1">
              <Plus className="h-3 w-3" /> {t("newSection")}
            </button>
          )}
        </div>
      </aside>

      <div className="flex-1 flex min-w-0">
        <div className="w-80 border-r border-app overflow-y-auto">
          <div className="p-3">
            <button onClick={createNote} className="w-full h-10 rounded-lg bg-accent text-white text-sm font-medium flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" /> {t("addNote")}
            </button>
          </div>
          <div className="px-2 pb-2 space-y-1">
            {visible.length === 0 && <p className="text-app-muted text-sm p-3">{t("noNotes")}</p>}
            {visible.map((n) => (
              <button key={n.id} onClick={() => setActive(n)}
                className={`w-full text-left p-3 rounded-lg ${active?.id === n.id ? "bg-app-card" : "hover:bg-app-card"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: n.color }} />
                  <span className="text-sm font-medium truncate text-app">{n.title || t("untitled")}</span>
                </div>
                <p className="text-xs text-app-muted line-clamp-2">{n.content?.slice(0, 100)}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          {active ? (
            <>
              <div className="border-b border-app p-3 flex items-center justify-between">
                <input value={active.title} onChange={(e) => { const v = { ...active, title: e.target.value }; setActive(v); void saveNote(v); }}
                  className="flex-1 bg-transparent text-xl font-display font-semibold outline-none text-app" />
                <div className="flex gap-1">
                  <button onClick={() => favoriteNote(active)} className="h-9 w-9 rounded-lg hover:bg-app-card text-app-muted hover:text-accent" aria-label="Star">
                    <Star className="h-4 w-4 mx-auto" />
                  </button>
                  <button onClick={() => deleteNote(active.id)} className="h-9 w-9 rounded-lg hover:bg-app-card text-app-muted hover:text-danger" aria-label="Delete">
                    <Trash2 className="h-4 w-4 mx-auto" />
                  </button>
                </div>
              </div>
              <textarea value={active.content ?? ""} onChange={(e) => { const v = { ...active, content: e.target.value }; setActive(v); void saveNote(v); }}
                placeholder="Start writing…"
                className="flex-1 p-6 bg-transparent outline-none resize-none text-app leading-relaxed" />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-app-muted">
              <div className="text-center">
                <StickyNote className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select or create a note</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
