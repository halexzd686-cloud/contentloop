import { Sidebar } from "./sidebar";

/**
 * ContentLoop App Shell
 * Sidebar + Main Content layout
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-canvas">{children}</main>
    </div>
  );
}
