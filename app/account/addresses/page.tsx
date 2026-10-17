import Link from "next/link";
import AddressBook from "@/components/feature/customer/AddressBook/AddressBook";

/** Address book: `/api/me/addresses/*`, scoped by the session token (no permission involved). */
export default function AccountAddressesPage() {
  return (
    <div className="space-y-6">
      <AddressBook />

      <p className="text-xs text-muted-foreground">
        Addresses are used by checkout later on; the same endpoints are already what the API will
        read.{" "}
        <Link href="/account" className="font-semibold hover:underline">
          Back to your profile
        </Link>
      </p>
    </div>
  );
}
