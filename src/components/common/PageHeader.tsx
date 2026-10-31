import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <header className={cn("page-header", className)}>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="page-description mt-2 text-sm text-muted-foreground leading-relaxed max-w-3xl">
          {description}
        </p>
      )}
    </header>
  );
}
