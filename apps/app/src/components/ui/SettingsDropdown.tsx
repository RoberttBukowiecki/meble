import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Button,
  Label,
  Switch,
} from '@meble/ui';
import { Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { LanguageSwitcher } from './LanguageSwitcher';

export function SettingsDropdown() {
  const t = useTranslations('Settings');

  const {
    featureFlags,
    toggleFeatureFlag,
  } = useStore(
    useShallow((state) => ({
      featureFlags: state.featureFlags,
      toggleFeatureFlag: state.toggleFeatureFlag,
    }))
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{t('settings')}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="px-2 py-1.5">
          <LanguageSwitcher />
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Eksperymentalne</DropdownMenuLabel>
        
        <div className="px-2 py-2 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="hide-graphics" className="text-xs">Ukryj ustawienia grafiki</Label>
            <Switch
              id="hide-graphics"
              checked={featureFlags?.HIDE_GRAPHICS_SETTINGS ?? false}
              onCheckedChange={() => toggleFeatureFlag('HIDE_GRAPHICS_SETTINGS')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="hide-rooms" className="text-xs">Ukryj zakładkę pokoi</Label>
            <Switch
              id="hide-rooms"
              checked={featureFlags?.HIDE_ROOMS_TAB ?? false}
              onCheckedChange={() => toggleFeatureFlag('HIDE_ROOMS_TAB')}
            />
          </div>
        </div>

      </DropdownMenuContent>
    </DropdownMenu>
  );
}