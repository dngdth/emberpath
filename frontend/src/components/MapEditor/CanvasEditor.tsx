import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Konva from 'konva';
import { Circle, Group, Layer, Line, Rect, Stage, Text, Transformer } from 'react-konva';
import { FloorPlanObject, SafePathResult } from '../../types/editor';
import { SensorDevice } from '../../types/sensor';
import { getDefaultSize, isResizable } from '../../utils/geometryHelpers';
import { snapPosition, getGuideLines } from '../../utils/snapHelpers';
import { useThemeStore } from '../../store/themeStore';
import { usePenDrawing } from '../../hooks/usePenDrawing';
import { LedWireShape } from './Shapes/LedWireShape';
import { WallShape } from './Shapes/WallShape';

// Custom Hooks
import { useCanvasStage } from '../../hooks/useCanvasStage';
import { useCanvasSelection } from '../../hooks/useCanvasSelection';
import { useCanvasAnimations } from '../../hooks/useCanvasAnimations';
import { useEraserTool } from '../../hooks/useEraserTool';

// Shape components imports
import { FloorBaseShape } from './Shapes/FloorBaseShape';
import { ExitShape } from './Shapes/ExitShape';
import { StairsShape } from './Shapes/StairsShape';
import { ElevatorShape } from './Shapes/ElevatorShape';
import { SensorShape } from './Shapes/SensorShape';
import { ConnectorShape } from './Shapes/ConnectorShape';
import { LabelShape } from './Shapes/LabelShape';
import { BelowObjectOutline } from './Shapes/BelowObjectOutline';
import { PolygonVertexHandles } from './Shapes/PolygonVertexHandles';
import { SheetEdgeResizers } from './Shapes/SheetEdgeResizers';

// SubComponents imports
import { CanvasBackground } from './SubComponents/CanvasBackground';
import { DrawingPreview } from './SubComponents/DrawingPreview';
import { GuidesOverlay } from './SubComponents/GuidesOverlay';

// Overlay components imports
import { ZoomControls } from './Overlays/ZoomControls';
import { SelectionToolbar } from './Overlays/SelectionToolbar';
import { ContextMenu } from './Overlays/ContextMenu';
import { TextEditorOverlay } from './Overlays/TextEditorOverlay';

interface Props {
  objects: FloorPlanObject[];
  selectedIds: string[];
  activeTool: string;
  scale: number;
  position: { x: number; y: number };
  snapEnabled: boolean;
  onStageChange: (patch: { scale?: number; position?: { x: number; y: number } }) => void;
  onAddObject: (type: FloorPlanObject['type'], x: number, y: number) => void;
  onAddCustomObject?: (obj: FloorPlanObject | FloorPlanObject[]) => void;
  onSelect: (id: string, append: boolean) => void;
  onClearSelection: () => void;
  onUpdateObject: (id: string, patch: Partial<FloorPlanObject>) => void;
  onSelectionBox: (ids: string[]) => void;
  onContextAction: (action: string, objectId: string) => void;
  onViewportChange?: (viewport: { width: number; height: number }) => void;
  floorId?: number | null;
  safePath?: SafePathResult | null;

  // Redesign Props
  editMode: boolean;
  belowObjects?: FloorPlanObject[];
  showBelowBaseline?: boolean;
  sensors?: SensorDevice[];

  // Canvas size props
  canvasWidth?: number;
  canvasHeight?: number;
  onUpdateCanvasSize?: (width: number, height: number) => void;
  onCommitCanvasResize?: (width: number, height: number, shiftX: number, shiftY: number) => void;

  // Zoom Callbacks
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
}

const GRID_SIZE = 24;

function CanvasEditorComponent(props: Props) {
  const canvasWidth = props.canvasWidth ?? 1600;
  const canvasHeight = props.canvasHeight ?? 1000;

  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const guideFrameRef = useRef<number | null>(null);
  const pendingGuideTargetRef = useRef<FloorPlanObject | null>(null);
  const lastGuideUpdateRef = useRef(0);

  const { darkMode } = useThemeStore();
  const isDark = darkMode;

  // Pen tool drawing hook
  const {
    drawingState,
    mousePos,
    guideLines,
    handleCanvasClick,
    handleCanvasDblClick,
    handleMouseMove: handlePenMouseMove,
    cancelDrawing,
  } = usePenDrawing(
    props.activeTool,
    props.onAddCustomObject,
    props.onAddObject,
    props.onSelect,
    () => props.onContextAction('select', ''),
    props.snapEnabled,
    props.objects,
  );

  // Hook 1: Stage Navigation
  const {
    viewport,
    isPanning,
    isSpacePressed,
    startPan,
    handleWheel,
    handleStagePanningMove,
    handleStagePanningUp,
  } = useCanvasStage({
    scale: props.scale,
    position: props.position,
    onStageChange: props.onStageChange,
    onViewportChange: props.onViewportChange,
    activeTool: props.activeTool,
    editMode: props.editMode,
    drawingState,
    cancelDrawing,
    stageRef,
    wrapperRef,
  });

  // Hook 2: Selection & Transformer
  const {
    selectedObjects,
    selectedIdSet,
    resizeEnabled,
  } = useCanvasSelection({
    objects: props.objects,
    selectedIds: props.selectedIds,
    stageRef,
    transformerRef,
  });

  // Hook 3: Eraser Tool
  const {
    isErasing,
    erasedIds,
    handleEraserMouseDown,
    handleEraserMouseMove,
    handleEraserMouseUp,
  } = useEraserTool({
    activeTool: props.activeTool,
    editMode: props.editMode,
    objects: props.objects,
    onContextAction: props.onContextAction,
    stageRef,
  });

  const gridPattern = useMemo(() => {
    if (typeof window === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = GRID_SIZE;
    canvas.height = GRID_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.strokeStyle = isDark ? 'rgba(100, 116, 139, 0.4)' : 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(GRID_SIZE, 0);
    ctx.lineTo(GRID_SIZE, GRID_SIZE);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, GRID_SIZE);
    ctx.lineTo(GRID_SIZE, GRID_SIZE);
    ctx.stroke();

    return canvas;
  }, [isDark]);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; objectId: string } | null>(null);
  const [guides, setGuides] = useState<Array<{ orientation: 'vertical' | 'horizontal'; value: number }>>([]);
  const [hoveredEdge, setHoveredEdge] = useState<'left' | 'right' | 'top' | 'bottom' | null>(null);
  const [dragResizeBounds, setDragResizeBounds] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const activeEdge = hoveredEdge;

  const [hoveredSensorId, setHoveredSensorId] = useState<string | null>(null);
  const [localMousePos, setLocalMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setHoveredSensorId(null);
  }, [props.activeTool]);

  useEffect(() => () => {
    if (guideFrameRef.current !== null) cancelAnimationFrame(guideFrameRef.current);
  }, []);

  // States for inline text editor
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingTextVal, setEditingTextVal] = useState('');
  const [inputPos, setInputPos] = useState({ x: 0, y: 0, width: 100, height: 30, rotation: 0 });

  const objectById = useMemo(
    () => new Map(props.objects.map((object) => [object.id, object])),
    [props.objects],
  );

  const getObjectWithDragOverlay = useCallback(
    (id: string) => {
      const baseObj = objectById.get(id);
      if (!baseObj) return undefined;
      if (pendingGuideTargetRef.current && pendingGuideTargetRef.current.id === id) {
        return pendingGuideTargetRef.current;
      }
      return baseObj;
    },
    [objectById],
  );

  const wallObjects = useMemo(
    () => props.objects.filter((object) => object.type === 'wall'),
    [props.objects],
  );

  // Map sensor status if provided
  const dangerDeviceIds = useMemo(() => {
    if (!props.sensors) return new Set<string>();
    return new Set(
      props.sensors.filter((s) => s.latest_status === 'danger').map((s) => s.device_id)
    );
  }, [props.sensors]);

  const warningDeviceIds = useMemo(() => {
    if (!props.sensors) return new Set<string>();
    return new Set(
      props.sensors
        .filter((s) => s.latest_status === 'safe' && s.latest_value >= s.threshold * 0.8)
        .map((s) => s.device_id)
    );
  }, [props.sensors]);

  const sensorValues = useMemo(() => {
    const map = new Map<string, { val: number; unit: string }>();
    if (props.sensors) {
      props.sensors.forEach((s) => {
        map.set(s.device_id, { val: s.latest_value, unit: s.unit });
      });
    }
    return map;
  }, [props.sensors]);

  const dangerRooms = useMemo(() => {
    return new Set<string>();
  }, []);

  const activeWireDirections = useMemo(() => {
    const directions = new Map<string, { reverse: boolean; status: 'safe' | 'danger' }>();
    for (const segment of props.safePath?.segments || []) {
      if (segment.kind === 'led_wire' && segment.wire_id && segment.floor_id === props.floorId) {
        directions.set(segment.wire_id, { reverse: segment.reverse, status: segment.status });
      }
    }
    return directions;
  }, [props.safePath, props.floorId]);

  const activeStairIds = useMemo(() => {
    const ids = new Set<string>();
    for (const segment of props.safePath?.segments || []) {
      if (segment.kind !== 'stairs') continue;
      if (segment.from_floor_id === props.floorId) ids.add(segment.from_node_id);
      if (segment.to_floor_id === props.floorId) ids.add(segment.to_node_id);
    }
    return ids;
  }, [props.safePath, props.floorId]);

  // Hook 4: Canvas Animations
  useCanvasAnimations({
    stageRef,
    activeWireDirectionsCount: activeWireDirections.size,
    dangerDeviceIdsCount: dangerDeviceIds.size,
    warningDeviceIdsCount: warningDeviceIds.size,
  });

  const getSnappedSensorPointer = useCallback((pointerX: number, pointerY: number) => {
    if (props.activeTool !== 'led_wire-pen') {
      return { pointer: { x: pointerX, y: pointerY }, hoveredId: null };
    }

    const routeNodeTypes = new Set(['sensor', 'mq2', 'temp', 'room', 'exit', 'stairs', 'led']);
    const sensors = props.objects.filter((o) => routeNodeTypes.has(o.type) && o.visible !== false);

    for (const s of sensors) {
      const size = getDefaultSize(s.type);
      const centerX = s.x + (s.width ?? size.width) / 2;
      const centerY = s.y + (s.height ?? size.height) / 2;
      const dist = Math.hypot(pointerX - centerX, pointerY - centerY);
      if (dist < 40) {
        return { pointer: { x: centerX, y: centerY }, hoveredId: s.id };
      }
    }

    return { pointer: { x: pointerX, y: pointerY }, hoveredId: null };
  }, [props.activeTool, props.objects]);

  const getObjectIdsAtPointer = useCallback((stage: Konva.Stage, screenPos: { x: number; y: number }) => {
    const ids = new Set<string>();
    const offsets = [
      { x: 0, y: 0 },
      { x: -8, y: 0 },
      { x: 8, y: 0 },
      { x: 0, y: -8 },
      { x: 0, y: 8 },
    ];

    for (const offset of offsets) {
      const intersect = stage.getIntersection({ x: screenPos.x + offset.x, y: screenPos.y + offset.y });
      if (intersect) {
        let current: Konva.Container | Konva.Node | null = intersect;
        while (current) {
          const id = current.id();
          if (id && props.objects.some((obj) => obj.id === id && !obj.locked)) {
            ids.add(id);
            break;
          }
          current = current.getParent();
        }
      }
    }
    return Array.from(ids);
  }, [props.objects]);

  function stagePointerToWorld() {
    const stage = stageRef.current;
    if (!stage) return null;

    const pointer = stage.getPointerPosition();
    if (!pointer) return null;

    return {
      x: (pointer.x - props.position.x) / props.scale,
      y: (pointer.y - props.position.y) / props.scale,
    };
  }

  function clickedOnEmptyArea(target: Konva.Node) {
    return (
      target === target.getStage() ||
      target.hasName('workspace-empty')
    );
  }

  function handleMouseDown(event: Konva.KonvaEventObject<MouseEvent>) {
    setContextMenu(null);

    const target = event.target;
    const emptyArea = clickedOnEmptyArea(target);

    const isPanningAction = isSpacePressed || event.evt.button === 1;

    // Eraser Tool click logic
    const handledEraser = handleEraserMouseDown(isPanningAction, event.evt.button);
    if (handledEraser) return;

    // Drawing Mode click logic (Pen Tool)
    const isPenTool = props.activeTool === 'floor_base-pen' || props.activeTool === 'led_wire-pen' || props.activeTool === 'wall-pen';
    if (props.editMode && isPenTool && !isPanningAction) {
      const pointer = stagePointerToWorld();
      if (!pointer) return;

      let clickX = pointer.x;
      let clickY = pointer.y;
      if (props.activeTool === 'led_wire-pen') {
        const { pointer: snappedPointer } = getSnappedSensorPointer(pointer.x, pointer.y);
        clickX = snappedPointer.x;
        clickY = snappedPointer.y;
      }

      const handled = handleCanvasClick(clickX, clickY, event.evt.button);
      if (handled) return;
    }

    // Adding objects on click if a tool is active (Edit Mode only), unless trying to pan
    if (props.editMode && props.activeTool !== 'select' && props.activeTool !== 'eraser' && !isPanningAction) {
      if (emptyArea) {
        const pointer = stagePointerToWorld();
        if (pointer) {
          props.onAddObject(props.activeTool as FloorPlanObject['type'], pointer.x, pointer.y);
        }
        return;
      }
    }

    // Left click pan with Space key, OR Middle click pan
    if (isPanningAction) {
      startPan(event.evt.clientX, event.evt.clientY);
      return;
    }

    // Otherwise, normal left click
    if (event.evt.button === 0) {
      if (emptyArea) {
        props.onClearSelection();
      }
    }
  }

  function handleMouseMove(event: Konva.KonvaEventObject<MouseEvent>) {
    const handledPanning = handleStagePanningMove(event);
    if (handledPanning) return;

    const pointer = stagePointerToWorld();
    if (pointer) {
      setLocalMousePos(pointer);

      const handledEraser = handleEraserMouseMove();
      if (handledEraser) return;

      if (props.activeTool === 'led_wire-pen') {
        const { pointer: snappedPointer, hoveredId } = getSnappedSensorPointer(pointer.x, pointer.y);
        setHoveredSensorId(hoveredId);
        setLocalMousePos(snappedPointer);
        if (drawingState) {
          handlePenMouseMove(snappedPointer.x, snappedPointer.y);
        }
      } else {
        setHoveredSensorId(null);
        if (drawingState) {
          handlePenMouseMove(pointer.x, pointer.y);
        }
      }
    }
  }

  function handleMouseUp() {
    const handledEraser = handleEraserMouseUp();
    if (handledEraser) return;
    handleStagePanningUp();
  }

  function handleDblClick(event: Konva.KonvaEventObject<MouseEvent>) {
    if (props.editMode) {
      const handled = handleCanvasDblClick();
      if (handled) {
        event.cancelBubble = true;
      }
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (!props.editMode) return;

    const type = e.dataTransfer.getData('text/plain') as FloorPlanObject['type'];
    if (!type || (type as string) === 'eraser') return;

    const stage = stageRef.current;
    if (!stage) return;

    // Get pointer coordinates relative to canvas bounding box
    const container = stage.container();
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert coordinates to canvas world zoom/pan space
    const stageX = (x - props.position.x) / props.scale;
    const stageY = (y - props.position.y) / props.scale;

    props.onAddObject(type, stageX, stageY);
  }

  // Layering helper: sorted by visual hierarchy (floor_base at bottom, led_wire behind sensors, connector at top)
  const sortedObjects = useMemo(() => {
    const order = [
      'floor_base',
      'led_wire',
      'wall',
      'stairs',
      'elevator',
      'exit',
      'sensor',
      'label',
      'connector',
    ];
    return [...props.objects].sort((a, b) => {
      const idxA = order.indexOf(a.type);
      const idxB = order.indexOf(b.type);
      const valA = idxA !== -1 ? idxA : 99;
      const valB = idxB !== -1 ? idxB : 99;
      return valA - valB;
    });
  }, [props.objects]);

  const visibleObjects = useMemo(() => {
    return sortedObjects.filter((o) => !erasedIds.has(o.id));
  }, [sortedObjects, erasedIds]);

  // Memoized render functions delegating to sub-components
  const renderBelowOutline = useCallback((object: FloorPlanObject) => {
    return <BelowObjectOutline key={`below-${object.id}`} object={object} isDark={isDark} />;
  }, [isDark]);

  const renderPlanObject = useCallback((object: FloorPlanObject) => {
    if (object.visible === false || object.id === editingLabelId) return null;

    const selected = selectedIdSet.has(object.id);
    const isSensorDanger = ['sensor', 'mq2', 'temp'].includes(object.type)
      && (dangerDeviceIds.has(object.id) || object.nodeStatus === 'danger');
    const isSensorWarning = object.type === 'sensor' && warningDeviceIds.has(object.id);
    const sensorReading = sensorValues.get(object.id);

    const width = object.width || getDefaultSize(object.type).width;
    const height = object.height || getDefaultSize(object.type).height;

    const commonProps = {
      id: object.id,
      x: object.x,
      y: object.y,
      draggable: !object.locked && !isPanning && !isSpacePressed && props.editMode,
      rotation: object.rotation || 0,
      dragBoundFunc: (pos: { x: number; y: number }) => pos,

      onClick: (event: Konva.KonvaEventObject<MouseEvent>) => {
        if (isSpacePressed || event.evt.button === 1) return;
        event.cancelBubble = true;

        const isPlacementTool = props.activeTool !== 'select' && props.activeTool !== 'eraser' && !props.activeTool.endsWith('-pen');
        if (isPlacementTool) {
          const stage = event.target.getStage();
          const pointer = stage?.getPointerPosition();
          if (pointer) {
            const worldX = (pointer.x - props.position.x) / props.scale;
            const worldY = (pointer.y - props.position.y) / props.scale;
            props.onAddObject(props.activeTool as FloorPlanObject['type'], worldX, worldY);
          }
          return;
        }

        props.onSelect(object.id, event.evt.shiftKey);
        const isPenTool = props.activeTool === 'floor_base-pen';
        if (isPenTool) {
          props.onContextAction('select', '');
        }
      },
      onTap: (event: Konva.KonvaEventObject<Event>) => {
        event.cancelBubble = true;

        const isPlacementTool = props.activeTool !== 'select' && props.activeTool !== 'eraser' && !props.activeTool.endsWith('-pen');
        if (isPlacementTool) {
          const stage = event.target.getStage();
          const pointer = stage?.getPointerPosition();
          if (pointer) {
            const worldX = (pointer.x - props.position.x) / props.scale;
            const worldY = (pointer.y - props.position.y) / props.scale;
            props.onAddObject(props.activeTool as FloorPlanObject['type'], worldX, worldY);
          }
          return;
        }

        props.onSelect(object.id, false);
        const isPenTool = props.activeTool === 'floor_base-pen';
        if (isPenTool) {
          props.onContextAction('select', '');
        }
      },
      onDblClick: (e: any) => {
        if (!props.editMode) return;
        if (object.type !== 'label') {
          const nextName = window.prompt('Đổi tên vật thể', object.name || '');
          if (nextName !== null) props.onUpdateObject(object.id, { name: nextName });
          return;
        }

        const node = e.target;
        const stage = node.getStage();
        if (!stage) return;

        const textPosition = node.getAbsolutePosition();
        const stageBox = stage.container().getBoundingClientRect();

        setEditingLabelId(object.id);
        setEditingTextVal(object.name || '');

        const w = (object.width || 120) * props.scale;
        const h = (object.height || 30) * props.scale;

        setInputPos({
          x: stageBox.left + textPosition.x,
          y: stageBox.top + textPosition.y,
          width: Math.max(120, w),
          height: Math.max(30, h),
          rotation: node.getAbsoluteRotation(),
        });
      },
      onContextMenu: (event: Konva.KonvaEventObject<PointerEvent>) => {
        event.evt.preventDefault();
        event.cancelBubble = true;
        if (!props.editMode) return;
        setContextMenu({
          x: event.evt.clientX,
          y: event.evt.clientY,
          objectId: object.id,
        });
      },
      onDragMove: (event: Konva.KonvaEventObject<DragEvent>) => {
        const next = { x: event.target.x(), y: event.target.y() };
        pendingGuideTargetRef.current = { ...object, ...next };

        // Real-time update of polygon vertex handles position
        if (object.shapeType === 'polygon') {
          const handlesGroup = event.target.getStage()?.findOne(`#vertex-handles-${object.id}`);
          if (handlesGroup) {
            handlesGroup.x(next.x);
            handlesGroup.y(next.y);
          }
        }

        if (guideFrameRef.current === null && performance.now() - lastGuideUpdateRef.current >= 32) {
          guideFrameRef.current = requestAnimationFrame(() => {
            guideFrameRef.current = null;
            lastGuideUpdateRef.current = performance.now();
            const target = pendingGuideTargetRef.current;
            if (target) {
              setGuides(getGuideLines(target, props.objects));

              // Real-time update of any connected led_wire or connector
              const size = getDefaultSize(object.type);
              const nodeCenterX = target.x + (object.width ?? size.width) / 2;
              const nodeCenterY = target.y + (object.height ?? size.height) / 2;

              props.objects.forEach((obj) => {
                if (obj.type === 'led_wire' || obj.type === 'connector') {
                  const isFrom = obj.fromNodeId === object.id;
                  const isTo = obj.toNodeId === object.id;
                  if (isFrom || isTo) {
                    const group = event.target.getStage()?.findOne(`#${obj.id}`);
                    if (group instanceof Konva.Group) {
                      const relX = nodeCenterX - group.x();
                      const relY = nodeCenterY - group.y();

                      const lines = group.find('Line');
                      const arrows = group.find('Arrow');
                      [...lines, ...arrows].forEach((line) => {
                        if (line instanceof Konva.Line) {
                          const pts = [...line.points()];
                          if (pts.length >= 4) {
                            if (isFrom) {
                              pts[0] = relX;
                              pts[1] = relY;
                            }
                            if (isTo) {
                              pts[pts.length - 2] = relX;
                              pts[pts.length - 1] = relY;
                            }
                            line.points(pts);
                          }
                        }
                      });
                    }
                  }
                }
              });

              event.target.getLayer()?.batchDraw();
            }
          });
        }
      },
      onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => {
        const snapped = snapPosition(event.target.x(), event.target.y(), props.snapEnabled);
        props.onUpdateObject(object.id, snapped);
        if (guideFrameRef.current !== null) cancelAnimationFrame(guideFrameRef.current);
        guideFrameRef.current = null;
        pendingGuideTargetRef.current = null;
        setGuides([]);
      },
      onTransformEnd: (event: Konva.KonvaEventObject<Event>) => {
        const node = event.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);

        props.onUpdateObject(object.id, {
          x: node.x(),
          y: node.y(),
          width: Math.max(16, width * scaleX),
          height: Math.max(16, height * scaleY),
          rotation: node.rotation(),
        });
      },
    };

    switch (object.type) {
      case 'floor_base':
        return (
          <FloorBaseShape
            key={object.id}
            object={object}
            selected={selected}
            isDark={isDark}
            commonProps={commonProps}
          />
        );
      case 'exit':
        return (
          <ExitShape
            key={object.id}
            object={object}
            selected={selected}
            commonProps={commonProps}
          />
        );
      case 'stairs':
        return (
          <StairsShape
            key={object.id}
            object={object}
            selected={selected}
            isDark={isDark}
            active={activeStairIds.has(object.id)}
            commonProps={commonProps}
          />
        );
      case 'elevator':
        return (
          <ElevatorShape
            key={object.id}
            object={object}
            selected={selected}
            isDark={isDark}
            commonProps={commonProps}
          />
        );
      case 'sensor':
        return (
          <SensorShape
            key={object.id}
            object={object}
            selected={selected}
            isDark={isDark}
            isDanger={isSensorDanger}
            isWarning={isSensorWarning}
            reading={sensorReading}
            commonProps={commonProps}
            isHovered={hoveredSensorId === object.id}
          />
        );
      case 'led_wire':
        const wireDirection = activeWireDirections.get(object.id);
        return (
          <LedWireShape
            key={object.id}
            object={object}
            selected={selected}
            isDark={isDark}
            active={wireDirection !== undefined}
            reverse={wireDirection?.reverse ?? false}
            status={wireDirection?.status}
            fromNode={object.fromNodeId ? getObjectWithDragOverlay(object.fromNodeId) : undefined}
            toNode={object.toNodeId ? getObjectWithDragOverlay(object.toNodeId) : undefined}
            commonProps={commonProps}
          />
        );
      case 'wall':
        return (
          <WallShape
            key={object.id}
            object={object}
            selected={selected}
            isDark={isDark}
            commonProps={commonProps}
          />
        );
      case 'connector':
        return (
          <ConnectorShape
            key={object.id}
            object={object}
            selected={selected}
            isDark={isDark}
            fromNode={object.fromNodeId ? getObjectWithDragOverlay(object.fromNodeId) : undefined}
            toNode={object.toNodeId ? getObjectWithDragOverlay(object.toNodeId) : undefined}
            wallObjects={wallObjects}
            commonProps={commonProps}
          />
        );
      default:
        return (
          <LabelShape
            key={object.id}
            object={object}
            isDark={isDark}
            commonProps={commonProps}
          />
        );
    }
  }, [
    selectedIdSet,
    dangerRooms,
    dangerDeviceIds,
    warningDeviceIds,
    sensorValues,
    isDark,
    editingLabelId,
    isPanning,
    isSpacePressed,
    props.editMode,
    props.scale,
    props.snapEnabled,
    props.activeTool,
    props.onSelect,
    props.onUpdateObject,
    props.onContextAction,
    getObjectWithDragOverlay,
    wallObjects,
    activeWireDirections,
    activeStairIds,
    props.objects,
    hoveredSensorId,
  ]);

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full overflow-hidden bg-slate-950"
      style={{
        cursor: isPanning ? 'grabbing' : isSpacePressed ? 'grab' : props.activeTool === 'eraser' ? 'none' : 'default',
      }}
      onMouseLeave={handleMouseUp}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Stage
        ref={stageRef}
        width={viewport.width}
        height={viewport.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onDblClick={handleDblClick}
      >
        {/* Workspace Canvas (Drawing sheet background) */}
        <CanvasBackground
          position={props.position}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          scale={props.scale}
          isDark={isDark}
          snapEnabled={props.snapEnabled}
          gridPattern={gridPattern}
        />

        <Layer>
          <Group x={props.position.x} y={props.position.y} scaleX={props.scale} scaleY={props.scale}>

            {/* Render underlay of floor below */}
            {props.showBelowBaseline && props.belowObjects && props.belowObjects
              .filter((obj) => !['mq2', 'temp', 'led', 'connector', 'room', 'door'].includes(obj.type))
              .map(renderBelowOutline)}

            {/* Render floor plan objects (Base platform at the bottom) */}
            {visibleObjects.map(renderPlanObject)}

            {/* Pen Tool drawing preview */}
            <DrawingPreview
              drawingState={drawingState}
              mousePos={mousePos}
              guideLines={guideLines}
              scale={props.scale}
            />

            {/* Eraser Brush Circle Preview */}
            {props.editMode && props.activeTool === 'eraser' && localMousePos && (
              <Circle
                x={localMousePos.x}
                y={localMousePos.y}
                radius={12}
                fill={isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.15)'}
                stroke="#ef4444"
                strokeWidth={1.5}
                listening={false}
              />
            )}

            {/* Polygon vertex editing handles */}
            {props.editMode && selectedObjects.length === 1 && selectedObjects[0].shapeType === 'polygon' && (
              <PolygonVertexHandles
                targetObj={selectedObjects[0]}
                stageRef={stageRef}
                onUpdateObject={props.onUpdateObject}
                onContextAction={props.onContextAction}
                fromNode={selectedObjects[0].fromNodeId ? getObjectWithDragOverlay(selectedObjects[0].fromNodeId) : undefined}
                toNode={selectedObjects[0].toNodeId ? getObjectWithDragOverlay(selectedObjects[0].toNodeId) : undefined}
              />
            )}

            {/* Snapping guidelines in Edit Mode */}
            <GuidesOverlay
              editMode={props.editMode}
              guides={guides}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
            />

            {/* Selection transformer inside Edit Mode only */}
            {props.editMode && (
              <Transformer
                ref={transformerRef}
                rotateEnabled={resizeEnabled}
                resizeEnabled={resizeEnabled}
                borderStroke="#3b82f6"
                anchorStroke="#3b82f6"
                anchorFill={isDark ? '#1e293b' : '#ffffff'}
                enabledAnchors={
                  resizeEnabled
                    ? [
                      'top-left',
                      'top-center',
                      'top-right',
                      'middle-right',
                      'bottom-right',
                      'bottom-center',
                      'bottom-left',
                      'middle-left',
                    ]
                    : []
                }
                boundBoxFunc={(oldBox, newBox) =>
                  newBox.width < 14 || newBox.height < 14 ? oldBox : newBox
                }
              />
            )}

            {/* Edge and Corner Resizers for base drawing canvas sheet */}
            {props.editMode && props.selectedIds.length === 0 && (
              <SheetEdgeResizers
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                activeEdge={activeEdge}
                setHoveredEdge={setHoveredEdge}
                dragResizeBounds={dragResizeBounds}
                setDragResizeBounds={setDragResizeBounds}
                onCommitCanvasResize={props.onCommitCanvasResize}
              />
            )}

            {/* Drag Resize Bounds Guide Box & Tooltip */}
            {dragResizeBounds && (
              <>
                <Rect
                  x={dragResizeBounds.x}
                  y={dragResizeBounds.y}
                  width={dragResizeBounds.w}
                  height={dragResizeBounds.h}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dash={[6, 4]}
                  listening={false}
                />
                <Group
                  x={dragResizeBounds.x + dragResizeBounds.w / 2 - 40}
                  y={dragResizeBounds.y + dragResizeBounds.h / 2 - 10}
                >
                  <Rect
                    width={80}
                    height={20}
                    fill={isDark ? '#0f172a' : '#ffffff'}
                    cornerRadius={6}
                    stroke="#3b82f6"
                    strokeWidth={1}
                    shadowColor="rgba(0, 0, 0, 0.15)"
                    shadowBlur={4}
                    listening={false}
                  />
                  <Text
                    text={`${Math.round(dragResizeBounds.w)} × ${Math.round(dragResizeBounds.h)}`}
                    width={80}
                    align="center"
                    y={5}
                    fill={isDark ? '#cbd5e1' : '#334155'}
                    fontSize={9}
                    fontStyle="bold"
                    listening={false}
                  />
                </Group>
              </>
            )}
          </Group>
        </Layer>
      </Stage>

      {/* Floating Zoom Controls (Figma Style) */}
      <ZoomControls
        scale={props.scale}
        isDark={isDark}
        onZoomIn={props.onZoomIn}
        onZoomOut={props.onZoomOut}
        onFit={props.onFit}
        onReset={props.onReset}
      />

      {/* Floating Selection Actions Bar */}
      {props.editMode && (
        <SelectionToolbar
          selectedObjects={selectedObjects}
          isDark={isDark}
          onContextAction={props.onContextAction}
        />
      )}

      {/* Context Menu for right-click in Edit Mode */}
      <ContextMenu
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        isDark={isDark}
        onContextAction={props.onContextAction}
      />

      {/* Inline Text Editor Overlay */}
      <TextEditorOverlay
        editingLabelId={editingLabelId}
        setEditingLabelId={setEditingLabelId}
        editingTextVal={editingTextVal}
        setEditingTextVal={setEditingTextVal}
        inputPos={inputPos}
        scale={props.scale}
        isDark={isDark}
        objects={props.objects}
        onUpdateObject={props.onUpdateObject}
      />
    </div>
  );
}

export const CanvasEditor = React.memo(CanvasEditorComponent);
export default CanvasEditor;
