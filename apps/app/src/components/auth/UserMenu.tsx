'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@meble/ui';
import {
  User,
  LogOut,
  ChevronDown,
  LogIn,
  UserPlus,
  CreditCard,
  Sparkles,
  Plus,
} from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { CreditsPurchaseModal } from '@/components/ui/CreditsPurchaseModal';

export function UserMenu() {
  const router = useRouter();
  const { user, profile, isAuthenticated, isLoading, signOut } = useAuth();
  const { balance, isLoading: creditsLoading } = useCredits(isAuthenticated);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const availableCredits = balance?.availableCredits ?? 0;
  const hasUnlimited = balance?.hasUnlimited ?? false;

  if (isLoading) {
    return (
      <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
    );
  }

  if (!isAuthenticated) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <User className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => router.push('/login')}>
            <LogIn className="mr-2 h-4 w-4" />
            Zaloguj sie
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/register')}>
            <UserPlus className="mr-2 h-4 w-4" />
            Zarejestruj sie
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const displayName = profile?.displayName || profile?.fullName;
  const initials = displayName
    ? displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Credits display */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 h-8 px-2"
              onClick={() => setShowPurchaseModal(true)}
            >
              {hasUnlimited ? (
                <Sparkles className="h-4 w-4 text-amber-500" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              <span className="font-medium text-sm">
                {creditsLoading ? '...' : hasUnlimited ? 'Pro' : availableCredits}
              </span>
              <Plus className="h-3 w-3 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {hasUnlimited ? (
              'Nielimitowane eksporty - kliknij aby zobaczyc pakiety'
            ) : (
              <>
                {availableCredits} kredyt{availableCredits === 1 ? '' : availableCredits < 5 ? 'y' : 'ow'} dostepnych
                <span className="block text-xs text-muted-foreground">
                  Kliknij, aby kupic wiecej
                </span>
              </>
            )}
          </TooltipContent>
        </Tooltip>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Avatar className="h-7 w-7">
                <AvatarImage src={profile?.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium truncate">
                {displayName || 'Uzytkownik'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Wyloguj
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CreditsPurchaseModal
        open={showPurchaseModal}
        onOpenChange={setShowPurchaseModal}
        isAuthenticated={isAuthenticated}
        userEmail={user?.email}
      />
    </>
  );
}
