"use client";

/**
 * NewProjectDialog - Simple form to create a new project
 */

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
} from "@meble/ui";
import { Loader2 } from "lucide-react";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (projectId: string) => void;
}

export function NewProjectDialog({ open, onOpenChange, onCreated }: NewProjectDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createNewProject, saveProjectAs } = useStore(
    useShallow((state) => ({
      createNewProject: state.createNewProject,
      saveProjectAs: state.saveProjectAs,
    }))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Nazwa projektu jest wymagana");
      return;
    }

    setIsCreating(true);

    try {
      const projectId = await createNewProject(name.trim());

      if (projectId) {
        onOpenChange(false);
        onCreated?.(projectId);
        // Reset form
        setName("");
        setDescription("");
      } else {
        setError("Nie udało się utworzyć projektu");
      }
    } catch (err) {
      setError("Wystąpił błąd podczas tworzenia projektu");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      onOpenChange(false);
      setName("");
      setDescription("");
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nowy projekt</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">
                Nazwa projektu <span className="text-destructive">*</span>
              </Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Moja nowa kuchnia"
                maxLength={100}
                autoFocus
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-description">
                Opis <span className="text-muted-foreground">(opcjonalnie)</span>
              </Label>
              <textarea
                id="project-description"
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setDescription(e.target.value)
                }
                placeholder="Nowoczesna kuchnia w kształcie litery L..."
                maxLength={500}
                rows={3}
                disabled={isCreating}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isCreating}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isCreating || !name.trim()}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Tworzenie...
                </>
              ) : (
                "Utwórz projekt"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default NewProjectDialog;
