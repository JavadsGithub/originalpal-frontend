import { Invoice } from "@/lib/types/Invoice";
import { useQuery } from "@tanstack/react-query";

const MOCKED_ADMIN_INVOICES: Invoice[] = [
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
  {
    id: "INV003",
    status: "Unpaid",
    amount: 350.0,
    method: "Bank Transfer",
  },
  {
    id: "INV004",
    status: "Paid",
    amount: 450.0,
    method: "Credit Card",
  },
  {
    id: "INV005",
    status: "Paid",
    amount: 550.0,
    method: "PayPal",
  },
  {
    id: "INV006",
    status: "Pending",
    amount: 200.0,
    method: "Bank Transfer",
  },
  {
    id: "INV007",
    status: "Unpaid",
    amount: 300.0,
    method: "Credit Card",
  },
];

export interface UseGetAdminInvoicesReturn {
  invoices: Invoice[];
  succeed: boolean | null;
}

export default function useGetAdminInvoices(): UseGetAdminInvoicesReturn {
  const query = useQuery<Invoice[]>({
    queryKey: ["invoices", "admin"],
    queryFn: async () => {
      return MOCKED_ADMIN_INVOICES;
    },
    staleTime: Infinity,
  });

  return {
    invoices: query.data ?? [],
    succeed: query.isSuccess,
  };
}
