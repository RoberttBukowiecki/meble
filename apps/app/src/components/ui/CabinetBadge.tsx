
'use client';

import { Badge } from '@meble/ui';
import { ChefHat, Shirt, BookOpen, Package } from 'lucide-react';
import type { Cabinet, CabinetType } from '@/types';

interface CabinetBadgeProps {
  cabinet: Cabinet;
  onClick?: (e: React.MouseEvent) => void;
}

function getCabinetIcon(type: CabinetType) {
  switch (type) {
    case 'KITCHEN': return <ChefHat className="h-3 w-3" />;
    case 'WARDROBE': return <Shirt className="h-3 w-3" />;
    case 'BOOKSHELF': return <BookOpen className="h-3 w-3" />;
    case 'DRAWER': return <Package className="h-3 w-3" />;
  }
}

export function CabinetBadge({ cabinet, onClick }: CabinetBadgeProps) {
  return (
    <Badge
      variant="outline"
      className="cursor-pointer hover:bg-muted"
      onClick={onClick}
    >
      {getCabinetIcon(cabinet.type)}
      <span className="ml-1">{cabinet.name}</span>
    </Badge>
  );
}
