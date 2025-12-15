import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata = {
  title: 'Nowe haslo - Meblarz',
  description: 'Ustaw nowe haslo do konta Meblarz',
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Ustaw nowe haslo
          </h1>
          <p className="mt-2 text-muted-foreground">
            Wprowadz nowe haslo do swojego konta
          </p>
        </div>

        <ResetPasswordForm />
      </div>
    </div>
  );
}
