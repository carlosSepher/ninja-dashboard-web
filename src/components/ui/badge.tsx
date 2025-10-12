import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/80",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive: "bg-destructive text-destructive-foreground",
  outline: "text-foreground",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

export const Badge = ({ className, variant = "default", ...props }: BadgeProps) => (
  <div
    className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
      variant === "outline" ? "border-border" : "border-transparent",
      variantClasses[variant],
      className,
    )}
    {...props}
  />
);
