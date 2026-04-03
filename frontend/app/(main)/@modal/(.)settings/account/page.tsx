"use client";

import { SettingsDialog } from "@/components/settings-dialog";
import { AccountForm } from "@/components/account-form";

export default function AccountModalPage() {
  return (
    <SettingsDialog>
      <AccountForm />
    </SettingsDialog>
  );
}
