import { Card } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";

/** Esqueleto de carga común a las páginas de retorno del checkout (éxito y cancelación). */
export function CheckoutLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="flex flex-col gap-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-40" />
        </Card>
        <Card className="flex flex-col gap-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </Card>
      </div>
    </div>
  );
}
