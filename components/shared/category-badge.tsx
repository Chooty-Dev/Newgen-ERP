import { Badge } from "@/components/ui/badge";

interface CategoryBadgeProps {
  name: string;
  colorToken?: "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5" | string;
  type?: "EXPENSE" | "INCOME" | string;
  className?: string;
}

export function CategoryBadge({
  name,
  colorToken = "chart-1",
  className,
}: CategoryBadgeProps) {
  const dotClassMap: Record<string, string> = {
    "chart-1": "bg-primary",
    "chart-2": "bg-muted-foreground",
    "chart-3": "bg-foreground",
    "chart-4": "bg-primary/70",
    "chart-5": "bg-muted-foreground/70",
  };

  const bgDot = dotClassMap[colorToken] || "bg-primary";

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-2 font-medium border-muted/30 bg-surface/40 text-foreground px-3 py-1 rounded-full max-w-full min-w-0 shrink overflow-hidden text-sm ${className || ""}`}
      title={name}
    >
      <span className={`size-2 shrink-0 rounded-full ${bgDot}`} />
      <span className="truncate min-w-0 flex-1">{name}</span>
    </Badge>
  );
}

export function ColorSwatchSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const swatches = [
    { token: "chart-1", label: "Accent 1" },
    { token: "chart-2", label: "Accent 2" },
    { token: "chart-3", label: "Accent 3" },
    { token: "chart-4", label: "Accent 4" },
    { token: "chart-5", label: "Accent 5" },
  ];

  const swatchClasses: Record<string, string> = {
    "chart-1": "bg-foreground",
    "chart-2": "bg-muted-foreground",
    "chart-3": "bg-primary",
    "chart-4": "bg-surface border border-muted/40",
    "chart-5": "bg-muted",
  };

  return (
    <div className="flex items-center gap-3">
      {swatches.map((s) => {
        const isSelected = value === s.token;
        return (
          <button
            key={s.token}
            type="button"
            onClick={() => onChange(s.token)}
            className={`group relative flex size-9 items-center justify-center rounded-full border-2 transition-all cursor-pointer ${
              isSelected ? "border-foreground scale-105" : "border-transparent hover:border-muted/40"
            }`}
            title={s.label}
          >
            <span className={`size-6 rounded-full ${swatchClasses[s.token]}`} />
          </button>
        );
      })}
    </div>
  );
}
