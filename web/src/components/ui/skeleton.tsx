import { cn } from "@/lib/utils";

/**
 * `.skeleton` (index.css) carries the shimmer gradient and is disabled under
 * prefers-reduced-motion. Callers supply the shape.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton rounded-md", className)} {...props} />;
}
