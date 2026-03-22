import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { Link } from "wouter";

export default function Settings() {
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiRequest("/api/settings"),
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--zg-border)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-bold tracking-[0.2em] uppercase hover:text-[var(--zg-teal)] transition-colors">
            Zerogeist
          </Link>
          <span className="text-xs text-[var(--zg-muted)]">/ settings</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h2 className="text-xs tracking-widest uppercase text-[var(--zg-muted)] mb-8">
          Your Proxy
        </h2>

        {isLoading ? (
          <p className="text-[var(--zg-muted)] text-sm">Loading...</p>
        ) : !data?.proxy ? (
          <p className="text-[var(--zg-muted)] text-sm">
            Your proxy hasn't been initialised yet. Answer your first question to begin.
          </p>
        ) : (
          <div className="space-y-10">
            <ProxySection title="Values" items={data.proxy.values} field="values" />
            <ProxySection title="Tensions" items={data.proxy.tensions} field="tensions" />
            <ProxySection title="Unknowns" items={data.proxy.unknowns} field="unknowns" />
            <ProxySection title="Blind Spots" items={data.proxy.blindSpots} field="blind_spots" />

            <section>
              <h3 className="text-xs tracking-widest uppercase text-[var(--zg-muted)] mb-4">
                Confidence
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-[var(--zg-surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--zg-teal)] rounded-full transition-all"
                    style={{ width: `${(data.proxy.confidenceScore || 0) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-[var(--zg-muted)]">
                  {Math.round((data.proxy.confidenceScore || 0) * 100)}%
                </span>
              </div>
              <p className="text-xs text-[var(--zg-muted)] mt-2">
                {data.proxy.daysActive || 0} days active
              </p>
            </section>

            {data.editHistory?.length > 0 && (
              <section>
                <h3 className="text-xs tracking-widest uppercase text-[var(--zg-muted)] mb-4">
                  Correction History
                </h3>
                <div className="space-y-2">
                  {data.editHistory.map((edit: any) => (
                    <div
                      key={edit.id}
                      className="bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg p-4 text-sm"
                    >
                      <span className="text-[var(--zg-muted)]">
                        {new Date(edit.editedAt).toLocaleDateString()} —{" "}
                      </span>
                      <span className="text-[var(--zg-teal)]">{edit.field}</span>
                      {edit.reason && (
                        <p className="text-[var(--zg-muted)] mt-1 text-xs">
                          {edit.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function ProxySection({
  title,
  items,
  field,
}: {
  title: string;
  items: any[];
  field: string;
}) {
  if (!items || items.length === 0) {
    return (
      <section>
        <h3 className="text-xs tracking-widest uppercase text-[var(--zg-muted)] mb-4">
          {title}
        </h3>
        <p className="text-sm text-[var(--zg-muted)]">
          None discovered yet.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h3 className="text-xs tracking-widest uppercase text-[var(--zg-muted)] mb-4">
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((item: any, i: number) => (
          <div
            key={i}
            className="bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg p-4 flex items-start justify-between group"
          >
            <div>
              <p className="text-sm">{item.name || item.description}</p>
              {item.confidence !== undefined && (
                <p className="text-xs text-[var(--zg-muted)] mt-1">
                  Confidence: {Math.round(item.confidence * 100)}%
                  {item.mentionCount ? ` · ${item.mentionCount} mentions` : ""}
                </p>
              )}
              {item.priority !== undefined && (
                <p className="text-xs text-[var(--zg-muted)] mt-1">
                  Priority: {item.priority}/5
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
