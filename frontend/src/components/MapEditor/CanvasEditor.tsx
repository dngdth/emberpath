import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Konva from 'konva';
import { Circle, Group, Layer, Line, Rect, Stage, Text, Transformer } from 'react-konva';
import { FloorPlanObject } from '../../types/editor';
import { SensorDevice } from '../../types/sensor';
import { getDefaultSize, isResizable, isPointInPolygon } from '../../utils/geometryHelpers';
import { snapPosition, getGuideLines } from '../../utils/snapHelpers';
import { useThemeStore } from '../../store/themeStore';
import { createNewObject } from '../../data/initialMockData';
import { usePenDrawing } from '../../hooks/usePenDrawing';
import { LedWireShape } from './Shapes/LedWireShape';

// Shape components imports
import { FloorBaseShape } from './Shapes/FloorBaseShape';
import { RoomShape } from './Shapes/RoomShape';
import { DoorShape } from './Shapes/DoorShape';
import { ExitShape } from './Shapes/ExitShape';
import { StairsShape } from './Shapes/StairsShape';
import { ElevatorShape } from './Shapes/ElevatorShape';
import { WallShape } from './Shapes/WallShape';
import { SensorShape } from './Shapes/SensorShape';
import { LedShape } from './Shapes/LedShape';
import { ConnectorShape } from './Shapes/ConnectorShape';
import { LabelShape } from './Shapes/LabelShape';
import { BelowObjectOutline } from './Shapes/BelowObjectOutline';
import { PolygonVertexHandles } from './Shapes/PolygonVertexHandles';
import { SheetEdgeResizers } from './Shapes/SheetEdgeResizers';

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
  onAddCustomObject?: (obj: FloorPlanObject) => void;
  onSelect: (id: string, append: boolean) => void;
  onClearSelection: () => void;
  onUpdateObject: (id: string, patch: Partial<FloorPlanObject>) => void;
  onSelectionBox: (ids: string[]) => void;
  onContextAction: (action: string, objectId: string) => void;
  onViewportChange?: (viewport: { width: number; height: number }) => void;
  safePath?: string[];

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
    handleCanvasClick,
    handleMouseMove: handlePenMouseMove,
    cancelDrawing,
  } = usePenDrawing(
    props.activeTool,
    props.onAddCustomObject,
    props.onAddObject,
    props.onSelect,
    () => props.onContextAction('select', '')
  );

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
  const [viewport, setViewport] = useState({ width: 1200, height: 760 });
  const [hoveredEdge, setHoveredEdge] = useState<'left' | 'right' | 'top' | 'bottom' | null>(null);
  const [dragResizeBounds, setDragResizeBounds] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const activeEdge = hoveredEdge;

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [panOrigin, setPanOrigin] = useState<{ x: number; y: number } | null>(null);

  const [isSpacePressed, setIsSpacePressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );
      if (e.code === 'Space' && !isInput) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
      if (e.code === 'Escape') {
        if (drawingState) {
          cancelDrawing();
          e.preventDefault();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    const handleBlur = () => {
      setIsSpacePressed(false);
      setDrawingState(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [drawingState]);

  // States for inline text editor
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingTextVal, setEditingTextVal] = useState('');
  const [inputPos, setInputPos] = useState({ x: 0, y: 0, width: 100, height: 30, rotation: 0 });

  const safePathLineRef = useRef<Konva.Line | null>(null);

  const selectedObjects = useMemo(
    () => props.objects.filter((object) => props.selectedIds.includes(object.id)),
    [props.objects, props.selectedIds],
  );
  const selectedIdSet = useMemo(() => new Set(props.selectedIds), [props.selectedIds]);
  const objectById = useMemo(
    () => new Map(props.objects.map((object) => [object.id, object])),
    [props.objects],
  );
  const wallObjects = useMemo(
    () => props.objects.filter((object) => object.type === 'wall'),
    [props.objects],
  );

  const resizeEnabled = selectedObjects.length === 1 && isResizable(selectedObjects[0].type);

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
    const rooms = new Set<string>();
    const dangerPositions: { x: number; y: number }[] = [];

    props.objects.forEach((obj) => {
      if (obj.type === 'sensor' || obj.type === 'mq2' || obj.type === 'temp') {
        if (dangerDeviceIds.has(obj.id)) {
          dangerPositions.push({ x: obj.x, y: obj.y });
        }
      }
    });

    props.objects.forEach((obj) => {
      if (obj.type === 'room') {
        const isPolygon = obj.shapeType === 'polygon';
        const pts = obj.points;

        if (isPolygon && pts && pts.length >= 6) {
          const poly: { x: number; y: number }[] = [];
          for (let i = 0; i < pts.length; i += 2) {
            poly.push({ x: obj.x + pts[i], y: obj.y + pts[i + 1] });
          }
          const hasDanger = dangerPositions.some((p) => isPointInPolygon(p.x, p.y, poly));
          if (hasDanger) {
            rooms.add(obj.id);
          }
        } else {
          const rx = obj.x;
          const ry = obj.y;
          const rw = obj.width || 240;
          const rh = obj.height || 140;

          const hasDanger = dangerPositions.some(
            (p) => p.x >= rx && p.x <= rx + rw && p.y >= ry && p.y <= ry + rh
          );
          if (hasDanger) {
            rooms.add(obj.id);
          }
        }
      }
    });

    return rooms;
  }, [props.objects, dangerDeviceIds]);

  const safePathPoints = useMemo(() => {
    if (!props.safePath || props.safePath.length < 2) return null;
    const points: number[] = [];
    for (const id of props.safePath) {
      const node = props.objects.find((o) => o.id === id);
      if (node) {
        points.push(node.x + (node.width || getDefaultSize(node.type).width) / 2);
        points.push(node.y + (node.height || getDefaultSize(node.type).height) / 2);
      }
    }
    return points.length >= 4 ? points : null;
  }, [props.safePath, props.objects]);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;

    const updateViewport = () => {
      const next = {
        width: node.clientWidth,
        height: node.clientHeight,
      };
      setViewport(next);
      props.onViewportChange?.(next);
    };

    updateViewport();

    const observer = new ResizeObserver(updateViewport);
    observer.observe(node);

    return () => observer.disconnect();
  }, [props.onViewportChange]);

  useEffect(() => () => {
    if (guideFrameRef.current !== null) cancelAnimationFrame(guideFrameRef.current);
  }, []);

  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    const nodes = props.selectedIds
      .map((id) => stageRef.current?.findOne(`#${id}`))
      .filter(Boolean) as Konva.Node[];

    // Do not attach transformer box around polygon floor bases / rooms to let handles stand out clearly
    const activeNodes = nodes.filter(node => {
      const obj = props.objects.find(o => o.id === node.id());
      return !(obj?.shapeType === 'polygon');
    });

    transformerRef.current.nodes(activeNodes);
    transformerRef.current.getLayer()?.batchDraw();
  }, [props.selectedIds, props.objects]);

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

  function startPan(clientX: number, clientY: number) {
    setIsPanning(true);
    setPanStart({ x: clientX, y: clientY });
    setPanOrigin({ x: props.position.x, y: props.position.y });
  }

  function handleMouseDown(event: Konva.KonvaEventObject<MouseEvent>) {
    setContextMenu(null);

    const target = event.target;
    const emptyArea = clickedOnEmptyArea(target);

    const isPanningAction = isSpacePressed || event.evt.button === 1;

    // Drawing Mode click logic (Pen Tool)
    const isPenTool = props.activeTool === 'room-pen' || props.activeTool === 'floor_base-pen' || props.activeTool === 'led_wire-pen';
    if (props.editMode && isPenTool && !isPanningAction) {
      const pointer = stagePointerToWorld();
      if (!pointer) return;

      const handled = handleCanvasClick(pointer.x, pointer.y, event.evt.button);
      if (handled) return;
    }

    // Adding objects on click if a tool is active (Edit Mode only), unless trying to pan
    if (props.editMode && props.activeTool !== 'select' && !isPanningAction) {
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
    if (isPanning && panStart && panOrigin) {
      const dx = event.evt.clientX - panStart.x;
      const dy = event.evt.clientY - panStart.y;

      props.onStageChange({
        position: {
          x: panOrigin.x + dx,
          y: panOrigin.y + dy,
        },
      });
      return;
    }

    if (drawingState) {
      const pointer = stagePointerToWorld();
      if (pointer) handlePenMouseMove(pointer.x, pointer.y);
    }
  }

  function handleMouseUp() {
    setIsPanning(false);
    setPanStart(null);
    setPanOrigin(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (!props.editMode) return;

    const type = e.dataTransfer.getData('text/plain') as FloorPlanObject['type'];
    if (!type) return;

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

  function handleWheel(e: any) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    if (e.evt.ctrlKey) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const scaleBy = 1.05;
      const oldScale = props.scale;
      const nextScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const clampedScale = Math.max(0.3, Math.min(3, nextScale));

      const mousePointTo = {
        x: (pointer.x - props.position.x) / oldScale,
        y: (pointer.y - props.position.y) / oldScale,
      };

      props.onStageChange({
        scale: clampedScale,
        position: {
          x: pointer.x - mousePointTo.x * clampedScale,
          y: pointer.y - mousePointTo.y * clampedScale,
        },
      });
    } else {
      let dx = e.evt.deltaX;
      let dy = e.evt.deltaY;

      // Shift + scroll scrolls horizontally
      if (e.evt.shiftKey && dx === 0) {
        dx = dy;
        dy = 0;
      }

      props.onStageChange({
        position: {
          x: props.position.x - dx,
          y: props.position.y - dy,
        },
      });
    }
  }

  // Layering helper: floor_base at bottom, connector at top
  const sortedObjects = useMemo(() => {
    const bases = props.objects.filter((o) => o.type === 'floor_base');
    const connectors = props.objects.filter((o) => o.type === 'connector');
    const others = props.objects.filter((o) => o.type !== 'floor_base' && o.type !== 'connector');
    return [...bases, ...others, ...connectors];
  }, [props.objects]);

  // Memoized render functions delegating to sub-components
  const renderBelowOutline = useCallback((object: FloorPlanObject) => {
    return <BelowObjectOutline key={`below-${object.id}`} object={object} isDark={isDark} />;
  }, [isDark]);

  const renderPlanObject = useCallback((object: FloorPlanObject) => {
    if (object.visible === false || object.id === editingLabelId) return null;

    const selected = selectedIdSet.has(object.id);
    const isRoomDanger = object.type === 'room' && dangerRooms.has(object.id);
    const isSensorDanger = (object.type === 'mq2' || object.type === 'temp') && dangerDeviceIds.has(object.id);
    const isSensorWarning = (object.type === 'mq2' || object.type === 'temp') && warningDeviceIds.has(object.id);
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
        props.onSelect(object.id, event.evt.shiftKey);
        const isPenTool = props.activeTool === 'room-pen' || props.activeTool === 'floor_base-pen';
        if (isPenTool) {
          props.onContextAction('select', '');
        }
      },
      onTap: (event: Konva.KonvaEventObject<Event>) => {
        event.cancelBubble = true;
        props.onSelect(object.id, false);
        const isPenTool = props.activeTool === 'room-pen' || props.activeTool === 'floor_base-pen';
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
        if (guideFrameRef.current === null && performance.now() - lastGuideUpdateRef.current >= 32) {
          guideFrameRef.current = requestAnimationFrame(() => {
            guideFrameRef.current = null;
            lastGuideUpdateRef.current = performance.now();
            const target = pendingGuideTargetRef.current;
            if (target) setGuides(getGuideLines(target, props.objects));
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
      case 'room':
        return (
          <RoomShape
            key={object.id}
            object={object}
            selected={selected}
            isDark={isDark}
            isRoomDanger={isRoomDanger}
            commonProps={commonProps}
          />
        );
      case 'door':
        return (
          <DoorShape
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
      case 'sensor':
      case 'mq2':
      case 'temp':
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
          />
        );
      case 'led_wire':
        return (
          <LedWireShape
            key={object.id}
            object={object}
            selected={selected}
            isDark={isDark}
            active={Boolean(props.safePath && props.safePath.length > 0)}
            commonProps={commonProps}
          />
        );
      case 'led':
        return (
          <LedShape
            key={object.id}
            object={object}
            selected={selected}
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
            fromNode={object.fromNodeId ? objectById.get(object.fromNodeId) : undefined}
            toNode={object.toNodeId ? objectById.get(object.toNodeId) : undefined}
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
    objectById,
    wallObjects,
    props.objects,
  ]);

  const hasSafePathAnimation = Boolean(safePathPoints) || Boolean(props.safePath && props.safePath.length > 0);
  const hasStatusAnimation = dangerRooms.size > 0 || dangerDeviceIds.size > 0 || warningDeviceIds.size > 0;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || (!hasSafePathAnimation && !hasStatusAnimation)) return;

    let dashOffset = 0;
    let previousBlinkPhase: boolean | null = null;

    const anim = new Konva.Animation((frame) => {
      if (!frame) return;
      const time = frame.time;

      // 1. Animate evacuation path line dashOffset & LED wires
      const timeDiff = frame.timeDiff;
      dashOffset = (dashOffset - (timeDiff * 0.05)) % 40;
      if (safePathLineRef.current) {
        safePathLineRef.current.dashOffset(dashOffset);
      }

      const activeLedWires = stage.find('.active-led-wire');
      activeLedWires.forEach((node) => {
        (node as any).dashOffset(dashOffset);
      });

      // 2. Animate blinking danger rooms & warning sensors (500ms intervals)
      const isAlt = Math.floor(time / 500) % 2 === 0;
      if (!hasStatusAnimation || isAlt === previousBlinkPhase) return;
      previousBlinkPhase = isAlt;

      const dangerRoomsNodes = stage.find('.danger-blink');
      dangerRoomsNodes.forEach((node) => {
        (node as any).fill(isAlt ? 'rgba(239, 68, 68, 0.45)' : 'rgba(239, 68, 68, 0.25)');
      });

      const dangerSensors = stage.find('.danger-blink-sensor');
      dangerSensors.forEach((node) => {
        node.opacity(isAlt ? 1.0 : 0.4);
      });

      const warningSensors = stage.find('.warning-blink-sensor');
      warningSensors.forEach((node) => {
        node.opacity(isAlt ? 1.0 : 0.6);
      });
    });

    anim.start();
    return () => {
      anim.stop();
    };
  }, [hasSafePathAnimation, hasStatusAnimation]);

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full overflow-hidden bg-slate-950"
      style={{
        cursor: isPanning ? 'grabbing' : isSpacePressed ? 'grab' : 'default',
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
      >
        {/* Workspace Canvas (Drawing sheet background) */}
        <Layer>
          <Group x={props.position.x} y={props.position.y}>
            <Rect
              name="workspace-empty"
              x={0}
              y={0}
              width={canvasWidth * props.scale}
              height={canvasHeight * props.scale}
              fill={isDark ? '#0f172a' : '#f8fafc'}
              stroke={isDark ? '#1e293b' : '#cbd5e1'}
              strokeWidth={1.5}
              cornerRadius={8}
              shadowColor="rgba(0, 0, 0, 0.08)"
              shadowBlur={16}
            />
            {props.snapEnabled && gridPattern && (
              <Rect
                x={0}
                y={0}
                width={canvasWidth * props.scale}
                height={canvasHeight * props.scale}
                fillPatternImage={gridPattern as any}
                fillPatternScaleX={props.scale}
                fillPatternScaleY={props.scale}
                fillPatternRepeat="repeat"
                opacity={1.0}
                listening={false}
              />
            )}
          </Group>
        </Layer>

        <Layer>
          <Group x={props.position.x} y={props.position.y} scaleX={props.scale} scaleY={props.scale}>
            
            {/* Render underlay of floor below */}
            {props.showBelowBaseline && props.belowObjects && props.belowObjects
              .filter((obj) => !['mq2', 'temp', 'led', 'connector'].includes(obj.type))
              .map(renderBelowOutline)}

            {/* Render floor plan objects (Base platform at the bottom) */}
            {sortedObjects.map(renderPlanObject)}

            {/* Pen Tool drawing preview */}
            {drawingState && mousePos && (
              <Group x={drawingState.startX} y={drawingState.startY}>
                <Line
                  points={[
                    ...drawingState.points,
                    mousePos.x - drawingState.startX,
                    mousePos.y - drawingState.startY,
                  ]}
                  stroke="#3b82f6"
                  strokeWidth={drawingState.type === 'led_wire' ? 3.5 : 2}
                  dash={[4, 4]}
                />
                {/* Closed polygon start indicator */}
                {drawingState.type !== 'led_wire' && drawingState.points.length >= 6 && Math.hypot(mousePos.x - drawingState.startX, mousePos.y - drawingState.startY) < 12 && (
                  <Circle
                    x={0}
                    y={0}
                    radius={8}
                    fill="rgba(16, 185, 129, 0.5)"
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                )}
                {/* Open path node connector snap preview indicator */}
                {drawingState.type === 'led_wire' && (
                  <Circle
                    x={mousePos.x - drawingState.startX}
                    y={mousePos.y - drawingState.startY}
                    radius={5}
                    fill="#3b82f6"
                  />
                )}
              </Group>
            )}

            {/* Polygon vertex editing handles */}
            {props.editMode && selectedObjects.length === 1 && selectedObjects[0].shapeType === 'polygon' && (
              <PolygonVertexHandles
                targetObj={selectedObjects[0]}
                stageRef={stageRef}
                onUpdateObject={props.onUpdateObject}
                onContextAction={props.onContextAction}
              />
            )}

            {/* Safe Escape Route Glowing Flow Arrow Line */}
            {safePathPoints && (
              <Line
                ref={safePathLineRef}
                points={safePathPoints}
                stroke="#10b981"
                strokeWidth={7}
                lineJoin="round"
                lineCap="round"
                dash={[20, 15]}
                shadowColor="#10b981"
                shadowBlur={12}
                shadowOpacity={0.8}
                listening={false}
              />
            )}

            {/* Snapping guidelines in Edit Mode */}
            {props.editMode &&
              guides.map((guide, index) =>
                guide.orientation === 'vertical' ? (
                  <Line
                    key={`guide-${index}`}
                    points={[guide.value, 0, guide.value, canvasHeight]}
                    stroke="#c2410c"
                    dash={[4, 6]}
                  />
                ) : (
                  <Line
                    key={`guide-${index}`}
                    points={[0, guide.value, canvasWidth, guide.value]}
                    stroke="#c2410c"
                    dash={[4, 6]}
                  />
                ),
              )}

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
