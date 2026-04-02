import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from "@/lib/schemas/auth.schema";

export function useResetPasswordForm() {
  return useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });
}
