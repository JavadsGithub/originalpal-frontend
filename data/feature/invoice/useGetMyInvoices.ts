import { Invoice } from "@/lib/types/Invoice";
import { useQuery } from "@tanstack/react-query";

const MOCKED_MY_INVOICES: Invoice[] = [
  {
    id: "INV001",
    status: "Paid",
    amount: 250.0,
    method: "Credit Card",
  },
  {
    id: "INV002",
    status: "Pending",
    amount: 150.0,
    method: "PayPal",
  },
];

export interface UseGetMyInvoicesReturn {
  invoices: Invoice[];
  succeed: boolean | null;
}

export default function useGetMyInvoices(): UseGetMyInvoicesReturn {
  const query = useQuery<Invoice[]>({
    queryKey: ["invoices", "me"],
    queryFn: async () => {
      return MOCKED_MY_INVOICES;
    },
    staleTime: Infinity,
  });

  return {
    invoices: query.data ?? [],
    succeed: query.isSuccess,
  };
}
