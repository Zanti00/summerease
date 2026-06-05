"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VerifyPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (passwordOrEmail: string) => Promise<void>;
  title?: string;
  description?: string;
  isLoading?: boolean;
  isOAuth?: boolean;
}

export function VerifyPasswordModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Verify Password",
  description = "Please enter your password to confirm this action.",
  isLoading = false,
  isOAuth = false,
}: VerifyPasswordModalProps) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue) {
      toast.error(isOAuth ? "Email is required." : "Password is required.");
      return;
    }
    try {
      await onConfirm(inputValue);
      setInputValue(""); // Clear input on success
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isOAuth
          ? "Verification failed. Please check your email."
          : "Verification failed. Please check your password.",
      );
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      setInputValue("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>{isOAuth ? "Confirm Deletion" : title}</DialogTitle>
          <DialogDescription>
            {isOAuth
              ? "Please enter your email address to confirm this action."
              : description}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="input-value">{isOAuth ? "Email Address" : "Password"}</Label>
            <Input
              id="input-value"
              type={isOAuth ? "email" : "password"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isOAuth ? "Enter your email address" : "Enter your password"}
              autoFocus
              disabled={isLoading}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={"destructive"}
              disabled={isLoading || !inputValue}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
