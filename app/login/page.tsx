"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/schemas/auth";
import { loginAction } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldAlert,
} from "lucide-react";
import { LoginMorphButton, MorphPhase } from "@/components/auth/login-morph-button";
import { SunMoonThemeToggle } from "@/components/shared/animated-theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [phase, setPhase] = React.useState<MorphPhase>("idle");
  const [showPassword, setShowPassword] = React.useState(false);
  const [forgotOpen, setForgotOpen] = React.useState(false);

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDarkMode =
      savedTheme === "dark" ||
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setErrorMsg(null);
    setLoading(true);
    setPhase("authenticating");

    const startTime = Date.now();

    try {
      const res = await loginAction(data);

      // Keep orb spinning for 2.5s so the full authenticating animation runs smoothly
      const elapsed = Date.now() - startTime;
      if (elapsed < 2500) {
        await new Promise((resolve) => setTimeout(resolve, 2500 - elapsed));
      }

      if (!res.success) {
        setPhase("error");
        setErrorMsg(res.error || "Invalid login credentials. Please try again.");
      } else {
        setPhase("success");
      }
    } catch {
      setPhase("error");
      setErrorMsg("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setPhase("idle");
  };

  return (
    <div className="h-screen w-full bg-background text-foreground antialiased flex overflow-hidden selection:bg-muted/40">
      {/* LEFT COLUMN: Brand, Form & Controls (2/3 width) */}
      <div className="w-full lg:w-2/3 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 h-full overflow-y-auto no-scrollbar">
        {/* Top Header / Branding Bar */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-2xl bg-foreground text-background flex items-center justify-center font-bold text-base shadow-xs">
              N
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Newgen ERP
            </span>
          </div>

          <SunMoonThemeToggle
            size={42}
            duration={1200}
            sky={true}
            storageKey="theme"
            syncDocument={true}
            onThemeChange={(theme) => {
              document.documentElement.style.colorScheme = theme;
            }}
            className="border-muted/30 hover:border-muted/60 transition-all shadow-xs"
          />
        </div>

        {/* Center: Main Glassmorphic Form Card */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="glass-panel relative overflow-hidden rounded-3xl p-8 sm:p-10 shadow-2xl border-muted/30">
            {/* Card background watermark using next/image with clean visible opacity */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden rounded-3xl"
            >
              <Image
                src="/dashboard-card.svg"
                alt=""
                fill
                priority
                unoptimized
                className="object-cover object-center opacity-15 dark:opacity-15"
              />
            </div>

            {/* Card Content */}
            <div className="relative z-10 space-y-7">
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground transition-all duration-300">
                  {phase === "success"
                    ? "Access Granted"
                    : phase === "authenticating"
                      ? "Verifying Access"
                      : "Sign In"}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {phase === "success"
                    ? "Redirecting to your dashboard..."
                    : "Enter your credentials to access Newgen ERP."}
                </p>
              </div>

              {errorMsg && phase === "idle" && (
                <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive animate-in fade-in">
                  <AlertCircle className="size-5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div
                  className={`space-y-5 transition-all duration-500 ease-in-out ${phase !== "idle"
                    ? "opacity-0 max-h-0 overflow-hidden pointer-events-none -translate-y-2"
                    : "opacity-100 max-h-[500px] translate-y-0"
                    }`}
                >
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-4 size-5 text-muted-foreground pointer-events-none" />
                      <Input
                        type="email"
                        placeholder="name@newgen.lk"
                        {...register("email")}
                        className="h-13 rounded-2xl bg-surface/50 backdrop-blur-xs border-muted/30 pl-12 pr-4 text-sm font-medium placeholder:text-muted-foreground/50 focus:border-foreground/50"
                        autoComplete="email"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs font-medium text-destructive">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-foreground">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setForgotOpen(true)}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 size-5 text-muted-foreground pointer-events-none" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        {...register("password")}
                        className="h-13 rounded-2xl bg-surface/50 backdrop-blur-xs border-muted/30 pl-12 pr-12 text-sm font-medium placeholder:text-muted-foreground/50 focus:border-foreground/50"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-3.5 text-muted-foreground hover:text-foreground transition-colors p-1"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs font-medium text-destructive">
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* The Submit button morphs into the 3D rotating canvas particle orb */}
                <LoginMorphButton
                  phase={phase}
                  loading={loading}
                  errorMessage={errorMsg}
                  onRetry={handleRetry}
                  onSuccessNavigate={() => {
                    window.location.href = "/dashboard";
                  }}
                />
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground/70 pt-4">
          <span>Newgen Financial Systems</span>
          <span className="font-mono">v2.0.0</span>
        </div>
      </div>

      {/* RIGHT COLUMN: 1/3 Screen Width Hero Visual (Right Corner) */}
      <div className="hidden lg:block lg:w-1/3 h-full relative select-none">
        <div className="relative h-full w-full overflow-hidden border-l border-muted/20">
          <Image
            src="/login-bg.webp"
            alt="Newgen ERP"
            fill
            priority
            sizes="33vw"
            className="object-cover object-center"
          />
        </div>
      </div>

      {/* Forgot Password Minimal Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="glass-panel max-w-sm rounded-3xl p-8 border-muted/30 shadow-2xl space-y-4">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3 text-foreground">
              <ShieldAlert className="size-6" />
              <DialogTitle className="text-2xl font-bold">Credential Reset</DialogTitle>
            </div>
          </DialogHeader>

          <p className="text-base text-muted-foreground leading-relaxed">
            Contact your system administrator to update account security keys.
          </p>

          <Button
            type="button"
            onClick={() => setForgotOpen(false)}
            className="w-full h-12 rounded-xl bg-surface/70 hover:bg-surface/90 text-foreground font-semibold text-base mt-2"
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}