import { LoginForm } from '@/components/auth/LoginForm';
import { getServerUser } from '@/lib/auth/getServerUser';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Logowanie - Meblarz',
  description: 'Zaloguj sie do swojego konta Meblarz',
};

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { user } = await getServerUser();
  const params = await searchParams;

  if (user) {
    redirect(params.redirect || '/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Zaloguj sie</h1>
          <p className="mt-2 text-muted-foreground">
            Nie masz jeszcze konta?{' '}
            <a href="/register" className="text-primary hover:underline">
              Zarejestruj sie
            </a>
          </p>
        </div>

        <LoginForm redirectTo={params.redirect} errorMessage={params.error} />
      </div>
    </div>
  );
}
