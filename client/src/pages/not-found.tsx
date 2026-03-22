import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-[var(--zg-muted)] mb-8">Nothing here.</p>
      <Link
        href="/"
        className="text-[var(--zg-teal)] text-sm hover:underline"
      >
        Back to Zerogeist
      </Link>
    </div>
  );
}
