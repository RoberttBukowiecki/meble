'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@meble/ui';
import { Maximize, ZoomIn, ZoomOut, Move, DoorOpen, LayoutTemplate, PenTool, Plus, Trash2, Save, Lightbulb, Minus } from 'lucide-react';
import { OpeningType, Room, WallSegment, LightType } from '@/types';
import { ROOM_TEMPLATES, RoomTemplateId } from '@/lib/room-templates';

interface Room2DEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
}

export function Room2DEditor({ open, onOpenChange, roomId }: Room2DEditorProps) {
  // FIX: Select all walls/openings and filter in useMemo to avoid infinite loop in useStore
  const { allWalls, allOpenings, setRoomWalls, addOpening, addRoom, setActiveRoom, rooms, addWall, removeOpening, removeWall, addLight, lights, removeLight } = useStore(
    useShallow((state) => ({
      allWalls: state.walls,
      allOpenings: state.openings,
      setRoomWalls: state.setRoomWalls,
      addOpening: state.addOpening,
      addRoom: state.addRoom,
      setActiveRoom: state.setActiveRoom,
      rooms: state.rooms,
      addWall: state.addWall,
      removeOpening: state.removeOpening,
      removeWall: state.removeWall,
      addLight: state.addLight,
      lights: state.lights,
      removeLight: state.removeLight,
    }))
  );

  const room = useMemo(() => rooms.find(r => r.id === roomId), [rooms, roomId]);
  const walls = useMemo(() => allWalls.filter(w => w.roomId === roomId), [allWalls, roomId]);
  const openings = useMemo(() => {
    const wallIds = new Set(walls.map(w => w.id));
    return allOpenings.filter(o => wallIds.has(o.wallId));
  }, [allOpenings, walls]);
  const roomLights = useMemo(() => (lights || []).filter(l => l.roomId === roomId), [lights, roomId]);

  // Viewport state
  const [scale, setScale] = useState(0.1); // Pixels per mm
  const [offset, setOffset] = useState({ x: 400, y: 300 }); // Center of canvas
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Tool state
  const [activeTool, setActiveTool] = useState<'SELECT' | 'ADD_WINDOW' | 'ADD_DOOR' | 'DRAW_WALL' | 'ADD_BULB' | 'ADD_STRIP'>('SELECT');
  const [drawingStart, setDrawingStart] = useState<{ x: number, y: number } | null>(null);

  // Template State
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<RoomTemplateId>('RECTANGLE');
  const [templateParams, setTemplateParams] = useState<Record<string, number>>({});

  // Interaction state
  const [hoveredWallId, setHoveredWallId] = useState<string | null>(null);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null);
  const [selectedLightId, setSelectedLightId] = useState<string | null>(null);
  
  // Drag state: vertex point being moved and which wall endpoints are attached to it
  const [draggingState, setDraggingState] = useState<{
    startX: number; // World X at start
    startY: number; // World Y at start
    currentX: number; // Current World X
    currentY: number; // Current World Y
    affected: { wallId: string, endpoint: 'start' | 'end' }[];
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize template params
  useEffect(() => {
    const template = ROOM_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (template) {
        const defaults: Record<string, number> = {};
        template.params.forEach(p => defaults[p.id] = p.defaultValue);
        setTemplateParams(defaults);
    }
  }, [selectedTemplateId]);

  // Keyboard listeners (Delete)
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (!open) return;
          if (e.key === 'Delete' || e.key === 'Backspace') {
              if (selectedOpeningId) {
                  removeOpening(selectedOpeningId);
                  setSelectedOpeningId(null);
              } else if (selectedWallId) {
                  removeWall(selectedWallId);
                  setSelectedWallId(null);
              } else if (selectedLightId) {
                  removeLight(selectedLightId);
                  setSelectedLightId(null);
              }
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedOpeningId, selectedWallId, selectedLightId, removeOpening, removeWall, removeLight]);


  // Helper to transform world coordinates (mm) to screen coordinates (px)
  const toScreen = (x: number, y: number) => ({
    x: x * scale + offset.x,
    y: y * scale + offset.y
  });

  // Helper to transform screen coordinates (px) to world coordinates (mm)
  const toWorld = (x: number, y: number) => ({
    x: (x - offset.x) / scale,
    y: (y - offset.y) / scale
  });

  const handleApplyTemplate = () => {
    const template = ROOM_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (!template) return;
    const newWalls = template.generate(roomId, templateParams);
    setRoomWalls(roomId, newWalls);
    setShowTemplateMenu(false);
  };

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
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const zoomSensitivity = 0.001;
    const newScale = Math.max(0.01, Math.min(1, scale - e.deltaY * zoomSensitivity * scale));
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle mouse or Space+Click for panning
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      return;
    }

    const mousePos = toWorld(e.nativeEvent.offsetX, e.nativeEvent.offsetY);

    // Light Placement
    if (activeTool === 'ADD_BULB' || activeTool === 'ADD_STRIP') {
        addLight({
            id: crypto.randomUUID(),
            roomId,
            type: activeTool === 'ADD_BULB' ? 'POINT' : 'LED_STRIP',
            position: [mousePos.x, mousePos.y],
            color: '#ffffff',
            intensity: 1,
            length: activeTool === 'ADD_STRIP' ? 1000 : undefined,
            rotation: 0
        });
        setActiveTool('SELECT');
        return;
    }

    if (activeTool === 'DRAW_WALL') {
        if (!drawingStart) {
            // Start drawing - Snap to vertices
            let start = { ...mousePos };
            const snapDist = 20 / scale;
            let closestDist = snapDist;
            
             walls.forEach(w => {
                const check = (x: number, y: number) => {
                    const d = Math.hypot(x - mousePos.x, y - mousePos.y);
                    if (d < closestDist) {
                        closestDist = d;
                        start = { x, y };
                    }
                };
                check(w.start[0], w.start[1]);
                check(w.end[0], w.end[1]);
            });
            
            setDrawingStart(start);
        } else {
            // Finish drawing
            let end = { ...mousePos };
            
            // Orthogonal Snap (Shift)
            if (e.shiftKey) {
                const dx = Math.abs(end.x - drawingStart.x);
                const dy = Math.abs(end.y - drawingStart.y);
                if (dx > dy) {
                    end.y = drawingStart.y;
                } else {
                    end.x = drawingStart.x;
                }
            }

            // Snap end to vertices
             const snapDist = 20 / scale;
            let closestDist = snapDist;
            
             walls.forEach(w => {
                const check = (x: number, y: number) => {
                    const d = Math.hypot(x - end.x, y - end.y);
                    if (d < closestDist) {
                        closestDist = d;
                        end.x = x;
                        end.y = y;
                    }
                };
                check(w.start[0], w.start[1]);
                check(w.end[0], w.end[1]);
            });
            
            // Check length
             const dStart = Math.hypot(drawingStart.x - end.x, drawingStart.y - end.y);
             if (dStart > 10) {
                 addWall({
                     id: crypto.randomUUID(),
                     roomId,
                     start: [drawingStart.x, drawingStart.y],
                     end: [end.x, end.y],
                     thicknessMm: 150,
                     heightMm: 2500,
                     join: 'MITER',
                     openingIds: []
                 });
                 // Continue drawing from end point
                 setDrawingStart(end);
             }
        }
        return;
    }

    // Mode specific handling
    if (activeTool === 'SELECT') {
        // 1. Check for vertex click (Priority)
        const snapDist = 20 / scale; // 20px snap radius
        let closestDist = snapDist;
        let foundVertex: { x: number, y: number } | null = null;
        
        walls.forEach(w => {
            const checkPoint = (x: number, y: number) => {
                const d = Math.hypot(x - mousePos.x, y - mousePos.y);
                if (d < closestDist) {
                    closestDist = d;
                    foundVertex = { x, y };
                }
            };
            checkPoint(w.start[0], w.start[1]);
            checkPoint(w.end[0], w.end[1]);
        });

        if (foundVertex) {
            // Identify all walls connected to this exact point
            const affected: { wallId: string, endpoint: 'start' | 'end' }[] = [];
            const v = foundVertex as { x: number, y: number }; 

            walls.forEach(w => {
                if (Math.hypot(w.start[0] - v.x, w.start[1] - v.y) < 1) {
                    affected.push({ wallId: w.id, endpoint: 'start' });
                }
                if (Math.hypot(w.end[0] - v.x, w.end[1] - v.y) < 1) {
                    affected.push({ wallId: w.id, endpoint: 'end' });
                }
            });

            if (affected.length > 0) {
                setDraggingState({
                    startX: v.x,
                    startY: v.y,
                    currentX: v.x,
                    currentY: v.y,
                    affected
                });
                return;
            }
        }
        
        // 2. Check for Light Click
        for (const l of roomLights) {
            if (Math.hypot(mousePos.x - l.position[0], mousePos.y - l.position[1]) < (200 / scale)) {
                setSelectedLightId(l.id);
                setSelectedWallId(null);
                setSelectedOpeningId(null);
                return;
            }
        }
        
        // 3. Check for Opening Click
        // Need to project mouse to wall lines to find openings
        // Or render invisible hit boxes for openings.
        // Let's iterate openings and check distance to their position
        for (const op of openings) {
             const wall = walls.find(w => w.id === op.wallId);
             if (!wall) continue;
             
             const dx = wall.end[0] - wall.start[0];
             const dy = wall.end[1] - wall.start[1];
             const len = Math.sqrt(dx*dx + dy*dy);
             const ux = dx/len;
             const uy = dy/len;
             
             const opCenterX = wall.start[0] + ux * (op.offsetFromStartMm + op.widthMm/2);
             const opCenterY = wall.start[1] + uy * (op.offsetFromStartMm + op.widthMm/2);
             
             // Simple circle hit test
             if (Math.hypot(mousePos.x - opCenterX, mousePos.y - opCenterY) < (op.widthMm/2 + 200)) { // rough hit test
                 setSelectedOpeningId(op.id);
                 setSelectedWallId(null);
                 setSelectedLightId(null);
                 return;
             }
        }

        // 4. Check for Wall Click (Selection)
        if (hoveredWallId) {
            setSelectedWallId(hoveredWallId);
            setSelectedOpeningId(null);
            setSelectedLightId(null);
            return;
        }
        
        // Deselect
        setSelectedWallId(null);
        setSelectedOpeningId(null);
        setSelectedLightId(null);

    } else if (activeTool === 'ADD_WINDOW' || activeTool === 'ADD_DOOR') {
        // Find closest wall to click - IMPROVED HIT TESTING
        // We need to check distance from point to line segment
        let bestWallId: string | null = null;
        let minDistance = 500 / scale; // Increased threshold for hit test (e.g., 50px visual)
        
        walls.forEach(w => {
            const dx = w.end[0] - w.start[0];
            const dy = w.end[1] - w.start[1];
            const l2 = dx*dx + dy*dy;
            
            if (l2 === 0) return;
            
            // Projection t = dot(ap, ab) / dot(ab, ab)
            let t = ((mousePos.x - w.start[0]) * dx + (mousePos.y - w.start[1]) * dy) / l2;
            t = Math.max(0, Math.min(1, t));
            
            const projX = w.start[0] + t * dx;
            const projY = w.start[1] + t * dy;
            
            const dist = Math.hypot(mousePos.x - projX, mousePos.y - projY);
            
            // Visual thickness check in world units?
            // Wall thickness is ~150mm. Let's say we click within 300mm of center line.
            if (dist < 300) { // 300mm tolerance
                if (dist < minDistance) {
                    minDistance = dist;
                    bestWallId = w.id;
                }
            }
        });

        if (bestWallId) {
            const wall = walls.find(w => w.id === bestWallId);
            if (wall) {
                // Recalculate T for the best wall
                const dx = wall.end[0] - wall.start[0];
                const dy = wall.end[1] - wall.start[1];
                const lengthSq = dx*dx + dy*dy;
                let t = ((mousePos.x - wall.start[0]) * dx + (mousePos.y - wall.start[1]) * dy) / lengthSq;
                t = Math.max(0, Math.min(1, t));
                
                // Offset from start in mm
                const wallLength = Math.sqrt(lengthSq);
                const offsetMm = t * wallLength;
                
                const type: OpeningType = activeTool === 'ADD_WINDOW' ? 'WINDOW' : 'DOOR';
                const width = type === 'WINDOW' ? 1200 : 900;
                const height = type === 'WINDOW' ? 1500 : 2100;
                const sill = type === 'WINDOW' ? 850 : 0;
                
                // Add opening
                addOpening({
                    id: crypto.randomUUID(),
                    wallId: wall.id,
                    type,
                    widthMm: width,
                    heightMm: height,
                    sillHeightMm: sill,
                    offsetFromStartMm: offsetMm - (width / 2), // Center on click
                    swing: 'RIGHT' // Default
                });
                
                // Reset tool to select
                setActiveTool('SELECT');
            }
        }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
      return;
    }

    if (draggingState) {
        let mousePos = toWorld(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        
        // Orthogonal Snap when dragging vertex
        if (e.shiftKey) {
            // Snap to X or Y of start position? Or just nearest axis relative to previous position?
            // Usually ortho snap is relative to the *connected* walls' other endpoints to make 90 deg angles.
            // But simple Ortho is: keep dx or dy 0 relative to start drag.
            const dx = Math.abs(mousePos.x - draggingState.startX);
            const dy = Math.abs(mousePos.y - draggingState.startY);
            if (dx < dy) {
                mousePos.x = draggingState.startX;
            } else {
                mousePos.y = draggingState.startY;
            }
        }

        setDraggingState({
            ...draggingState,
            currentX: mousePos.x,
            currentY: mousePos.y
        });
    }
  };

  const handleMouseUp = () => {
    if (isDraggingCanvas) {
        setIsDraggingCanvas(false);
    }
    
    if (draggingState) {
        // Commit changes to store
        // Update all affected walls
        const newWalls = walls.map(w => {
            const affected = draggingState.affected.find(a => a.wallId === w.id);
            if (affected) {
                if (affected.endpoint === 'start') {
                    return { ...w, start: [draggingState.currentX, draggingState.currentY] as [number, number] };
                } else {
                    return { ...w, end: [draggingState.currentX, draggingState.currentY] as [number, number] };
                }
            }
            return w;
        });
        
        setRoomWalls(roomId, newWalls);
        setDraggingState(null);
    }
  };

  // Render walls with active drag preview
  const renderedWalls = walls.map(wall => {
      let start = wall.start;
      let end = wall.end;

      if (draggingState) {
          const startAff = draggingState.affected.find(a => a.wallId === wall.id && a.endpoint === 'start');
          const endAff = draggingState.affected.find(a => a.wallId === wall.id && a.endpoint === 'end');

          if (startAff) start = [draggingState.currentX, draggingState.currentY];
          if (endAff) end = [draggingState.currentX, draggingState.currentY];
      }

      const s = toScreen(start[0], start[1]);
      const e = toScreen(end[0], end[1]);
      const lengthMm = Math.round(Math.sqrt(Math.pow(end[0]-start[0], 2) + Math.pow(end[1]-start[1], 2)));
      
      return { ...wall, s, e, lengthMm };
  });
  
  // Render drawing preview
  let drawingLine = null;
  if (drawingStart && activeTool === 'DRAW_WALL') {
      const s = toScreen(drawingStart.x, drawingStart.y);
      // We don't track mouse pos in state for perf, but for drawing line we might need it.
      // Or we can assume it's attached to mouse cursor?
      // SVG needs coordinates.
      // Let's use a ref or local state for current mouse pos in world coords?
      // We already have mousemove handler but it only updates draggingState or offset.
      // Let's add a `currentMousePos` state for drawing preview?
      // For now, simpler: user clicks start, then next click defines end.
      // We need visual feedback.
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between">
          <div className="flex flex-col">
              <DialogTitle>Edytor Rzutu 2D</DialogTitle>
              <DialogDescription>
                Shift: Rysowanie/Przesuwanie prostopadłe. Delete: Usuń zaznaczone.
              </DialogDescription>
          </div>
          
          {/* Toolbar */}
          <div className="flex gap-2 items-center">
              <Button size="sm" onClick={() => setShowTemplateMenu(!showTemplateMenu)} variant="outline">
                  <LayoutTemplate className="mr-2 h-4 w-4" />
                  Szablony
              </Button>
              <div className="h-6 w-px bg-border mx-2" />
              <Button size="sm" onClick={handleAddRoom} variant="ghost">
                  <Plus className="mr-2 h-4 w-4" />
                  Nowy pokój
              </Button>
              <div className="h-6 w-px bg-border mx-2" />
              <Button 
                variant={activeTool === 'SELECT' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => { setActiveTool('SELECT'); setDrawingStart(null); }}
              >
                  <Move className="mr-2 h-4 w-4" />
                  Wybierz
              </Button>
               <Button 
                variant={activeTool === 'DRAW_WALL' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setActiveTool('DRAW_WALL')}
              >
                  <PenTool className="mr-2 h-4 w-4" />
                  Rysuj ścianę
              </Button>
              <Button 
                variant={activeTool === 'ADD_WINDOW' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => { setActiveTool('ADD_WINDOW'); setDrawingStart(null); }}
              >
                  <LayoutTemplate className="mr-2 h-4 w-4" />
                  Okno
              </Button>
              <Button 
                variant={activeTool === 'ADD_DOOR' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => { setActiveTool('ADD_DOOR'); setDrawingStart(null); }}
              >
                  <DoorOpen className="mr-2 h-4 w-4" />
                  Drzwi
              </Button>
              <div className="h-6 w-px bg-border mx-2" />
              <Button 
                variant={activeTool === 'ADD_BULB' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => { setActiveTool('ADD_BULB'); setDrawingStart(null); }}
              >
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Żarówka
              </Button>
              <Button 
                variant={activeTool === 'ADD_STRIP' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => { setActiveTool('ADD_STRIP'); setDrawingStart(null); }}
              >
                  <Minus className="mr-2 h-4 w-4" />
                  LED
              </Button>
               <div className="h-6 w-px bg-border mx-2" />
               <Button size="sm" onClick={() => onOpenChange(false)}>
                   <Save className="mr-2 h-4 w-4" />
                   Aktualizuj
               </Button>
          </div>
        </DialogHeader>

        {/* Template Menu Overlay */}
        {showTemplateMenu && (
            <div className="absolute top-20 left-4 z-50 w-64 bg-background border rounded-md shadow-lg p-4 space-y-4">
                <h4 className="font-medium">Wybierz szablon</h4>
                <Select value={selectedTemplateId} onValueChange={(v) => setSelectedTemplateId(v as RoomTemplateId)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                         {ROOM_TEMPLATES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                {/* Params */}
                <div className="space-y-2">
                     {ROOM_TEMPLATES.find(t => t.id === selectedTemplateId)?.params.map(p => (
                         <div key={p.id}>
                             <label className="text-xs text-muted-foreground">{p.label}</label>
                             <input 
                                type="number" 
                                className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                value={templateParams[p.id] ?? p.defaultValue} 
                                onChange={(e) => setTemplateParams(prev => ({...prev, [p.id]: parseInt(e.target.value)}))}
                             />
                         </div>
                     ))}
                </div>
                <Button onClick={handleApplyTemplate} className="w-full">Zastosuj</Button>
            </div>
        )}
        
        <div 
            ref={containerRef}
            className={`flex-1 bg-slate-50 relative overflow-hidden ${activeTool !== 'SELECT' ? 'cursor-crosshair' : ''}`}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <svg className="w-full h-full pointer-events-none">
                {/* Grid */}
                <defs>
                    <pattern id="grid" width={1000 * scale} height={1000 * scale} patternUnits="userSpaceOnUse">
                        <path d={`M ${1000 * scale} 0 L 0 0 0 ${1000 * scale}`} fill="none" stroke="gray" strokeWidth="0.5" strokeOpacity="0.2"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Walls */}
                <g className="pointer-events-auto">
                    {renderedWalls.map(wall => {
                        const isHovered = hoveredWallId === wall.id;
                        const isSelected = selectedWallId === wall.id;
                        // Determine thickness for display (fallback if 0)
                        // Wait, we need room context for thickness
                        // In Room2DEditor, we don't have room object directly in scope unless we select it
                        // but we have walls.
                        // Let's assume default 150 if not set.
                        const thickness = wall.thicknessMm || room?.wallThicknessMm || 150;
                        
                        return (
                            <g key={wall.id} 
                               onMouseEnter={() => setHoveredWallId(wall.id)}
                               onMouseLeave={() => setHoveredWallId(null)}
                            >
                                {/* Wall Line */}
                                <line 
                                    x1={wall.s.x} y1={wall.s.y} 
                                    x2={wall.e.x} y2={wall.e.y} 
                                    stroke={isSelected ? "#2563eb" : (isHovered ? "#60a5fa" : "#475569")} 
                                    strokeWidth={thickness * scale}
                                    strokeLinecap="square"
                                    opacity={0.5}
                                />
                                {/* Center Line */}
                                <line 
                                    x1={wall.s.x} y1={wall.s.y} 
                                    x2={wall.e.x} y2={wall.e.y} 
                                    stroke={isSelected ? "#1d4ed8" : (isHovered ? "#3b82f6" : "#000")} 
                                    strokeWidth={2}
                                />
                                
                                {/* Dimension Label */}
                                <text 
                                    x={(wall.s.x + wall.e.x)/2} 
                                    y={(wall.s.y + wall.e.y)/2} 
                                    textAnchor="middle" 
                                    dy={-10}
                                    fontSize={12}
                                    fill="black"
                                    className="select-none pointer-events-none bg-white"
                                >
                                    {wall.lengthMm}
                                </text>

                                {/* Vertices (visual only for now) */}
                                <circle cx={wall.s.x} cy={wall.s.y} r={6} fill="#2563eb" className="cursor-move hover:fill-blue-400" />
                                <circle cx={wall.e.x} cy={wall.e.y} r={6} fill="#2563eb" className="cursor-move hover:fill-blue-400" />
                            </g>
                        );
                    })}
                </g>
                
                {/* Drawing Preview */}
                {drawingStart && (
                     <circle cx={toScreen(drawingStart.x, drawingStart.y).x} cy={toScreen(drawingStart.x, drawingStart.y).y} r={4} fill="red" />
                )}

                {/* Openings */}
                <g className="pointer-events-none">
                    {openings.map(op => {
                         const wall = renderedWalls.find(w => w.id === op.wallId);
                         if (!wall) return null;
                         
                         // Calculate position on wall
                         const dx = wall.e.x - wall.s.x;
                         const dy = wall.e.y - wall.s.y;
                         const wallLenPx = Math.sqrt(dx*dx + dy*dy);
                         
                         // Calculate true length from coordinates to normalize
                         const trueLenMm = Math.sqrt(Math.pow(wall.end[0] - wall.start[0], 2) + Math.pow(wall.end[1] - wall.start[1], 2));
                         if (trueLenMm === 0) return null;

                         const ratio = wallLenPx / trueLenMm;
                         
                         // Normalize direction vector
                         const ux = dx / wallLenPx;
                         const uy = dy / wallLenPx;
                         
                         // Start point on screen
                         const startPxX = wall.s.x + ux * (op.offsetFromStartMm * ratio);
                         const startPxY = wall.s.y + uy * (op.offsetFromStartMm * ratio);
                         
                         const isSelected = selectedOpeningId === op.id;
                         const wallThickness = wall.thicknessMm || room?.wallThicknessMm || 150;

                         return (
                             <g key={op.id}>
                                 <rect 
                                    x={0} y={0}
                                    width={op.widthMm * ratio} 
                                    height={wallThickness * scale}
                                    fill={op.type === 'WINDOW' ? '#aaddff' : '#8B4513'}
                                    stroke={isSelected ? "red" : "black"}
                                    strokeWidth={isSelected ? 2 : 1}
                                    transform={`translate(${startPxX}, ${startPxY}) rotate(${Math.atan2(dy, dx) * 180 / Math.PI}) translate(0, -${(wallThickness * scale) / 2})`}
                                 />
                             </g>
                         );
                    })}
                </g>

                {/* Lights */}
                <g className="pointer-events-auto">
                    {roomLights.map(l => {
                        const pos = toScreen(l.position[0], l.position[1]);
                        const isSelected = selectedLightId === l.id;
                        
                        return (
                            <g 
                                key={l.id} 
                                transform={`translate(${pos.x}, ${pos.y})`}
                                onMouseDown={(e) => { e.stopPropagation(); setSelectedLightId(l.id); setSelectedWallId(null); setSelectedOpeningId(null); }}
                                className="cursor-pointer"
                            >
                                {l.type === 'POINT' ? (
                                    <circle r={10} fill="yellow" stroke={isSelected ? 'red' : 'orange'} strokeWidth={2} opacity={0.8} />
                                ) : (
                                    // Strip
                                    <rect x={-20} y={-5} width={40} height={10} fill="yellow" stroke={isSelected ? 'red' : 'orange'} strokeWidth={2} />
                                )}
                            </g>
                        );
                    })}
                </g>
            </svg>
            
            {/* Controls Overlay */}
            <div className="absolute bottom-4 right-4 flex gap-2">
                <Button size="icon" variant="secondary" onClick={() => setScale(s => s * 1.2)}><ZoomIn className="h-4 w-4"/></Button>
                <Button size="icon" variant="secondary" onClick={() => setScale(s => s / 1.2)}><ZoomOut className="h-4 w-4"/></Button>
                <Button size="icon" variant="secondary" onClick={() => { setOffset({x: 400, y: 300}); setScale(0.1); }}><Maximize className="h-4 w-4"/></Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}