import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";

interface Props {
  user: { name?: string; email?: string; avatar?: string } | null;
  isAdmin: boolean;
  onLogout: () => void;
  variant?: "dark" | "light";
}

export default function UserMenu({ user, isAdmin, onLogout, variant = "dark" }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const isDark = variant === "dark";

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger — avatar or initials */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 transition-opacity hover:opacity-80"
      >
        {user?.avatar ? (
          <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
            style={{
              backgroundColor: isDark ? "#262626" : "var(--surface-hover, #E8E0CC)",
              color: isDark ? "#fafafa" : "var(--text-secondary, #5C5040)",
            }}
          >
            {(user?.name || user?.email || "?")[0].toUpperCase()}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-56 rounded-lg shadow-lg z-50 overflow-hidden"
          style={{
            backgroundColor: isDark ? "#1a1a1a" : "var(--surface-card, #FFFFFF)",
            border: `1px solid ${isDark ? "#333" : "var(--surface-border, #DDD5C0)"}`,
          }}
        >
          {/* User info */}
          <div
            className="px-4 py-3"
            style={{
              borderBottom: `1px solid ${isDark ? "#262626" : "var(--surface-border, #DDD5C0)"}`,
            }}
          >
            <p
              className="text-sm font-medium truncate"
              style={{ color: isDark ? "#fafafa" : "var(--text-heading, #2C2418)" }}
            >
              {user?.name || "User"}
            </p>
            <p
              className="text-xs truncate mt-0.5"
              style={{ color: isDark ? "#737373" : "var(--text-muted, #8A7860)" }}
            >
              {user?.email || ""}
            </p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="block w-full text-left px-4 py-2 text-sm transition-colors"
                style={{
                  color: isDark ? "#d4d4d4" : "var(--text-body, #3A3020)",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = isDark ? "#262626" : "var(--surface-hover, #E8E0CC)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                Admin
              </Link>
            )}
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="block w-full text-left px-4 py-2 text-sm transition-colors"
              style={{
                color: isDark ? "#d4d4d4" : "var(--text-body, #3A3020)",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = isDark ? "#262626" : "var(--surface-hover, #E8E0CC)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = "transparent";
              }}
            >
              Settings
            </Link>
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="block w-full text-left px-4 py-2 text-sm transition-colors"
              style={{
                color: isDark ? "#d4d4d4" : "var(--text-body, #3A3020)",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = isDark ? "#262626" : "var(--surface-hover, #E8E0CC)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = "transparent";
              }}
            >
              Dashboard
            </Link>
          </div>

          {/* Sign out */}
          <div
            style={{
              borderTop: `1px solid ${isDark ? "#262626" : "var(--surface-border, #DDD5C0)"}`,
            }}
          >
            <button
              onClick={() => { onLogout(); setOpen(false); }}
              className="block w-full text-left px-4 py-2 text-sm transition-colors"
              style={{
                color: isDark ? "#ef4444" : "var(--fire-800, #963D0E)",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = isDark ? "#262626" : "var(--surface-hover, #E8E0CC)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = "transparent";
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
