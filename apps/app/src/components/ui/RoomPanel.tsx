import { useTranslations } from 'next-intl';
import { useStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@meble/ui';
import { Plus, Trash, PencilRuler } from 'lucide-react';
import { Room } from '@/types';
import { useState, useEffect } from 'react';
import { Room2DEditor } from '../room-editor/Room2DEditor';

export function RoomPanel() {
  const t = useTranslations('RoomPanel');
  const { rooms, activeRoomId, addRoom, setActiveRoom, removeRoom } = useStore(
    useShallow((state) => ({
      rooms: state.rooms,
      activeRoomId: state.activeRoomId,
      addRoom: state.addRoom,
      setActiveRoom: state.setActiveRoom,
      removeRoom: state.removeRoom,
    }))
  );

  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleAddRoom = () => {
    const newRoom: Room = {
      id: crypto.randomUUID(),
      name: `Pokój ${rooms.length + 1}`,
      heightMm: 2500,
      wallThicknessMm: 150,
      floorThicknessMm: 200,
      defaultCeiling: true,
      wallMaterialId: null,
      floorMaterialId: null,
      ceilingMaterialId: null,
      origin: [0, 0],
    };
    addRoom(newRoom);
    setActiveRoom(newRoom.id);
    setIsEditorOpen(true); // Auto open
  };

  useEffect(() => {
      // Auto-open on mount if room is selected
      if (activeRoomId) {
          setIsEditorOpen(true);
      }
  }, []); // Run once on mount

  return (
    <div className="space-y-4 p-4">
      {/* Room Management */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{t('title')}</h3>
        <Button onClick={handleAddRoom} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t('addRoom')}
        </Button>
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noRooms')}</p>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id}
              className={`flex items-center justify-between rounded-md border p-2 ${
                room.id === activeRoomId ? 'border-primary bg-primary/10' : 'border-border'
              }`}
            >
              <button
                className="flex-1 text-left text-sm font-medium"
                onClick={() => setActiveRoom(room.id)}
              >
                {room.name}
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeRoom(room.id)}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      {activeRoomId && (
        <div className="mt-4 border-t pt-4 space-y-4">
            <h4 className="text-sm font-medium">{t('selectedRoom')}</h4>
            
            <div className="pt-2">
                <Button variant="outline" className="w-full" onClick={() => setIsEditorOpen(true)}>
                    <PencilRuler className="mr-2 h-4 w-4" />
                    Edytuj rzut 2D
                </Button>
            </div>
        </div>
      )}
      
      {activeRoomId && (
        <Room2DEditor 
            open={isEditorOpen} 
            onOpenChange={setIsEditorOpen} 
            roomId={activeRoomId} 
        />
      )}
    </div>
  );
}