"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function AccountForm() {
  return (
    <div className="space-y-12">
      {/* Primary Info */}
      <div className="space-y-6">
        <div className="flex items-center justify-between py-3 border-b border-zinc-800/50">
          <Label
            htmlFor="username"
            className="text-zinc-400 font-medium text-base"
          >
            Name
          </Label>
          <span className="text-zinc-100 font-medium">mobaraq camar</span>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-zinc-800/50">
          <Label
            htmlFor="email"
            className="text-zinc-400 font-medium text-base"
          >
            Email
          </Label>
          <div className="flex items-center gap-2 text-zinc-100 font-medium cursor-pointer hover:text-white transition-colors">
            <span>mobaraqcamar@gmail.com</span>
            <span className="text-zinc-500">›</span>
          </div>
        </div>
      </div>

      {/* Inputs for actually changing things */}
      <div className="space-y-6 pt-8 border-t border-zinc-800">
        <div className="grid gap-4">
          <div className="grid gap-2 text-zinc-400">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="johndoe"
              defaultValue="mobaraq"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="grid gap-2 text-zinc-400">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              defaultValue="mobaraqcamar@gmail.com"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button className="bg-white text-black hover:bg-zinc-200 rounded-full px-6 transition-all">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
