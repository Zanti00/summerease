import { LightWavesBackground } from "@/components/ui/light-waves";
import { ReactNode, useMemo } from "react";
import { Toast } from "@base-ui/react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const waves = useMemo(
    () => ({
      colors: ["#ffea00", "#fbff41", "#fbffa7"],
      speed: 1.2,
      intensity: 0.5,
    }),
    [],
  );

  return (
    <div className="min-h-screen overflow-auto">
      <LightWavesBackground {...waves}>
        <div className="min-h-screen flex flex-col items-center justify-center">
          <main className="w-full max-w-md flex-1 flex items-center justify-center px-5">
            {children}
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
