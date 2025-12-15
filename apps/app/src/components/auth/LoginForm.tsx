'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Button, Input, Label } from '@meble/ui';
import { Loader2, Mail, Lock, Chrome } from 'lucide-react';

interface LoginFormProps {
  redirectTo?: string;
  errorMessage?: string;
}

export function LoginForm({ redirectTo, errorMessage }: LoginFormProps) {
  const router = useRouter();
  const { signIn, signInWithGoogle, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(errorMessage || null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Nieprawidlowy email lub haslo');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Potwierdz swoj email przed zalogowaniem');
        } else {
          setError('Wystapil blad podczas logowania');
        }
        return;
      }

      router.push(redirectTo || '/');
      router.refresh();
    } catch {
      setError('Wystapil nieoczekiwany blad');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const { error } = await signInWithGoogle();

    if (error) {
      setError('Wystapil blad podczas logowania przez Google');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="twoj@email.pl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Haslo</Label>
            <a
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Zapomnialesz hasla?
            </a>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
              autoComplete="current-password"
              minLength={8}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || authLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logowanie...
            </>
          ) : (
            'Zaloguj sie'
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Lub kontynuuj przez
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={isLoading || authLoading}
      >
        <Chrome className="mr-2 h-4 w-4" />
        Google
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Logujac sie, akceptujesz{' '}
        <a href="/regulamin" className="underline hover:text-foreground">
          Regulamin
        </a>{' '}
        i{' '}
        <a
          href="/polityka-prywatnosci"
          className="underline hover:text-foreground"
        >
          Polityke prywatnosci
        </a>
      </p>
    </div>
  );
}
