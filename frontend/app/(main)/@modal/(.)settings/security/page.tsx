"use client";

import { useState } from "react";
import { SettingsDialog } from "@/components/settings-dialog";
import { SecurityForm } from "@/components/security-form";

export default function SecurityModalPage() {
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  return (
    <SettingsDialog isBlurred={isSubModalOpen}>
      <SecurityForm onSetupOpenChange={setIsSubModalOpen} />
    </SettingsDialog>
  );
}
