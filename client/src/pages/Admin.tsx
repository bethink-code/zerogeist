import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { Link } from "wouter";

type Tab = "persons" | "sources" | "health";

export default function Admin() {
  const [tab, setTab] = useState<Tab>("persons");

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--zg-border)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-bold tracking-[0.2em] uppercase hover:text-[var(--zg-teal)] transition-colors">
            Zerogeist
          </Link>
          <span className="text-xs text-[var(--zg-muted)]">/ admin</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-6 border-b border-[var(--zg-border)] mb-8">
          {(["persons", "sources", "health"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm capitalize transition-colors ${
                tab === t
                  ? "text-[var(--zg-teal)] border-b-2 border-[var(--zg-teal)]"
                  : "text-[var(--zg-muted)] hover:text-white"
              }`}
            >
              {t === "persons" ? "Invited Persons" : t === "sources" ? "Source Registry" : "Platform Health"}
            </button>
          ))}
        </div>

        {tab === "persons" && <PersonsTab />}
        {tab === "sources" && <SourcesTab />}
        {tab === "health" && <HealthTab />}
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
          className="flex-1 bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--zg-teal)]"
        />
        <input
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="flex-1 bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--zg-teal)]"
        />
        <button
          type="submit"
          disabled={addMutation.isPending}
          className="px-4 py-2 bg-[var(--zg-teal)] text-[var(--zg-dark)] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Invite
        </button>
      </form>

      {/* List */}
      {isLoading ? (
        <p className="text-[var(--zg-muted)] text-sm">Loading...</p>
      ) : (
        <div className="space-y-2">
          {persons.map((p: any) => (
            <div
              key={p.id}
              className="bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium">{p.email}</p>
                {p.note && (
                  <p className="text-xs text-[var(--zg-muted)] mt-1">{p.note}</p>
                )}
                <p className="text-xs text-[var(--zg-muted)] mt-1">
                  Invited {new Date(p.invitedAt).toLocaleDateString()}
                  {p.firstLogin
                    ? ` · First login ${new Date(p.firstLogin).toLocaleDateString()}`
                    : " · Never logged in"}
                </p>
              </div>
              <button
                onClick={() =>
                  toggleMutation.mutate({ id: p.id, active: !p.active })
                }
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  p.active
                    ? "bg-green-900/30 text-green-400 hover:bg-red-900/30 hover:text-red-400"
                    : "bg-red-900/30 text-red-400 hover:bg-green-900/30 hover:text-green-400"
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

  const statusColor = (status: string | null) => {
    switch (status) {
      case "success": return "bg-green-500";
      case "rate_limited": return "bg-amber-500";
      case "failed": return "bg-red-500";
      default: return "bg-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-[var(--zg-teal)] text-[var(--zg-dark)] rounded-lg text-sm font-medium hover:opacity-90"
        >
          {showAdd ? "Cancel" : "Add Source"}
        </button>
      </div>

      {showAdd && <AddSourceForm onDone={() => setShowAdd(false)} />}

      {isLoading ? (
        <p className="text-[var(--zg-muted)] text-sm">Loading...</p>
      ) : (
        <div className="space-y-3">
          {sources.map((s: any) => (
            <div
              key={s.id}
              className="bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${statusColor(s.lastRunStatus)}`} />
                    <p className="text-sm font-medium">{s.name}</p>
                    <span className="text-xs text-[var(--zg-muted)] bg-[var(--zg-dark)] px-2 py-0.5 rounded">
                      {s.type}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--zg-muted)]">{s.identifier}</p>
                </div>
                <button
                  onClick={() => toggleMutation.mutate({ id: s.id, active: !s.active })}
                  className={`text-xs px-3 py-1 rounded-full ${
                    s.active
                      ? "bg-green-900/30 text-green-400"
                      : "bg-red-900/30 text-red-400"
                  }`}
                >
                  {s.active ? "Active" : "Inactive"}
                </button>
              </div>
              <div className="flex gap-6 mt-3 text-xs text-[var(--zg-muted)]">
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
      className="bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg p-6 space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="bg-[var(--zg-dark)] border border-[var(--zg-border)] rounded px-3 py-2 text-sm text-white"
        />
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="bg-[var(--zg-dark)] border border-[var(--zg-border)] rounded px-3 py-2 text-sm text-white"
        >
          {["reddit", "reliefweb", "pmg", "telegram", "rss", "twitter", "other"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          placeholder="Identifier (subreddit, URL, etc.)"
          value={form.identifier}
          onChange={(e) => setForm({ ...form, identifier: e.target.value })}
          className="col-span-2 bg-[var(--zg-dark)] border border-[var(--zg-border)] rounded px-3 py-2 text-sm text-white"
        />
        <select
          value={form.region}
          onChange={(e) => setForm({ ...form, region: e.target.value })}
          className="bg-[var(--zg-dark)] border border-[var(--zg-border)] rounded px-3 py-2 text-sm text-white"
        >
          {["national", "provincial", "local"].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <input
          placeholder="Province (if provincial)"
          value={form.province}
          onChange={(e) => setForm({ ...form, province: e.target.value })}
          className="bg-[var(--zg-dark)] border border-[var(--zg-border)] rounded px-3 py-2 text-sm text-white"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="px-4 py-2 bg-[var(--zg-teal)] text-[var(--zg-dark)] rounded-lg text-sm font-medium"
        >
          Add Source
        </button>
      </div>
    </form>
  );
}

// ─── Health Tab ──────────────────────────────────────────
function HealthTab() {
  const queryClient = useQueryClient();
  const [polling, setPolling] = useState(false);

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

  // Stop polling once cycle completes or fails
  if (polling && data?.todaysCycle?.status && data.todaysCycle.status !== "in_progress") {
    setPolling(false);
  }

  const triggerMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/admin/cycle/trigger", { method: "POST" }),
    onSuccess: () => {
      setPolling(true);
      queryClient.invalidateQueries({ queryKey: ["admin-health"] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (from: string = "all") => {
      await apiRequest(`/api/admin/cycle/today?from=${from}`, { method: "DELETE" });
      await apiRequest("/api/admin/cycle/trigger", { method: "POST" });
    },
    onSuccess: () => {
      setPolling(true);
      queryClient.invalidateQueries({ queryKey: ["admin-health"] });
    },
  });

  if (isLoading) return <p className="text-[var(--zg-muted)] text-sm">Loading...</p>;

  return (
    <div className="space-y-8">
      {/* Controls + Progress — always at top */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => triggerMutation.mutate()}
          disabled={triggerMutation.isPending || polling}
          className="px-4 py-2 bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg text-sm text-[var(--zg-muted)] hover:text-white hover:border-[var(--zg-teal)] transition-colors"
        >
          {triggerMutation.isPending ? "Triggering..." : "Trigger Daily Cycle"}
        </button>

        {data?.todaysCycle && (
          <>
            <button
              onClick={() => resetMutation.mutate("synthesise")}
              disabled={resetMutation.isPending || polling}
              className="px-4 py-2 bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg text-xs text-[var(--zg-muted)] hover:text-amber-400 hover:border-amber-400/50 transition-colors"
              title="Keep raw posts + summaries, re-synthesise only"
            >
              Re-synthesise
            </button>
            <button
              onClick={() => resetMutation.mutate("summarise")}
              disabled={resetMutation.isPending || polling}
              className="px-4 py-2 bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg text-xs text-[var(--zg-muted)] hover:text-orange-400 hover:border-orange-400/50 transition-colors"
              title="Keep raw posts, re-summarise + re-synthesise"
            >
              Re-summarise
            </button>
            <button
              onClick={() => resetMutation.mutate("all")}
              disabled={resetMutation.isPending || polling}
              className="px-4 py-2 bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg text-xs text-red-400/70 hover:text-red-400 hover:border-red-400/50 transition-colors"
              title="Delete everything including raw posts, re-fetch all"
            >
              Full Reset
            </button>
          </>
        )}
      </div>

      {polling && progress && (
        <div className="bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--zg-muted)] uppercase tracking-wider">Cycle Progress</p>
            <p className="text-xs text-amber-400 animate-pulse">{progress.detail}</p>
          </div>
          <div className="space-y-1.5">
            {(progress.steps || []).map((step: any) => (
              <div key={step.name} className="flex items-center gap-3">
                <span className="w-4 text-center">
                  {step.status === "done" && <span className="text-green-400">✓</span>}
                  {step.status === "running" && <span className="text-amber-400 animate-pulse">●</span>}
                  {step.status === "failed" && <span className="text-red-400">✗</span>}
                  {step.status === "pending" && <span className="text-[var(--zg-muted)]">○</span>}
                </span>
                <span className={`text-xs flex-1 ${step.status === "running" ? "text-white" : "text-[var(--zg-muted)]"}`}>
                  {step.name}
                </span>
                {step.detail && (
                  <span className="text-xs text-[var(--zg-muted)]">{step.detail}</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[var(--zg-muted)]">
            Elapsed: {Math.round((Date.now() - progress.startedAt) / 1000)}s
          </p>
        </div>
      )}

      {polling && !progress && (
        <p className="text-xs text-amber-400 animate-pulse">
          Starting cycle...
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Persons" value={data?.activePersons ?? 0} />
        <StatCard label="Active Sources" value={data?.activeSources ?? 0} />
        <StatCard
          label="Today's Snapshot"
          value={data?.todaysSnapshot?.generated ? "Generated" : "Pending"}
        />
        <StatCard
          label="Daily Cycle"
          value={data?.todaysCycle?.status ?? "Not run"}
        />
      </div>

      {data?.todaysCycle && (
        <div className="bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg p-4 space-y-2">
          <p className="text-xs text-[var(--zg-muted)] uppercase tracking-wider">Today's Cycle Details</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-[var(--zg-muted)]">Status: </span>
              <span className={data.todaysCycle.status === "completed" ? "text-green-400" : data.todaysCycle.status === "failed" ? "text-red-400" : "text-amber-400"}>
                {data.todaysCycle.status}
              </span>
            </div>
            <div>
              <span className="text-[var(--zg-muted)]">Sources run: </span>
              {data.todaysCycle.sourcesRun}
            </div>
            <div>
              <span className="text-[var(--zg-muted)]">Persons processed: </span>
              {data.todaysCycle.personsProcessed}
            </div>
            <div>
              <span className="text-[var(--zg-muted)]">Cost: </span>
              ${data.todaysCycle.totalCost?.toFixed(4) ?? "0.00"}
            </div>
          </div>
          {data.todaysCycle.failedAtStep && (
            <p className="text-xs text-red-400">Failed at: {data.todaysCycle.failedAtStep}</p>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg p-4">
      <p className="text-xs text-[var(--zg-muted)]">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}
