import { PageHeader } from "@/components/page-header";
import { PageSidebar } from "@/components/page-sidebar";
import { User, Key, Shield } from "lucide-react";
import { ROUTES } from "@/app/constants/routes";
import { AccountForm } from "@/components/account-form";

export default function AccountPage() {
  const profileItems = [
    {
      title: "Account Info",
      url: ROUTES.settings.account,
      icon: User,
    },
    {
      title: "Change Password",
      url: "#password",
      icon: Key,
    },
    {
      title: "Security Configuration",
      url: "#security",
      icon: Shield,
    },
  ];

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Manage your personal account settings and preferences"
      />
      <PageSidebar items={profileItems} />
      <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full py-8">
        <AccountForm />
      </div>
    </>
  );
}
