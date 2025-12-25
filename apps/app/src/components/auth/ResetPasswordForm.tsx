'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Button, Label, PasswordInput, PasswordStrength } from '@meble/ui';
import { Loader2, CheckCircle } from 'lucide-react';
import { validatePassword, passwordsMatch } from '@/lib/auth/passwordValidation';

export function ResetPasswordForm() {
  const router = useRouter();
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passwordsMatch(password, confirmPassword)) {
      setError('Hasla nie sa identyczne');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0]);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await updatePassword(password);

      if (error) {
        setError('Wystapil blad podczas zmiany hasla');
        return;
      }

      setIsSuccess(true);
    } catch {
      setError('Wystapil nieoczekiwany blad');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h2 className="text-xl font-semibold">Haslo zmienione!</h2>
        <p className="text-muted-foreground">
          Twoje haslo zostalo pomyslnie zmienione. Mozesz teraz zalogowac sie
          nowym haslem.
        </p>
        <Button onClick={() => router.push('/login')} className="mt-4">
          Przejdz do logowania
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nowe haslo</Label>
          <PasswordInput
            id="password"
            placeholder="Minimum 8 znakow"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
          />
          <PasswordStrength password={password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Potwierdz haslo</Label>
          <PasswordInput
            id="confirmPassword"
            placeholder="Powtorz haslo"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-destructive">Hasla nie sa identyczne</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Zapisywanie...
            </>
          ) : (
            'Ustaw nowe haslo'
          )}
        </Button>
      </form>
    </div>
  );
}
