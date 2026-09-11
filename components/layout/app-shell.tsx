import { Sidebar } from "./sidebar";

/**
 * ContentLoop App Shell — M7 Phase A
 * Editorial Rail + Paper workspace, 1px structural divider, no shadows.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-canvas">{children}</main>
    </div>
  );
}
