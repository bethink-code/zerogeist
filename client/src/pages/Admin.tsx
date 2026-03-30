import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { Link } from "wouter";
import { useAuth } from "../hooks/useAuth";
import { ConfirmModal, ProgressModal } from "../components/Modal";
import UserMenu from "../components/UserMenu";

type Tab = "health" | "prompts" | "sources" | "persons";

export default function Admin() {
  const [tab, setTab] = useState<Tab>("health");
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="admin-theme min-h-screen">
      <header className="border-b border-[var(--surface-border)] bg-[var(--surface-titlebar)]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-bold tracking-[0.2em] uppercase text-[var(--text-heading)] hover:text-[var(--fire-600)] transition-colors">
              Zerogeist
            </Link>
            <span className="text-xs text-[var(--text-muted)]">/ admin</span>
          </div>
          <UserMenu user={user} isAdmin={isAdmin} onLogout={logout} variant="light" />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-6 border-b border-[var(--surface-border)] mb-8">
          {(["health", "prompts", "sources", "persons"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 capitalize transition-colors ${
                tab === t
                  ? "text-[var(--fire-600)] border-b-2 border-[var(--fire-600)]"
                  : "text-[var(--text-placeholder)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {t === "health" ? "Platform Health" : t === "prompts" ? "AI Prompts" : t === "sources" ? "Sources" : "Invites"}
            </button>
          ))}
        </div>

        {tab === "persons" && <PersonsTab />}
        {tab === "sources" && <SourcesTab />}
        {tab === "health" && <HealthTab />}
        {tab === "prompts" && <PromptsTab />}
      </div>
    </div>
  );
}

// ─── Persons Tab ─────────────────────────────────────────
function PersonsTab() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  const { data: persons = [], isLoading } = useQuery({
    queryKey: ["admin-persons"],
    queryFn: () => apiRequest("/api/admin/persons"),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/admin/persons", {
        method: "POST",
        body: JSON.stringify({ email, note: note || undefined }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-persons"] });
      setEmail("");
      setNote("");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiRequest(`/api/admin/persons/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-persons"] });
    },
  });

  return (
    <div className="space-y-8">
      {/* Add form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (email) addMutation.mutate();
        }}
        className="flex gap-3"
      >
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 bg-[var(--surface-card)] border-[0.5px] border-[var(--surface-border)] rounded-lg px-4 py-2 text-sm text-[var(--text-body)] focus:outline-none focus:border-[var(--fire-600)]"
        />
        <input
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="flex-1 bg-[var(--surface-card)] border-[0.5px] border-[var(--surface-border)] rounded-lg px-4 py-2 text-sm text-[var(--text-body)] focus:outline-none focus:border-[var(--fire-600)]"
        />
        <button
          type="submit"
          disabled={addMutation.isPending}
          className="btn-primary text-sm"
        >
          Invite
        </button>
      </form>

      {/* List */}
      {isLoading ? (
        <p className="text-[var(--text-muted)] text-sm">Loading...</p>
      ) : (
        <div className="space-y-2">
          {persons.map((p: any) => (
            <div
              key={p.id}
              className="bg-[var(--surface-card)] border-[0.5px] border-[var(--surface-border)] rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">{p.email}</p>
                {p.note && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">{p.note}</p>
                )}
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Invited {new Date(p.invitedAt).toLocaleDateString()}
                  {p.firstLogin
                    ? ` · First login ${new Date(p.firstLogin).toLocaleDateString()}`
                    : " · Never logged in"}
                  {p.lastLogin && ` · Last seen ${new Date(p.lastLogin).toLocaleDateString()}`}
                  {p.loginCount > 0 && ` · ${p.loginCount} login${p.loginCount !== 1 ? "s" : ""}`}
                </p>
              </div>
              <button
                onClick={() =>
                  toggleMutation.mutate({ id: p.id, active: !p.active })
                }
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  p.active
                    ? "bg-[var(--succulent-50)] text-[var(--succulent-800)] hover:bg-[var(--fire-50)] hover:text-[var(--fire-800)]"
                    : "bg-[var(--fire-50)] text-[var(--fire-800)] hover:bg-[var(--succulent-50)] hover:text-[var(--succulent-800)]"
                }`}
              >
                {p.active ? "Active" : "Revoked"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sources Tab ─────────────────────────────────────────
function SourcesTab() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["admin-sources"],
    queryFn: () => apiRequest("/api/admin/sources"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiRequest(`/api/admin/sources/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sources"] });
    },
  });

  // Dot encodes source type, not run status
  const sourceTypeDotStyle = (type: string) => {
    switch (type) {
      case "pmg": return { backgroundColor: "var(--source-pmg)" };
      case "reliefweb": return { backgroundColor: "var(--source-reliefweb)" };
      case "reddit": return { backgroundColor: "var(--source-reddit)" };
      case "twitter": return { backgroundColor: "var(--source-twitter)" };
      default: return { backgroundColor: "var(--dust-400)" };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className={showAdd ? "btn-ghost text-sm" : "btn-primary text-sm"}
        >
          {showAdd ? "Cancel" : "+ Add source"}
        </button>
      </div>

      {showAdd && <AddSourceForm onDone={() => setShowAdd(false)} />}

      {isLoading ? (
        <p className="text-[var(--text-muted)] text-sm">Loading...</p>
      ) : (
        <div className="space-y-3">
          {sources.map((s: any) => (
            <div
              key={s.id}
              className="bg-[var(--surface-card)] border-[0.5px] border-[var(--surface-border)] rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={sourceTypeDotStyle(s.type)} />
                    <p className="font-medium">{s.name}</p>
                    <span className="text-xs text-[var(--text-secondary)] bg-[var(--surface-hover)] px-2 py-0.5 rounded">
                      {s.type}
                    </span>
                  </div>
                  <p className="text-[13px] text-[var(--text-muted)]">{s.identifier}</p>
                </div>
                <button
                  onClick={() => toggleMutation.mutate({ id: s.id, active: !s.active })}
                  className={`text-xs px-3 py-1 rounded-full ${
                    s.active
                      ? "bg-[var(--succulent-50)] text-[var(--succulent-800)]"
                      : "bg-[var(--fire-50)] text-[var(--fire-800)]"
                  }`}
                >
                  {s.active ? "Active" : "Inactive"}
                </button>
              </div>
              <div className="flex gap-6 mt-3 text-xs text-[var(--text-muted)]">
                <span>Difficulty: {"*".repeat(s.difficulty)}</span>
                <span>Signal: {"*".repeat(s.signalQuality)}</span>
                <span>Est. cost: ${s.costPerRun?.toFixed(2)}</span>
                {s.lastRunCost != null && <span>Last cost: ${s.lastRunCost.toFixed(2)}</span>}
                {s.lastRun && <span>Last run: {new Date(s.lastRun).toLocaleString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddSourceForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    type: "reddit" as string,
    identifier: "",
    region: "national" as string,
    province: "",
    language: "en",
    difficulty: 1,
    costPerRun: 0,
    signalQuality: 3,
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/admin/sources", {
        method: "POST",
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sources"] });
      onDone();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="bg-[var(--surface-card)] border-[0.5px] border-[var(--surface-border)] rounded-lg p-6 space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="bg-[var(--surface-input)] border-[0.5px] border-[var(--surface-border)] rounded px-3 py-2 text-sm text-[var(--text-heading)]"
        />
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="bg-[var(--surface-input)] border-[0.5px] border-[var(--surface-border)] rounded px-3 py-2 text-sm text-[var(--text-heading)]"
        >
          {["reddit", "reliefweb", "pmg", "telegram", "rss", "twitter", "other"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          placeholder="Identifier (subreddit, URL, etc.)"
          value={form.identifier}
          onChange={(e) => setForm({ ...form, identifier: e.target.value })}
          className="col-span-2 bg-[var(--surface-input)] border-[0.5px] border-[var(--surface-border)] rounded px-3 py-2 text-sm text-[var(--text-heading)]"
        />
        <select
          value={form.region}
          onChange={(e) => setForm({ ...form, region: e.target.value })}
          className="bg-[var(--surface-input)] border-[0.5px] border-[var(--surface-border)] rounded px-3 py-2 text-sm text-[var(--text-heading)]"
        >
          {["national", "provincial", "local"].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <input
          placeholder="Province (if provincial)"
          value={form.province}
          onChange={(e) => setForm({ ...form, province: e.target.value })}
          className="bg-[var(--surface-input)] border-[0.5px] border-[var(--surface-border)] rounded px-3 py-2 text-sm text-[var(--text-heading)]"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn-primary text-sm"
        >
          Add source
        </button>
      </div>
    </form>
  );
}

// ─── Health Tab ──────────────────────────────────────────
function HealthTab() {
  const queryClient = useQueryClient();
  const [polling, setPolling] = useState(false);
  const [showBanish, setShowBanish] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-health"],
    queryFn: () => apiRequest("/api/admin/health"),
    refetchInterval: polling ? 3000 : false,
  });

  const { data: progress } = useQuery({
    queryKey: ["admin-cycle-progress"],
    queryFn: () => apiRequest("/api/admin/cycle/progress"),
    refetchInterval: polling ? 2000 : false,
  });

  const cycleStatus = data?.todaysCycle?.status;
  const cycleDone = cycleStatus === "completed" || cycleStatus === "failed";
  if (polling && cycleDone) {
    setTimeout(() => setPolling(false), 1000);
  }

  const triggerMutation = useMutation({
    mutationFn: (mode: string = "full") =>
      apiRequest(`/api/admin/cycle/trigger?mode=${mode}`, { method: "POST" }),
    onSuccess: () => {
      setPolling(true);
      queryClient.invalidateQueries({ queryKey: ["admin-health"] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (from: string) => {
      await apiRequest(`/api/admin/cycle/today?from=${from}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-health"] });
    },
  });

  if (isLoading) return <p className="text-[var(--text-muted)] text-sm">Loading...</p>;

  const hasCycle = !!data?.todaysCycle;
  const isRunning = cycleStatus === "in_progress";
  const showingDate = data?.todaysSnapshot?.generated
    ? data.todaysSnapshot.date
    : data?.showingSnapshotDate || null;

  return (
    <div className="space-y-6">
      {/* Platform stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Active Persons" value={data?.activePersons ?? 0} />
        <StatCard label="Active Sources" value={data?.activeSources ?? 0} />
        <StatCard
          label="Active Reading"
          value={showingDate || "No data"}
        />
      </div>

      {/* ═══ TODAY'S CYCLE CARD ═══ */}
      <div className="bg-[var(--surface-card)] border-[0.5px] border-[var(--surface-border)] rounded-lg overflow-hidden">

        {/* Card header */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--surface-border)" }}>
          <div className="flex items-center gap-3">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">Today's Reading</p>
            {hasCycle && (
              <span className={`text-xs font-medium ${
                cycleStatus === "completed" ? "text-[var(--succulent-600)]" :
                cycleStatus === "failed" ? "text-[var(--fire-600)]" :
                "text-[var(--canola-400)]"
              }`}>
                {cycleStatus === "in_progress" ? "Running..." : cycleStatus}
              </span>
            )}
            {!hasCycle && <span className="text-xs text-[var(--text-placeholder)]">Not started</span>}
          </div>

          {hasCycle && !isRunning && (
            <span className="text-[10px] text-[var(--text-placeholder)]">
              ${data.todaysCycle.totalCost?.toFixed(4) ?? "0.00"}
            </span>
          )}
        </div>

        {/* Live progress — shown during cycle run */}
        {(polling || progress) && (
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--surface-border)" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Progress</p>
              {progress && (
                <p className="text-xs text-[var(--canola-400)] animate-pulse">{progress.detail}</p>
              )}
            </div>
            {progress && (
              <div className="space-y-1">
                {(progress.steps || []).map((step: any) => (
                  <div key={step.name} className="flex items-center gap-3">
                    <span className="w-3 text-center text-xs">
                      {step.status === "done" && <span className="text-[var(--succulent-600)]">✓</span>}
                      {step.status === "running" && <span className="text-[var(--canola-400)] animate-pulse">●</span>}
                      {step.status === "failed" && <span className="text-[var(--fire-600)]">✗</span>}
                      {step.status === "pending" && <span className="text-[var(--text-placeholder)]">○</span>}
                    </span>
                    <span className={`text-xs flex-1 ${step.status === "running" ? "text-[var(--text-heading)]" : "text-[var(--text-muted)]"}`}>
                      {step.name}
                    </span>
                    {step.detail && <span className="text-xs text-[var(--text-muted)]">{step.detail}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Source breakdown — only show if there are posts today */}
        {data?.sourceBreakdown?.some((s: any) => s.postsToday > 0) && (
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--surface-border)" }}>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">Sources</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {data.sourceBreakdown.map((s: any) => (
                <div key={s.type} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-center">
                    {s.postsToday > 0
                      ? <span className="text-[var(--succulent-600)]">✓</span>
                      : s.lastRunStatus === "failed"
                      ? <span className="text-[var(--fire-600)]">✗</span>
                      : <span className="text-[var(--text-placeholder)]">○</span>
                    }
                  </span>
                  <span className="font-medium text-[var(--text-heading)]">{s.type}</span>
                  <span className="text-[var(--text-muted)]">
                    {s.postsToday > 0 ? s.postsToday : s.lastRunStatus === "failed" ? "err" : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error display */}
        {data?.todaysCycle?.failedAtStep && (
          <div className="px-4 py-2" style={{ borderBottom: "1px solid var(--surface-border)" }}>
            <p className="text-xs text-[var(--fire-800)]">Failed at: {data.todaysCycle.failedAtStep}</p>
          </div>
        )}

        {/* Actions — inside the card */}
        <div className="px-4 py-3 flex gap-2 flex-wrap items-center" style={{ backgroundColor: "var(--surface-input)" }}>
          {!hasCycle ? (
            // No cycle yet — just trigger
            <button
              onClick={() => triggerMutation.mutate("full")}
              disabled={triggerMutation.isPending}
              className="btn-primary text-sm"
            >
              {triggerMutation.isPending ? "Starting..." : "Read today's geist"}
            </button>
          ) : isRunning ? (
            // Running — show status only
            <p className="text-xs text-[var(--canola-400)] animate-pulse">Reading the field...</p>
          ) : (
            // Completed or failed — show all actions
            <>
              <button
                onClick={() => triggerMutation.mutate("full")}
                disabled={triggerMutation.isPending || polling}
                className="btn-primary text-sm"
              >
                Re-read geist
              </button>
              <button
                onClick={() => {
                  resetMutation.mutate("summarise");
                  setTimeout(() => triggerMutation.mutate("resummarize"), 500);
                }}
                disabled={triggerMutation.isPending || polling}
                className="btn-secondary text-sm"
              >
                Re-summarise
              </button>
              <button
                onClick={() => {
                  resetMutation.mutate("synthesise");
                  setTimeout(() => triggerMutation.mutate("resynthesize"), 500);
                }}
                disabled={triggerMutation.isPending || polling}
                className="btn-secondary text-sm"
              >
                Re-synthesise
              </button>
              <button
                onClick={() => setShowBanish(true)}
                disabled={resetMutation.isPending || polling}
                className="btn-destructive text-sm ml-auto"
              >
                Clear today's reading
              </button>
            </>
          )}
        </div>
      </div>

      {/* Recent readings */}
      {data?.recentReadings?.length > 0 && (
        <div className="bg-[var(--surface-card)] border-[0.5px] border-[var(--surface-border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--surface-border)" }}>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">Previous Readings</p>
          </div>
          <div>
            {data.recentReadings.map((r: any) => (
              <div
                key={r.date}
                className="px-4 py-3 flex items-center justify-between text-sm"
                style={{ borderBottom: "1px solid var(--surface-border)" }}
              >
                <div className="flex items-center gap-3">
                  <span className="w-3 text-center">
                    {r.status === "completed"
                      ? <span className="text-[var(--succulent-600)]">✓</span>
                      : <span className="text-[var(--fire-600)]">✗</span>
                    }
                  </span>
                  <span className="font-medium text-[var(--text-heading)]">
                    {new Date(r.date + "T00:00:00").toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                  <span>{r.sourcesRun} sources</span>
                  <span>${r.totalCost?.toFixed(4)}</span>
                  {r.completedAt && (
                    <span>{new Date(r.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clear confirmation modal */}
      <ConfirmModal
        isOpen={showBanish}
        title="Clear today's reading"
        message={"This will clear all of today's raw posts, summaries, and the reading.\n\nThe dashboard will fall back to the previous day's geist until you take a new reading."}
        confirmLabel="Clear today's reading"
        cancelLabel="Keep reading"
        destructive
        onConfirm={() => {
          setShowBanish(false);
          resetMutation.mutate("all");
        }}
        onCancel={() => setShowBanish(false)}
      />

      {/* Progress modal — shown during cycle runs */}
      <ProgressModal
        isOpen={polling && !!progress}
        title="Taking today's reading..."
        detail={progress?.detail}
        steps={progress?.steps}
        closable={cycleDone}
        onClose={() => setPolling(false)}
      />
    </div>
  );
}

// ─── Prompts Tab ────────────────────────────────────────
function PromptsTab() {
  const queryClient = useQueryClient();

  const { data: prompts = [], isLoading } = useQuery({
    queryKey: ["admin-prompts"],
    queryFn: () => apiRequest("/api/admin/prompts"),
  });

  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const saveMutation = useMutation({
    mutationFn: ({ id, prompt }: { id: string; prompt: string }) =>
      apiRequest(`/api/admin/prompts/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: id === "haiku_summarise" ? "Haiku Summariser" : "Sonnet Synthesiser",
          description: id === "haiku_summarise"
            ? "Analyses each post batch: geo-attribution, emotion, themes, voice extraction"
            : "Synthesises the world snapshot from summaries: weather digest, province emotions, themes",
          prompt,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-prompts"] });
      setEditing(null);
    },
  });

  // Default prompts for initial seeding
  const DEFAULTS: Record<string, { name: string; description: string }> = {
    haiku_summarise: {
      name: "Haiku Summariser",
      description: "Analyses each post batch: geo-attribution, emotion, themes, voice extraction (runs ~8 times per cycle)",
    },
    sonnet_synthesise: {
      name: "Sonnet Synthesiser",
      description: "Synthesises the world snapshot from summaries: weather digest, province emotions, themes (runs once per cycle)",
    },
  };

  const promptMap = new Map(prompts.map((p: any) => [p.id, p]));

  if (isLoading) return <p className="text-[var(--text-muted)] text-sm">Loading...</p>;

  return (
    <div className="space-y-6">
      <p className="text-xs text-[var(--text-muted)]">
        These prompts are the brain of the system. Haiku does mechanical extraction (cheap, per-batch).
        Sonnet does creative synthesis (the weather metaphors). Changes take effect on the next cycle run.
      </p>

      {Object.entries(DEFAULTS).map(([id, meta]) => {
        const saved = promptMap.get(id);
        const isEditing = editing === id;
        const currentPrompt = saved?.prompt || "(using default from code — click Edit to customise)";

        return (
          <div key={id} className="bg-[var(--surface-card)] border-[0.5px] border-[var(--surface-border)] rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{meta.name}</h3>
                <p className="text-[13px] text-[var(--text-muted)] mt-0.5">{meta.description}</p>
              </div>
              <div className="flex gap-2">
                {!isEditing ? (
                  <button
                    onClick={() => {
                      setEditing(id);
                      setEditValue(saved?.prompt || "");
                    }}
                    className="text-xs px-3 py-1 bg-[var(--surface-input)] border-[0.5px] border-[var(--surface-border)] rounded hover:border-[var(--fire-600)] transition-colors"
                  >
                    {saved ? "Edit" : "Customise"}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => saveMutation.mutate({ id, prompt: editValue })}
                      disabled={saveMutation.isPending}
                      className="btn-primary text-xs"
                    >
                      {saveMutation.isPending ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="text-xs px-3 py-1 text-[var(--text-muted)] hover:text-[var(--text-heading)]"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full bg-[var(--surface-input)] border-[0.5px] border-[var(--surface-border)] rounded-lg p-4 text-sm text-[var(--text-body)] font-mono resize-y focus:outline-none focus:border-[var(--fire-600)] transition-colors"
                  style={{ minHeight: "300px" }}
                  placeholder="Enter the prompt template. Use ${provinceContext}, ${postsText}, ${provinceSummaryText} etc. as placeholders — they'll be filled in at runtime."
                />
                <p className="text-[10px] text-[var(--text-muted)]">
                  {editValue.length} characters · Changes apply on next cycle run
                </p>
              </div>
            ) : (
              <div className="bg-[var(--surface-input)] rounded-lg p-4 max-h-48 overflow-y-auto">
                <pre className="text-xs text-[var(--text-muted)] whitespace-pre-wrap font-mono leading-relaxed">
                  {currentPrompt}
                </pre>
              </div>
            )}

            {saved?.updatedAt && (
              <p className="text-[10px] text-[var(--text-muted)]">
                Last updated: {new Date(saved.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[var(--surface-card)] border-[0.5px] border-[var(--surface-border)] rounded-lg p-4">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="text-xl font-semibold mt-1 text-[var(--text-heading)]">{value}</p>
    </div>
  );
}
