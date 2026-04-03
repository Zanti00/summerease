"use client";

import { PageHeader } from "@/components/page-header";
import { PageSidebar } from "@/components/page-sidebar";
import { User, Shield, Key } from "lucide-react";
import { ROUTES } from "@/app/constants/routes";
import { SecurityForm } from "@/components/security-form";

export default function SecurityPage() {
  const securityItems = [
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
      url: ROUTES.settings.security,
      icon: Shield,
    },
  ];

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Manage your personal account settings and preferences"
      />
      <PageSidebar items={securityItems} />
      <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full py-8">
        <SecurityForm />
      </div>
    </>
  );
}
