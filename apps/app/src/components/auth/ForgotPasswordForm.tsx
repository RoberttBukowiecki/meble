'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Button, Input, Label } from '@meble/ui';
import { Loader2, Mail, CheckCircle } from 'lucide-react';

export function ForgotPasswordForm() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await resetPassword(email);

      if (error) {
        setError('Wystapil blad. Sprawdz czy podales prawidlowy email.');
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
        <h2 className="text-xl font-semibold">Sprawdz swoja skrzynke!</h2>
        <p className="text-muted-foreground">
          Wyslalismy link do resetowania hasla na adres <strong>{email}</strong>
          . Kliknij w link aby ustawic nowe haslo.
        </p>
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

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wysylanie...
            </>
          ) : (
            'Wyslij link resetujacy'
          )}
        </Button>
      </form>
    </div>
  );
}
