import { CheckCircle2, Clock, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  switch (status) {
    case "APPROVED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 text-sm font-semibold text-stat-1 ${className || ""}`}
        >
          <CheckCircle2 className="size-4" />
          <span>Approved</span>
        </span>
      );
    case "REJECTED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 text-sm font-semibold text-destructive ${className || ""}`}
        >
          <XCircle className="size-4" />
          <span>Rejected</span>
        </span>
      );
    case "PENDING":
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground ${className || ""}`}
        >
          <Clock className="size-4" />
          <span>Pending</span>
        </span>
      );
  }
}
