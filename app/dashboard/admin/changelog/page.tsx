import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ChangelogView } from "@/components/admin/changelog-view";

export const metadata = {
  title: "System Changelog | Newgen Financial Systems",
  description: "View platform version releases, what's new, and architectural milestones.",
};

export default async function AdminChangelogPage() {
  const session = await auth();

  // Strictly restricted to ADMIN role only
  if (!session?.user?.id || (session.user as { role?: string })?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <ChangelogView />;
}

