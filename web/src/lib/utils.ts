import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * The shadcn class helper: clsx resolves conditionals, tailwind-merge drops
 * earlier utilities that a later one overrides (so `cn("p-2", "p-4")` is
 * `p-4`, not both).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
