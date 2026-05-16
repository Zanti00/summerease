"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function LoginSuccessToast() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledLoginToast = useRef(false);

  useEffect(() => {
    if (
      handledLoginToast.current ||
      searchParams.get("login") !== "success"
    ) {
      return;
    }

    handledLoginToast.current = true;
    toast.success("Welcome back!");

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("login");

    const queryString = nextSearchParams.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  return null;
}
