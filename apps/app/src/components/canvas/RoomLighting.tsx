import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import * as THREE from 'three';
import { LightSource3D } from './LightSource3D';

export function RoomLighting() {
  const { rooms, walls, openings, activeRoomId, lights, graphicsSettings } = useStore(
    useShallow((state) => ({
      rooms: state.rooms,
      walls: state.walls,
      openings: state.openings,
      activeRoomId: state.activeRoomId,
      lights: state.lights,
      graphicsSettings: state.graphicsSettings,
    }))
  );

  const isSimulation = graphicsSettings.lightingMode === 'simulation';

  const windowLights = useMemo(() => {
    if (!isSimulation) return []; // Only in simulation

    const lightsElements: React.ReactElement[] = [];

    rooms.forEach(room => {
        const roomWalls = walls.filter(w => w.roomId === room.id);
        const roomOpenings = openings.filter(o => roomWalls.some(w => w.id === o.wallId));

        roomOpenings.forEach(opening => {
            if (opening.type === 'WINDOW') {
                const wall = roomWalls.find(w => w.id === opening.wallId);
                if (!wall) return;

                const dx = wall.end[0] - wall.start[0];
                const dy = wall.end[1] - wall.start[1];
                const length = Math.sqrt(dx*dx + dy*dy);
                const angle = Math.atan2(dy, dx);

                const distAlong = opening.offsetFromStartMm + opening.widthMm/2;
                const ux = dx / length;
                const uy = dy / length;
                
                const posX = wall.start[0] + ux * distAlong;
                const posZ = wall.start[1] + uy * distAlong;
                const posY = opening.sillHeightMm + opening.heightMm/2;

                lightsElements.push(
                    <rectAreaLight
                        key={opening.id}
                        width={opening.widthMm}
                        height={opening.heightMm}
                        intensity={5}
                        position={[posX, posY, posZ]}
                        rotation={[0, -angle, 0]} 
                        color="#ffffee"
                    />
                );
                
                 lightsElements.push(
                    <pointLight
                        key={`${opening.id}-point`}
                        position={[posX, posY, posZ]}
                        intensity={0.5}
                        distance={3000}
                        color="#ffffff"
                    />
                );
            }
        });
    });

    return lightsElements;
  }, [rooms, walls, openings]);

  // Artificial Lights
  const artificialLights = useMemo(() => {
      return (lights || []).map(light => {
          const room = rooms.find(r => r.id === light.roomId);
          if (!room) return null;
          return <LightSource3D key={light.id} light={light} roomHeight={room.heightMm} />;
      });
  }, [lights, rooms]);

  return (
    <group>
        {/* Standard Edit Lighting */}
        {!isSimulation && (
            <>
                <ambientLight intensity={0.7} color="#ffffff" />
                <hemisphereLight args={['#ffffff', '#bbbbbb', 0.5]} position={[0, 5000, 0]} />
            </>
        )}

        {/* Simulation Lighting */}
        {isSimulation && (
            <>
                {/* Lower ambient for contrast */}
                <ambientLight intensity={0.1} color="#ffffff" />
                <hemisphereLight args={['#ffffff', '#444444', 0.2]} position={[0, 5000, 0]} />
                {windowLights}
                {artificialLights}
            </>
        )}
    </group>
  );
}
