import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
}

export default function LoadingSpinner({ className }: LoadingSpinnerProps) {
  return (
    <div 
      className={cn(
        "animate-spin rounded-full h-4 w-4 border-b-2 border-current", 
        className
      )}
    />
  );
}
