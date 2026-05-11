// Tiny class-name joiner (no clsx dependency)
export function cn(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(' ');
}
