'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Button, Input, Label, Checkbox } from '@meble/ui';
import { Loader2, Mail, Lock, User, Chrome, CheckCircle } from 'lucide-react';
import { track, AnalyticsEvent } from '@meble/analytics';

interface RegisterFormProps {
  redirectTo?: string;
}

export function RegisterForm({ redirectTo }: RegisterFormProps) {
  const router = useRouter();
  const { signUp, signInWithGoogle, isLoading: authLoading } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password !== confirmPassword) {
      setError('Hasla nie sa identyczne');
      return;
    }

    if (password.length < 8) {
      setError('Haslo musi miec minimum 8 znakow');
      return;
    }

    if (!acceptTerms) {
      setError('Musisz zaakceptowac regulamin');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUp(email, password, {
        full_name: name,
        newsletter_subscribed: newsletter,
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setError('Ten email jest juz zarejestrowany');
        } else if (error.message.includes('Password')) {
          setError('Haslo jest za slabe. Uzyj minimum 8 znakow');
        } else {
          setError('Wystapil blad podczas rejestracji');
        }
        return;
      }

      // Track successful registration
      track(AnalyticsEvent.AUTH_SIGNUP_COMPLETED, {
        method: 'email',
        has_referral: false,
      });

      setIsSuccess(true);
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
      setError('Wystapil blad podczas rejestracji przez Google');
    }
  };

  // Success message
  if (isSuccess) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h2 className="text-xl font-semibold">Sprawdz swoja skrzynke!</h2>
        <p className="text-muted-foreground">
          Wyslalismy link potwierdzajacy na adres <strong>{email}</strong>.
          Kliknij w link aby aktywowac konto.
        </p>
        <Button
          variant="outline"
          onClick={() => router.push('/login')}
          className="mt-4"
        >
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
          <Label htmlFor="name">Imie (opcjonalnie)</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              placeholder="Jan Kowalski"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10"
              autoComplete="name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
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
          <Label htmlFor="password">Haslo *</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="Minimum 8 znakow"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Potwierdz haslo *</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Powtorz haslo"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10"
              required
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={acceptTerms}
              onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
            />
            <Label
              htmlFor="terms"
              className="text-sm leading-tight cursor-pointer"
            >
              Akceptuje{' '}
              <a
                href="/regulamin"
                className="text-primary hover:underline"
                target="_blank"
              >
                Regulamin
              </a>{' '}
              i{' '}
              <a
                href="/polityka-prywatnosci"
                className="text-primary hover:underline"
                target="_blank"
              >
                Polityke prywatnosci
              </a>{' '}
              *
            </Label>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="newsletter"
              checked={newsletter}
              onCheckedChange={(checked) => setNewsletter(checked as boolean)}
            />
            <Label
              htmlFor="newsletter"
              className="text-sm leading-tight cursor-pointer"
            >
              Chce otrzymywac informacje o nowosciach i promocjach
            </Label>
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
              Rejestracja...
            </>
          ) : (
            'Zarejestruj sie'
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

      <div className="bg-muted/50 p-4 rounded-lg">
        <p className="text-sm font-medium mb-2">Korzysci z konta:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>- Kredyty eksportu nigdy nie wygasaja</li>
          <li>- Historia projektow i eksportow</li>
          <li>- +2 darmowe kredyty na start</li>
          <li>- Dostep z kazdego urzadzenia</li>
        </ul>
      </div>
    </div>
  );
}
