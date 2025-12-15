/**
 * Type definitions for furniture modeling application
 *
 * This file re-exports all types from modular files.
 * Import from '@/types' or '@/types/index' for all types.
 */

// Shape types
export type {
  ShapeType,
  ShapeParamsRect,
  ShapeParamsTrapezoid,
  ShapeParamsLShape,
  ShapeParamsPolygon,
  ShapeParams,
} from './shape';

// Material types
export type { MaterialCategory, Material } from './material';

// Edge banding types
export type { EdgeBandingRect, EdgeBandingGeneric, EdgeBanding } from './edge';

// Furniture types
export type { Furniture } from './furniture';

// Part types
export type { Part } from './part';

// Collision types
export type { Collision } from './collision';

// Door types
export type {
  DoorLayout,
  HingeSide,
  DoorOpeningDirection,
  DoorConfig,
  DoorMetadata,
} from './door';

// Handle types
export type {
  HandleCategory,
  TraditionalHandleType,
  ModernHandleType,
  HandlelessType,
  HandleType,
  HandleOrientation,
  HandlePositionPreset,
  HandleDimensions,
  HandlePosition,
  HandleConfig,
  HandleMetadata,
} from './handle';

// Drawer types
export type {
  DrawerSlideType,
  DrawerSlideConfig,
  DrawerZoneFront,
  DrawerZoneBox,
  AboveBoxShelfConfig,
  DrawerZoneAboveBoxContent,
  DrawerZone,
  DrawerConfiguration,
} from './drawer';
export { generateAboveBoxShelfId } from './drawer';

// Cabinet interior types
export type {
  ZoneDivisionDirection,
  ZoneContentType,
  ZoneSizeMode,
  PartitionDepthPreset,
  PartitionConfig,
  ZoneHeightConfig,
  ZoneWidthConfig,
  InteriorZone,
  CabinetInteriorConfig,
  ShelfDepthPreset,
  ShelfConfig,
  ShelvesConfiguration,
} from './cabinetInterior';
export {
  DEFAULT_ZONE_HEIGHT_CONFIG,
  DEFAULT_ZONE_WIDTH_CONFIG,
  DEFAULT_PARTITION_CONFIG,
  DEFAULT_SHELF_CONFIG,
  DEFAULT_SHELVES_CONFIG,
  generateZoneId,
  generatePartitionId,
  generateShelfId,
} from './cabinetInterior';

// Decorative panel types
export type {
  SideFrontConfig,
  SideFrontsConfig,
  DecorativePanelType,
  DecorativePanelPosition,
  DecorativePanelConfig,
  DecorativePanelsConfig,
} from './decorative';
export {
  DEFAULT_SIDE_FRONT_CONFIG,
  DECORATIVE_PANEL_DEFAULTS,
  DEFAULT_DECORATIVE_PANEL_CONFIG,
} from './decorative';

// Leg types
export type {
  LegPreset,
  LegFinish,
  LegShape,
  LegCountMode,
  LegTypeConfig,
  LegsConfig,
} from './legs';

// Cabinet types
export type {
  TopBottomPlacement,
  BackMountType,
  CabinetType,
  CabinetMaterials,
  CabinetBaseParams,
  KitchenCabinetParams,
  WardrobeCabinetParams,
  BookshelfCabinetParams,
  DrawerCabinetParams,
  CornerInternalCabinetParams,
  CornerExternalCabinetParams,
  CabinetParams,
  Cabinet,
  CabinetPartRole,
  CabinetPartMetadata,
} from './cabinet';

// Corner cabinet types
export type {
  InternalCornerType,
  ExternalCornerType,
  CornerOrientation,
  CornerDoorType,
  DeadZonePreset,
  WallSharingMode,
  CornerDimensionMode,
  CornerMechanismType,
  CornerConfig,
  CornerPartRole,
} from './corner';

// History types
export type {
  HistoryEntryType,
  HistoryEntryKind,
  HistoryEntryMeta,
  TransformSnapshot,
  CabinetRegenerationSnapshot,
  GroupRenameSnapshot,
  PartSnapshot,
  CabinetSnapshot,
  HistoryEntry,
} from './history';

// Transform and snapping types
export type {
  TransformMode,
  ResizeHandle,
  SnapType,
  SnapVersion,
  SnapPoint,
  SnapCandidate,
  BoundingEdge,
  BoundingFace,
  SnapAxisConstraint,
  SnapSettings,
  SnapResult,
  ResizeConstraints,
  ResizeResult,
  CabinetResizeHandle,
  CabinetBoundingBox,
  CabinetPartPreview,
  CabinetPartInitialTransform,
  CabinetResizeResult,
  DimensionBoundingBox,
  DimensionLine,
  DimensionSettings,
  GraphicsSettings,
  FeatureFlags,
} from './transform';

// Room types
export type {
  WallJoinType,
  OpeningType,
  WindowVariant,
  DoorSwing,
  Opening,
  WallSegment,
  Room,
  LightType,
  LightSource,
  RoomTemplate,
} from './room';

// State types
export type { ProjectState, InteriorMaterialPreferences } from './state';
