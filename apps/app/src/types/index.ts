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
} from "./shape";

// Material types
export type { MaterialCategory, Material, MaterialTexture } from "./material";

// Edge banding types
export type {
  EdgeBandingRect,
  EdgeBandingLShape,
  EdgeBandingTrapezoid,
  EdgeBandingGeneric,
  EdgeBanding,
} from "./edge";

// Furniture types
export type { Furniture } from "./furniture";

// Part types
export type { Part } from "./part";

// Collision types
export type { Collision } from "./collision";

// Door types
export type {
  DoorLayout,
  HingeSide,
  DoorOpeningDirection,
  DoorConfig,
  DoorMetadata,
  FoldingDoorConfig,
} from "./door";

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
} from "./handle";

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
} from "./drawer";
export { generateAboveBoxShelfId } from "./drawer";

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
} from "./cabinetInterior";
export {
  DEFAULT_ZONE_HEIGHT_CONFIG,
  DEFAULT_ZONE_WIDTH_CONFIG,
  DEFAULT_PARTITION_CONFIG,
  DEFAULT_SHELF_CONFIG,
  DEFAULT_SHELVES_CONFIG,
  generateZoneId,
  generatePartitionId,
  generateShelfId,
} from "./cabinetInterior";

// Decorative panel types
export type {
  SideFrontConfig,
  SideFrontsConfig,
  DecorativePanelType,
  DecorativePanelPosition,
  DecorativePanelConfig,
  DecorativePanelsConfig,
} from "./decorative";
export {
  DEFAULT_SIDE_FRONT_CONFIG,
  DECORATIVE_PANEL_DEFAULTS,
  DEFAULT_DECORATIVE_PANEL_CONFIG,
} from "./decorative";

// Leg types
export type {
  LegPreset,
  LegFinish,
  LegShape,
  LegCountMode,
  LegTypeConfig,
  LegsConfig,
  LegPosition,
  LegData,
} from "./legs";
export { LEG_FINISH_COLORS, getLegColor } from "./legs";

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
  WallCabinetParams,
  HangerCutoutConfig,
  CornerInternalCabinetParams,
  CornerExternalCabinetParams,
  CabinetParams,
  Cabinet,
  CabinetPartRole,
  CabinetPartMetadata,
} from "./cabinet";

// Corner cabinet types
export type {
  CornerWallSide,
  CornerDoorPosition,
  CornerFrontType,
  CornerMountType,
  CornerConfig,
  CornerPartRole,
} from "./corner";

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
  CountertopGroupSnapshot,
  CountertopSegmentSnapshot,
  CncOperationSnapshot,
  CountertopCornerSnapshot,
  CountertopJointSnapshot,
  BatchCountertopConfigSnapshot,
  HistoryEntry,
} from "./history";

// Transform and snapping types
export type {
  TransformMode,
  TransformSpace,
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
  // Object dimensions (W/H/D)
  ObjectDimensionMode,
  ObjectDimensionGranularity,
  ObjectDimension,
  ObjectDimensionSet,
  ObjectDimensionSettings,
} from "./transform";

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
} from "./room";

// State types
export type { ProjectState, InteriorMaterialPreferences } from "./state";

// Countertop types
export type {
  CountertopLayoutType,
  CountertopJointType,
  JointHardwareType,
  CornerTreatment,
  CornerPosition,
  EdgeBandingOption,
  EdgeId,
  CncOperationType,
  CutoutPresetType,
  CncOperation,
  CountertopCornerConfig,
  SegmentEdgeBanding,
  CountertopOverhang,
  CountertopSegment,
  JointHardware,
  CountertopJoint,
  CountertopGroup,
  CabinetCountertopConfig,
  CutListEntry,
  EdgeBandingEntry,
  CountertopProductionData,
  CountertopGroupOptions,
  AdjacentCabinetGroup,
} from "./countertop";
export {
  generateCountertopGroupId,
  generateSegmentId,
  generateJointId,
  generateCncOperationId,
  generateCornerId,
} from "./countertop";

// Camera and view types
export type { CameraMode, OrthographicView, OrthographicViewConfig } from "./camera";
export {
  ORTHOGRAPHIC_VIEW_CONFIGS,
  ORTHOGRAPHIC_VIEWS,
  DEFAULT_ORTHO_CAMERA_DISTANCE,
  DEFAULT_ORTHO_ZOOM,
  getEditableAxes,
  getRotationAxis,
  getPerpendicularAxis,
  isAxisEditable,
} from "./camera";

// Project types (multi-project system)
export type {
  Project,
  ProjectListItem,
  ProjectData,
  SyncStatus,
  SyncState,
  SaveResult,
  ConflictResolution,
  ProjectSizeEstimate,
} from "./project";
export {
  PROJECT_SIZE_SOFT_LIMIT,
  PROJECT_SIZE_HARD_LIMIT,
  PROJECT_SCHEMA_VERSION,
  DEFAULT_SYNC_STATE,
  EMPTY_PROJECT_DATA,
} from "./project";
