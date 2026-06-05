import Orb from "@/components/ui/orb";
import { ReactNode } from "react";
import { Toast } from "@base-ui/react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-auto relative bg-black text-white">
      <div className="absolute inset-0 z-0">
        <Orb
          hoverIntensity={0.39}
          rotateOnHover={false}
          hue={0}
          forceHoverState={false}
          backgroundColor="#000000"
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center pointer-events-none">
        <main className="w-full max-w-md flex items-center justify-center px-5 pointer-events-auto">
          {children}
        </main>
        <footer className="absolute bottom-0 w-full py-3 text-center text-sm text-white/60 pointer-events-auto">
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
    </div>
  );
}
