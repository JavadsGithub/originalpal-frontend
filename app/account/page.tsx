import Link from "next/link";
import ProfileForm from "@/components/feature/customer/ProfileForm/ProfileForm";

/**
 * Profile screen: `PUT /api/auth/me` (partial), plus the two things a customer can do about a lost
 * password — the backend has no "change password while signed in" endpoint, only the recovery flow,
 * so the link points there rather than inventing a screen.
 */
export default function AccountPage() {
  return (
    <div className="space-y-6">
      <ProfileForm />

      <section className="space-y-2 rounded-xl border border-border p-6">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Password</h2>
        <p className="text-xs text-muted-foreground">
          Changing a password goes through the recovery flow: request a token for your email, then
          set the new password. The old password stops working immediately.
        </p>
        <Link href="/forgot-password" className="text-sm font-semibold hover:underline">
          Reset my password →
        </Link>
      </section>

      <section className="space-y-1 rounded-xl border border-dashed border-border p-6">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Roles</h2>
        <p className="text-xs text-muted-foreground">
          Accounts created through registration start with no roles. An administrator grants access
          from the back office (`/admin/users`), which is what unlocks any permission-gated screen.
        </p>
      </section>
    </div>
  );
}
