import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { LightWavesBackground } from "@/components/ui/light-waves";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
export default function LoginPage() {
  return (
    <div className="min-h-screen overflow-auto">
      <LightWavesBackground>
        <div className="min-h-screen flex flex-col items-center justify-center">
          <main className="w-full max-w-md flex-1 flex items-center justify-center">
            <Card className="p-6 mx-auto w-full max-w-md shadow-2xl">
              <Field>
                <FieldLabel>Email address</FieldLabel>
                <Input type="text" placeholder="Enter your email"></Input>
                <FieldLabel>Password</FieldLabel>
                <Input
                  type="password"
                  placeholder="Enter your password"
                ></Input>
              </Field>
              <Field orientation={"horizontal"}>
                <Checkbox
                  id="remember-me-checkbox"
                  name="remember-me-checkbox"
                ></Checkbox>
                <Label htmlFor="remember-me-checkbox">Remember me</Label>
              </Field>
              <div className="flex justify-end text-primary">
                <p>Forgot password?</p>
              </div>
              <Button>Log In</Button>
              <div className="flex items-center gap-3">
                <hr className="flex-1 border-t border-ring" />
                <span className="text-xs uppercase text-ring">
                  or continue with
                </span>
                <hr className="flex-1 border-t border-ring" />
              </div>
              <Button className={"bg-border text-white"}>Google</Button>
              <div className="flex gap-1 justify-center">
                <p>Don&apos;t have an account?</p>
                <p className="text-primary">Sign up</p>
              </div>
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
