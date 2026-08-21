
import { ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AccessDeniedScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
        <ShieldX size={48} className="text-red-500" />
      </div>
      <h1 className="mb-2 text-3xl font-black text-neutral-900">Access Denied</h1>
      <p className="mb-8 max-w-md text-sm font-medium text-neutral-500">
        This account does not have administrator access. If you believe this is an error, please contact the system owner.
      </p>
      <Link
        to="/login"
        className="rounded-xl bg-neutral-900 px-6 py-3 text-sm font-black text-white transition-transform active:scale-[0.98]"
      >
        Return to Login
      </Link>
    </div>
  );
}
