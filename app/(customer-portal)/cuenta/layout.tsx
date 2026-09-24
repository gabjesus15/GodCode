import type { Metadata } from "next";

import { requireCustomerPortalSession } from "@/lib/tenant/customer-portal-session";
import { QueryProvider } from "@/components/ui/query-provider";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default async function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCustomerPortalSession();

  return <QueryProvider>{children}</QueryProvider>;
}
