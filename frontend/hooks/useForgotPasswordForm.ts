import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from "@/lib/schemas/auth.schema";

export function useForgotPasswordForm() {
  return useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
    },
  });
}
