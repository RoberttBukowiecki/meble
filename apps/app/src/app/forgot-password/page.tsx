import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata = {
  title: 'Resetuj haslo - Meblarz',
  description: 'Zresetuj haslo do konta Meblarz',
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Resetuj haslo</h1>
          <p className="mt-2 text-muted-foreground">
            Podaj email, a wyslemy Ci link do zresetowania hasla
          </p>
        </div>

        <ForgotPasswordForm />

        <p className="text-center">
          <a href="/login" className="text-sm text-primary hover:underline">
            Wroc do logowania
          </a>
        </p>
      </div>
    </div>
  );
}
