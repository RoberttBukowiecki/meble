import { RegisterForm } from '@/components/auth/RegisterForm';
import { getServerUser } from '@/lib/auth/getServerUser';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Rejestracja - Meblarz',
  description: 'Zaloz konto w Meblarz i projektuj meble',
};

interface RegisterPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { user } = await getServerUser();
  const params = await searchParams;

  if (user) {
    redirect(params.redirect || '/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Utworz konto</h1>
          <p className="mt-2 text-muted-foreground">
            Masz juz konto?{' '}
            <a href="/login" className="text-primary hover:underline">
              Zaloguj sie
            </a>
          </p>
        </div>

        <RegisterForm redirectTo={params.redirect} />
      </div>
    </div>
  );
}
