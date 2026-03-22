// Fire-and-forget audit logger
// Logs are written to console in structured format
// Can be extended to write to database if needed

interface AuditEntry {
  action: string;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  detail?: string;
  ipAddress?: string;
}

export function audit(entry: AuditEntry) {
  const log = {
    timestamp: new Date().toISOString(),
    ...entry,
  };

  // Fire and forget — never block the request
  setImmediate(() => {
    console.log("[AUDIT]", JSON.stringify(log));
  });
}
