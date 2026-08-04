import { SessionGuard } from "@/components/auth/session-guard";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { requireCurrentEmployee } from "@/lib/auth/session";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await requireCurrentEmployee();
  return (
    <div className="min-h-screen bg-[#f4f6f4]">
      <SessionGuard expiresAt={currentUser.sessionExpiresAt} />
      <AppSidebar user={currentUser} />
      <AppHeader user={currentUser} />
      <main className="ml-[76px] min-h-screen pt-[72px] lg:ml-[244px]">
        {children}
      </main>
    </div>
  );
}
