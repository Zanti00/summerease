import { Suspense } from "react";
import { Topbar } from "@/components/topbar";
import { HeaderProvider } from "@/lib/contexts/header-context";
import { SettingsHashController } from "@/components/settings-hash-controller";
import { LoginSuccessToast } from "@/components/login-success-toast";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HeaderProvider>
      <div className="flex min-h-screen w-full flex-col">
        <Topbar />
        <Suspense fallback={null}>
          <LoginSuccessToast />
        </Suspense>
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-8 pt-6">
          {children}
          <SettingsHashController />
        </main>
      </div>
    </HeaderProvider>
  );
}
