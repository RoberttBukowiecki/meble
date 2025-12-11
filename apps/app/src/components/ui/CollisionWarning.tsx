'use client';

/**
 * Collision warning component
 * Shows a warning badge when collisions are detected
 * Displays collision details in a dialog when clicked
 */

import { useState } from 'react';
import { useStore } from '@/lib/store';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Badge,
  Alert,
} from '@meble/ui';
import { AlertTriangle } from 'lucide-react';

export function CollisionWarning() {
  const [open, setOpen] = useState(false);
  const { collisions, parts } = useStore();

  // Don't show if there are no collisions
  if (collisions.length === 0) {
    return null;
  }

  // Group collisions to show unique pairs
  // (each collision is stored twice, once for each direction)
  const uniqueCollisions = collisions.filter((collision, index) => {
    // Keep only the first occurrence of each pair
    const firstIndex = collisions.findIndex(
      (c) =>
        (c.partId1 === collision.partId1 && c.partId2 === collision.partId2) ||
        (c.partId1 === collision.partId2 && c.partId2 === collision.partId1)
    );
    return firstIndex === index;
  });

  const getPartName = (partId: string): string => {
    const part = parts.find((p) => p.id === partId);
    return part?.name || 'Nieznana część';
  };

  const collisionCount = uniqueCollisions.length;

  return (
    <>
      {/* Floating warning badge */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          variant="destructive"
          size="lg"
          onClick={() => setOpen(true)}
          className="gap-2 shadow-lg animate-pulse"
        >
          <AlertTriangle className="h-5 w-5" />
          <span>
            {collisionCount} {collisionCount === 1 ? 'kolizja' : 'kolizji'}
          </span>
          <Badge variant="secondary" className="ml-1">
            !
          </Badge>
        </Button>
      </div>

      {/* Collision details dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Wykryte kolizje
            </DialogTitle>
            <DialogDescription>
              Znaleziono {collisionCount}{' '}
              {collisionCount === 1
                ? 'kolizję między częściami'
                : 'kolizji między częściami'}
              . Części kolidujące są podświetlone na czerwono w widoku 3D.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {uniqueCollisions.map((collision, index) => {
              const part1Name = getPartName(collision.partId1);
              const part2Name = getPartName(collision.partId2);

              return (
                <Alert key={`${collision.partId1}-${collision.partId2}-${index}`} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <div className="ml-2">
                    <div className="font-medium">Kolizja #{index + 1}</div>
                    <div className="text-sm mt-1">
                      <span className="font-medium">{part1Name}</span>
                      {' koliduje z '}
                      <span className="font-medium">{part2Name}</span>
                    </div>
                    {collision.groupId1 && collision.groupId2 && (
                      <div className="text-xs mt-1 opacity-75">
                        {collision.groupId1 === collision.groupId2
                          ? 'Obie części należą do tej samej grupy/szafki'
                          : 'Części należą do różnych grup/szafek'}
                      </div>
                    )}
                  </div>
                </Alert>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Jak naprawić kolizje:</strong>
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
              <li>Przesuń kolidujące części używając trybu przesuwania (klawisz M)</li>
              <li>Zmień wymiary części w panelu właściwości</li>
              <li>Usuń lub dostosuj pozycję elementów</li>
            </ul>
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={() => setOpen(false)}>Zamknij</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
