"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updateProfileSchema,
  changePasswordSchema,
  UpdateProfileInput,
  ChangePasswordInput,
} from "@/schemas/auth";
import { updateProfileAction, changePasswordAction } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  User,
  Lock,
  Loader2,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface SettingsViewProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
    phone?: string;
    shop?: string | null;
    shopName?: string | null;
  };
}

export function SettingsView({ user }: SettingsViewProps) {
  const [activeTab, setActiveTab] = React.useState<"profile" | "security">("profile");

  const profileForm = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user.name || "",
      phone: user.phone || "",
      avatarUrl: "",
    },
  });

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onProfileSubmit = async (data: UpdateProfileInput) => {
    const res = await updateProfileAction(data);
    if (res.success) {
      toast.create({
        title: "Profile saved",
        description: "Your personal details have been updated.",
      });
    } else {
      toast.create({
        title: "Update failed",
        description: res.error || "Failed to update profile.",
        type: "error",
      });
    }
  };

  const onPasswordSubmit = async (data: ChangePasswordInput) => {
    const res = await changePasswordAction(data);
    if (res.success) {
      toast.create({
        title: "Password changed",
        description: "Your security credentials have been updated.",
      });
      passwordForm.reset();
    } else {
      toast.create({
        title: "Failed",
        description: res.error || "Failed to change password.",
        type: "error",
      });
    }
  };

  return (
    <div className="max-w-4xl space-y-10">
      <div className="space-y-1">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-base text-muted-foreground">
          Account Profile & Security Keys
        </p>
      </div>

      {/* Minimal Tabs */}
      <div className="flex rounded-2xl bg-surface/40 p-1.5 border border-muted/20 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`px-6 py-3 rounded-xl text-base font-semibold transition-all flex items-center gap-2.5 ${
            activeTab === "profile"
              ? "bg-foreground text-background shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="size-5" />
          <span>Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`px-6 py-3 rounded-xl text-base font-semibold transition-all flex items-center gap-2.5 ${
            activeTab === "security"
              ? "bg-foreground text-background shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Lock className="size-5" />
          <span>Security</span>
        </button>
      </div>

      {activeTab === "profile" && (
        <div className="glass-panel rounded-3xl p-8 sm:p-12 space-y-8 border-muted/20 shadow-lg">
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-base font-semibold text-foreground">
                  Email
                </label>
                <Input
                  value={user.email || ""}
                  disabled
                  className="h-14 rounded-2xl bg-surface/20 border-muted/20 font-mono text-base opacity-75"
                />
              </div>

              <div className="space-y-2">
                <label className="text-base font-semibold text-foreground">
                  Role
                </label>
                <div className="h-14 rounded-2xl bg-surface/20 border border-muted/20 px-4 flex items-center text-base font-bold text-stat-1 uppercase">
                  {user.role} {user.shopName ? `• ${user.shopName}` : ""}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-base font-semibold text-foreground">
                Name
              </label>
              <Input
                placeholder="Full Name"
                {...profileForm.register("name")}
                className="h-14 rounded-2xl bg-surface/40 border-muted/30 text-base"
              />
              {profileForm.formState.errors.name && (
                <p className="text-sm font-medium text-destructive">
                  {profileForm.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-base font-semibold text-foreground">
                Phone
              </label>
              <Input
                placeholder="+94 77 000 0000"
                {...profileForm.register("phone")}
                className="h-14 rounded-2xl bg-surface/40 border-muted/30 text-base"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                disabled={profileForm.formState.isSubmitting}
                className="h-14 rounded-2xl bg-foreground text-background hover:opacity-90 font-semibold text-base px-8 gap-3"
              >
                {profileForm.formState.isSubmitting ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <>
                    <span>Save Profile</span>
                    <ArrowUpRight className="size-5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "security" && (
        <div className="glass-panel rounded-3xl p-8 sm:p-12 space-y-8 border-muted/20 shadow-lg">
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-base font-semibold text-foreground">
                Current Password
              </label>
              <Input
                type="password"
                placeholder="••••••••••••"
                {...passwordForm.register("currentPassword")}
                className="h-14 rounded-2xl bg-surface/40 border-muted/30 text-base"
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-sm font-medium text-destructive">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-base font-semibold text-foreground">
                New Password
              </label>
              <Input
                type="password"
                placeholder="••••••••••••"
                {...passwordForm.register("newPassword")}
                className="h-14 rounded-2xl bg-surface/40 border-muted/30 text-base"
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-sm font-medium text-destructive">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-base font-semibold text-foreground">
                Confirm New Password
              </label>
              <Input
                type="password"
                placeholder="••••••••••••"
                {...passwordForm.register("confirmPassword")}
                className="h-14 rounded-2xl bg-surface/40 border-muted/30 text-base"
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-sm font-medium text-destructive">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                disabled={passwordForm.formState.isSubmitting}
                className="h-14 rounded-2xl bg-foreground text-background hover:opacity-90 font-semibold text-base px-8 gap-3"
              >
                {passwordForm.formState.isSubmitting ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <>
                    <span>Update Password</span>
                    <ArrowUpRight className="size-5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
