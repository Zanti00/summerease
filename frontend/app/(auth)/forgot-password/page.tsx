import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { LightWavesBackground } from "@/components/ui/light-waves";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ROUTES } from "@/app/constants/routes";
import { ArrowLeft, Icon } from "lucide-react";
export default function ForgotPassword() {
  return (
    <div className="min-h-screen overflow-auto">
      <LightWavesBackground>
        <div className="min-h-screen flex flex-col items-center justify-center">
          <div className="flex w-full p-6">
            <Link href={ROUTES.auth.login}>
              <ArrowLeft></ArrowLeft>
            </Link>
          </div>
          <main className="w-full max-w-md flex-1 flex items-center justify-center px-5">
            <Card className="p-6 mx-auto w-full max-w-md shadow-2xl">
              <Field>
                <FieldLabel>Email address</FieldLabel>
                <Input type="text" placeholder="Enter your email"></Input>
              </Field>
              <Button>Send email</Button>
            </Card>
          </main>
          <footer className="w-full py-3 text-center text-sm text-ring">
            <span>
              {" "}
              © {new Date().getFullYear()} SummerEase. All rights reserved.
            </span>
            <div className="flex gap-2 justify-center">
              <span>Terms of Services</span>
              <span>Privacy Policy</span>
            </div>
          </footer>
        </div>
      </LightWavesBackground>
    </div>
  );
}
