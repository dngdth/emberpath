import { useEffect, useMemo, useRef, useState } from 'react';
import Konva from 'konva';
import { Circle, Group, Layer, Line, Rect, Stage, Text, Transformer } from 'react-konva';
import { FloorPlanObject } from '../../types/editor';
import { SensorDevice } from '../../types/sensor';
import { getDefaultSize, isResizable } from '../../utils/geometryHelpers';
import { snapPosition } from '../../utils/snapHelpers';
import { getGuideLines } from '../../utils/snapHelpers';
import { useThemeStore } from '../../store/themeStore';
import clsx from 'clsx';

interface Props {
  objects: FloorPlanObject[];
  selectedIds: string[];
  activeTool: string;
  scale: number;
  position: { x: number; y: number };
  snapEnabled: boolean;
  onStageChange: (patch: { scale?: number; position?: { x: number; y: number } }) => void;
  onAddObject: (type: FloorPlanObject['type'], x: number, y: number) => void;
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

export function CanvasEditor(props: Props) {
  const canvasWidth = props.canvasWidth ?? 1600;
  const canvasHeight = props.canvasHeight ?? 1000;

  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const { darkMode } = useThemeStore();
  const isDark = darkMode;

  const gridPattern = useMemo(() => {
    if (typeof window === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = GRID_SIZE;
    canvas.height = GRID_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.05)' : 'rgba(157, 90, 70, 0.06)';
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
  const activeEdge: string | null = hoveredEdge;

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
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    const handleBlur = () => {
      setIsSpacePressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // States for inline text editor
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingTextVal, setEditingTextVal] = useState('');
  const [inputPos, setInputPos] = useState({ x: 0, y: 0, width: 100, height: 30, rotation: 0 });

  const safePathLineRef = useRef<Konva.Line | null>(null);

  const selectedObjects = useMemo(
    () => props.objects.filter((object) => props.selectedIds.includes(object.id)),
    [props.objects, props.selectedIds],
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
      if (obj.type === 'mq2' || obj.type === 'temp') {
        if (dangerDeviceIds.has(obj.id)) {
          dangerPositions.push({ x: obj.x, y: obj.y });
        }
      }
    });

    props.objects.forEach((obj) => {
      if (obj.type === 'room') {
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

  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    const nodes = props.selectedIds
      .map((id) => stageRef.current?.findOne(`#${id}`))
      .filter(Boolean) as Konva.Node[];

    transformerRef.current.nodes(nodes);
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
      target.hasName('workspace-empty') ||
      target.hasName('workspace-grid')
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
    if (!isPanning || !panStart || !panOrigin) return;

    const dx = event.evt.clientX - panStart.x;
    const dy = event.evt.clientY - panStart.y;

    props.onStageChange({
      position: {
        x: panOrigin.x + dx,
        y: panOrigin.y + dy,
      },
    });
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

  function objectFill(object: FloorPlanObject) {
    if (object.type === 'room') {
      const isDanger = dangerRooms.has(object.id);
      if (isDanger) {
        return 'rgba(239, 68, 68, 0.45)';
      }
      return isDark ? 'rgba(16, 185, 129, 0.15)' : object.color || '#ead9cf';
    }
    if (object.type === 'exit') return isDark ? '#065f46' : '#2ea85f';
    if (object.type === 'door') return isDark ? '#4b5563' : '#d9a36b';
    if (object.type === 'stairs') return isDark ? '#1e293b' : '#c7856c';
    if (object.type === 'mq2' || object.type === 'temp') {
      const isDanger = dangerDeviceIds.has(object.id);
      const isWarning = warningDeviceIds.has(object.id);
      if (isDanger) return '#ef4444';
      if (isWarning) return '#f59e0b';
      return isDark ? '#1e293b' : '#38bdf8';
    }
    if (object.type === 'led') {
      return object.nodeStatus === 'danger' ? '#ef4444' : '#10b981';
    }
    return object.color || '#fff8f3';
  }

  function renderObject(object: FloorPlanObject) {
    if (object.visible === false || object.id === editingLabelId) return null;

    const selected = props.selectedIds.includes(object.id);
    const width = object.width || getDefaultSize(object.type).width;
    const height = object.height || getDefaultSize(object.type).height;

    const isRoomDanger = object.type === 'room' && dangerRooms.has(object.id);

    const commonProps = {
      id: object.id,
      key: object.id,
      x: object.x,
      y: object.y,
      draggable: !object.locked && !isPanning && !isSpacePressed && props.editMode,
      rotation: object.rotation || 0,
      dragBoundFunc: (pos: { x: number; y: number }) => pos,

      onClick: (event: Konva.KonvaEventObject<MouseEvent>) => {
        if (isSpacePressed || event.evt.button === 1) return;
        event.cancelBubble = true;
        props.onSelect(object.id, event.evt.shiftKey);
      },
      onTap: (event: Konva.KonvaEventObject<Event>) => {
        event.cancelBubble = true;
        props.onSelect(object.id, false);
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
        setGuides(getGuideLines({ ...object, ...next }, props.objects));
      },
      onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => {
        const snapped = snapPosition(event.target.x(), event.target.y(), props.snapEnabled);
        props.onUpdateObject(object.id, snapped);
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

    if (object.type === 'room') {
      const roomStroke = isRoomDanger ? '#ef4444' : selected ? '#3b82f6' : isDark ? '#475569' : '#cbd5e1';
      return (
        <Group {...commonProps}>
          <Rect
            name={isRoomDanger ? "danger-blink" : undefined}
            width={width}
            height={height}
            fill={objectFill(object)}
            stroke={roomStroke}
            cornerRadius={16}
            strokeWidth={selected || isRoomDanger ? 3 : 1.5}
            shadowColor={isRoomDanger ? '#ef4444' : selected ? '#3b82f6' : 'rgba(0, 0, 0, 0.04)'}
            shadowBlur={selected || isRoomDanger ? 12 : 0}
            shadowOpacity={0.6}
          />
          <Text
            text={object.name || 'Room'}
            x={16}
            y={14}
            fontSize={15}
            fontStyle="bold"
            fill={isRoomDanger ? '#ef4444' : object.textColor || (isDark ? '#f8fafc' : '#334155')}
          />
          {isRoomDanger && (
            <Group x={16} y={38}>
              <Rect width={84} height={20} fill="#ef4444" cornerRadius={6} />
              <Text text="⚠️ DANGER" x={8} y={5} fontSize={10} fontStyle="bold" fill="#ffffff" />
            </Group>
          )}
        </Group>
      );
    }

    if (object.type === 'door') {
      return (
        <Group {...commonProps}>
          <Rect
            width={width}
            height={height}
            fill={objectFill(object)}
            cornerRadius={4}
            stroke={selected ? '#3b82f6' : 'transparent'}
            strokeWidth={1.5}
          />
          <Text
            text={object.name || ''}
            x={-10}
            y={height + 6}
            fontSize={11}
            fill={isDark ? '#94a3b8' : '#475569'}
          />
        </Group>
      );
    }

    if (object.type === 'exit') {
      return (
        <Group {...commonProps}>
          <Rect
            width={width}
            height={height}
            fill={objectFill(object)}
            cornerRadius={8}
            stroke={selected ? '#3b82f6' : '#10b981'}
            strokeWidth={1.5}
          />
          <Text
            text={object.name || 'EXIT'}
            width={width}
            align="center"
            y={height / 2 - 6}
            fontStyle="bold"
            fontSize={12}
            fill="#ffffff"
          />
        </Group>
      );
    }

    if (object.type === 'stairs') {
      return (
        <Group {...commonProps}>
          <Rect
            width={width}
            height={height}
            fill={objectFill(object)}
            stroke={selected ? '#3b82f6' : isDark ? '#475569' : '#cbd5e1'}
            strokeWidth={1.5}
            dash={[6, 4]}
            cornerRadius={8}
          />
          <Text
            text="Stairs 🪜"
            width={width}
            align="center"
            y={height / 2 - 6}
            fontSize={11}
            fontStyle="bold"
            fill={isDark ? '#94a3b8' : '#475569'}
          />
        </Group>
      );
    }

    if (object.type === 'mq2' || object.type === 'temp') {
      const isDanger = dangerDeviceIds.has(object.id);
      const isWarning = warningDeviceIds.has(object.id);

      let badgeColor = isDark ? '#1e293b' : '#f1f5f9';
      let strokeColor = isDark ? '#334155' : '#cbd5e1';
      let textColor = isDark ? '#cbd5e1' : '#475569';

      if (isDanger) {
        badgeColor = '#ef4444';
        strokeColor = '#fca5a5';
        textColor = '#ffffff';
      } else if (isWarning) {
        badgeColor = '#f59e0b';
        strokeColor = '#fde68a';
        textColor = '#ffffff';
      } else if (selected) {
        strokeColor = '#3b82f6';
      }

      const reading = sensorValues.get(object.id);
      const label = `${object.name || (object.type === 'mq2' ? 'MQ2' : 'Temp')}`;
      const valueStr = reading ? `${reading.val} ${reading.unit}` : '--';

      return (
        <Group {...commonProps}>
          <Circle
            name={isDanger ? "danger-blink-sensor" : isWarning ? "warning-blink-sensor" : undefined}
            radius={22}
            x={22}
            y={22}
            fill={badgeColor}
            stroke={strokeColor}
            strokeWidth={selected || isDanger || isWarning ? 2.5 : 1.5}
            shadowColor={isDanger ? '#ef4444' : isWarning ? '#f59e0b' : ''}
            shadowBlur={isDanger || isWarning ? 10 : 0}
          />
          <Text text={object.type === 'mq2' ? '💨' : '🌡️'} x={13} y={13} fontSize={16} />
          <Text
            text={label}
            x={-15}
            y={48}
            width={74}
            align="center"
            fontSize={10}
            fontStyle="bold"
            fill={isDark ? '#cbd5e1' : '#475569'}
          />
          {/* Live value badge (always display if sensor value is present) */}
          <Group x={-10} y={64}>
            <Rect
              width={64}
              height={16}
              fill={isDark ? '#0f172a' : '#ffffff'}
              stroke={isDanger ? '#ef4444' : isWarning ? '#f59e0b' : isDark ? '#334155' : '#cbd5e1'}
              strokeWidth={1}
              cornerRadius={4}
            />
            <Text
              text={valueStr}
              width={64}
              align="center"
              y={3}
              fontSize={9}
              fontStyle="bold"
              fill={isDanger ? '#ef4444' : isWarning ? '#f59e0b' : isDark ? '#38bdf8' : '#3b82f6'}
            />
          </Group>
        </Group>
      );
    }

    if (object.type === 'led') {
      return (
        <Group {...commonProps}>
          <Circle
            radius={(width || 16) / 2}
            fill={objectFill(object)}
            stroke={selected ? '#3b82f6' : '#ffffff'}
            strokeWidth={1.5}
            shadowColor={objectFill(object)}
            shadowBlur={selected ? 8 : 4}
          />
        </Group>
      );
    }

    if (object.type === 'connector') {
      const fromNode = props.objects.find((o) => o.id === object.fromNodeId);
      const toNode = props.objects.find((o) => o.id === object.toNodeId);
      if (!fromNode || !toNode) return null;

      const fromSize = getDefaultSize(fromNode.type);
      const toSize = getDefaultSize(toNode.type);

      const fromX = fromNode.x + (fromNode.width || fromSize.width) / 2;
      const fromY = fromNode.y + (fromNode.height || fromSize.height) / 2;
      const toX = toNode.x + (toNode.width || toSize.width) / 2;
      const toY = toNode.y + (toNode.height || toSize.height) / 2;

      return (
        <Group {...commonProps} x={0} y={0}>
          <Line
            points={[fromX, fromY, toX, toY]}
            stroke={selected ? '#3b82f6' : isDark ? '#475569' : '#9ca3af'}
            strokeWidth={selected ? 4 : 2}
            dash={[5, 8]}
            opacity={0.7}
            hitStrokeWidth={15}
          />
        </Group>
      );
    }

    return (
      <Group {...commonProps}>
        <Text
          text={object.name || 'Label'}
          fontSize={object.fontSize || 20}
          fill={
            object.textColor || object.color
              ? ((object.textColor === '#f8fafc' || object.color === '#f8fafc') && !isDark)
                ? '#1e293b'
                : (object.textColor || object.color)
              : (isDark ? '#f8fafc' : '#1e293b')
          }
          fontStyle="bold"
        />
      </Group>
    );
  }

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let dashOffset = 0;

    const anim = new Konva.Animation((frame) => {
      if (!frame) return;
      const time = frame.time;

      // 1. Animate evacuation path line dashOffset
      if (safePathLineRef.current) {
        const timeDiff = frame.timeDiff;
        dashOffset = (dashOffset - (timeDiff * 0.05)) % 40;
        safePathLineRef.current.dashOffset(dashOffset);
      }

      // 2. Animate blinking danger rooms & warning sensors (500ms intervals)
      const isAlt = Math.floor(time / 500) % 2 === 0;

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
  }, [props.objects, dangerRooms, safePathPoints]);

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
        <Layer>
          <Rect
            name="workspace-empty"
            x={props.position.x}
            y={props.position.y}
            width={canvasWidth * props.scale}
            height={canvasHeight * props.scale}
            fill={isDark ? '#111827' : '#ffffff'}
            stroke={isDark ? '#1e293b' : '#e2e8f0'}
            cornerRadius={28}
            shadowColor="rgba(0, 0, 0, 0.03)"
            shadowBlur={16}
            shadowOffset={{ x: 0, y: 4 }}
          />
        </Layer>

        <Layer>
          <Group x={props.position.x} y={props.position.y} scaleX={props.scale} scaleY={props.scale}>
            {props.editMode && gridPattern && (
              <Rect
                name="workspace-grid"
                x={0}
                y={0}
                width={canvasWidth}
                height={canvasHeight}
                fillPatternImage={gridPattern as any}
                fillPatternRepeat="repeat"
                listening={false}
              />
            )}

            {/* Baseline Floor Below Rendering */}
            {props.showBelowBaseline &&
              props.belowObjects &&
              props.belowObjects.map((obj) => {
                if (obj.type !== 'room' && obj.type !== 'door' && obj.type !== 'exit' && obj.type !== 'stairs')
                  return null;
                const w = obj.width || getDefaultSize(obj.type).width;
                const h = obj.height || getDefaultSize(obj.type).height;

                const commonProps = {
                  key: `below-${obj.id}`,
                  x: obj.x,
                  y: obj.y,
                  rotation: obj.rotation || 0,
                  listening: false,
                };

                if (obj.type === 'room') {
                  return (
                    <Group {...commonProps}>
                      <Rect
                        width={w}
                        height={h}
                        stroke={isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(148, 163, 184, 0.45)'}
                        strokeWidth={1.5}
                        dash={[4, 6]}
                        cornerRadius={16}
                      />
                      <Text
                        text={`${obj.name || 'Room'} (Tầng dưới)`}
                        x={16}
                        y={14}
                        fontSize={11}
                        fontStyle="italic"
                        fill={isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(148, 163, 184, 0.65)'}
                      />
                    </Group>
                  );
                }

                return (
                  <Group {...commonProps}>
                    <Rect
                      width={w}
                      height={h}
                      stroke={isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.35)'}
                      strokeWidth={1.2}
                      dash={[3, 5]}
                      cornerRadius={8}
                    />
                  </Group>
                );
              })}

            {/* Render Active Plan Objects */}
            {props.objects.map(renderObject)}

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
                  resizeEnabled ? ['top-left', 'top-right', 'bottom-left', 'bottom-right'] : []
                }
                boundBoxFunc={(oldBox, newBox) =>
                  newBox.width < 14 || newBox.height < 14 ? oldBox : newBox
                }
              />
            )}

            {/* Edge and Corner Resizers */}
            {props.editMode && props.selectedIds.length === 0 && (
              <Group>
                {/* Left Edge Resizer */}
                <Line
                  points={[0, 0, 0, canvasHeight]}
                  stroke={activeEdge === 'left' || (dragResizeBounds && activeEdge === 'left') ? '#3b82f6' : 'transparent'}
                  strokeWidth={6}
                  hitStrokeWidth={16}
                  draggable
                  onDragStart={() => setHoveredEdge('left')}
                  onDragMove={(e) => {
                    const node = e.target;
                    const rawDx = node.x();
                    const newW = Math.max(400, Math.min(10000, canvasWidth - rawDx));
                    const constrainedDx = canvasWidth - newW;
                    setDragResizeBounds({ x: constrainedDx, y: 0, w: newW, h: canvasHeight });
                    node.y(0);
                  }}
                  onDragEnd={(e) => {
                    const finalW = dragResizeBounds?.w ?? canvasWidth;
                    const shiftX = canvasWidth - finalW;
                    props.onCommitCanvasResize?.(finalW, canvasHeight, shiftX, 0);
                    setDragResizeBounds(null);
                    setHoveredEdge(null);
                    const node = e.target;
                    node.x(0);
                    node.y(0);
                  }}
                  onMouseEnter={(e) => {
                    setHoveredEdge('left');
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'ew-resize';
                  }}
                  onMouseLeave={(e) => {
                    setHoveredEdge(null);
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'default';
                  }}
                />

                {/* Right Edge Resizer */}
                <Line
                  points={[canvasWidth, 0, canvasWidth, canvasHeight]}
                  stroke={activeEdge === 'right' || (dragResizeBounds && activeEdge === 'right') ? '#3b82f6' : 'transparent'}
                  strokeWidth={6}
                  hitStrokeWidth={16}
                  draggable
                  onDragStart={() => setHoveredEdge('right')}
                  onDragMove={(e) => {
                    const node = e.target;
                    const rawDx = node.x();
                    const newW = Math.max(400, Math.min(10000, canvasWidth + rawDx));
                    setDragResizeBounds({ x: 0, y: 0, w: newW, h: canvasHeight });
                    node.y(0);
                  }}
                  onDragEnd={(e) => {
                    const finalW = dragResizeBounds?.w ?? canvasWidth;
                    props.onCommitCanvasResize?.(finalW, canvasHeight, 0, 0);
                    setDragResizeBounds(null);
                    setHoveredEdge(null);
                    const node = e.target;
                    node.x(0);
                    node.y(0);
                  }}
                  onMouseEnter={(e) => {
                    setHoveredEdge('right');
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'ew-resize';
                  }}
                  onMouseLeave={(e) => {
                    setHoveredEdge(null);
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'default';
                  }}
                />

                {/* Top Edge Resizer */}
                <Line
                  points={[0, 0, canvasWidth, 0]}
                  stroke={activeEdge === 'top' || (dragResizeBounds && activeEdge === 'top') ? '#3b82f6' : 'transparent'}
                  strokeWidth={6}
                  hitStrokeWidth={16}
                  draggable
                  onDragStart={() => setHoveredEdge('top')}
                  onDragMove={(e) => {
                    const node = e.target;
                    const rawDy = node.y();
                    const newH = Math.max(400, Math.min(10000, canvasHeight - rawDy));
                    const constrainedDy = canvasHeight - newH;
                    setDragResizeBounds({ x: 0, y: constrainedDy, w: canvasWidth, h: newH });
                    node.x(0);
                  }}
                  onDragEnd={(e) => {
                    const finalH = dragResizeBounds?.h ?? canvasHeight;
                    const shiftY = canvasHeight - finalH;
                    props.onCommitCanvasResize?.(canvasWidth, finalH, 0, shiftY);
                    setDragResizeBounds(null);
                    setHoveredEdge(null);
                    const node = e.target;
                    node.x(0);
                    node.y(0);
                  }}
                  onMouseEnter={(e) => {
                    setHoveredEdge('top');
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'ns-resize';
                  }}
                  onMouseLeave={(e) => {
                    setHoveredEdge(null);
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'default';
                  }}
                />

                {/* Bottom Edge Resizer */}
                <Line
                  points={[0, canvasHeight, canvasWidth, canvasHeight]}
                  stroke={activeEdge === 'bottom' || (dragResizeBounds && activeEdge === 'bottom') ? '#3b82f6' : 'transparent'}
                  strokeWidth={6}
                  hitStrokeWidth={16}
                  draggable
                  onDragStart={() => setHoveredEdge('bottom')}
                  onDragMove={(e) => {
                    const node = e.target;
                    const rawDy = node.y();
                    const newH = Math.max(400, Math.min(10000, canvasHeight + rawDy));
                    setDragResizeBounds({ x: 0, y: 0, w: canvasWidth, h: newH });
                    node.x(0);
                  }}
                  onDragEnd={(e) => {
                    const finalH = dragResizeBounds?.h ?? canvasHeight;
                    props.onCommitCanvasResize?.(canvasWidth, finalH, 0, 0);
                    setDragResizeBounds(null);
                    setHoveredEdge(null);
                    const node = e.target;
                    node.x(0);
                    node.y(0);
                  }}
                  onMouseEnter={(e) => {
                    setHoveredEdge('bottom');
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'ns-resize';
                  }}
                  onMouseLeave={(e) => {
                    setHoveredEdge(null);
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'default';
                  }}
                />

                {/* Corner Resize Handle */}
                <Group
                  x={canvasWidth}
                  y={canvasHeight}
                  draggable
                  onDragStart={() => setHoveredEdge('right')}
                  onDragMove={(e) => {
                    const node = e.target;
                    const rawDx = node.x() - canvasWidth;
                    const rawDy = node.y() - canvasHeight;
                    const newW = Math.max(400, Math.min(10000, canvasWidth + rawDx));
                    const newH = Math.max(400, Math.min(10000, canvasHeight + rawDy));
                    setDragResizeBounds({ x: 0, y: 0, w: newW, h: newH });
                  }}
                  onDragEnd={(e) => {
                    const finalW = dragResizeBounds?.w ?? canvasWidth;
                    const finalH = dragResizeBounds?.h ?? canvasHeight;
                    props.onCommitCanvasResize?.(finalW, finalH, 0, 0);
                    setDragResizeBounds(null);
                    setHoveredEdge(null);
                    const node = e.target;
                    node.x(canvasWidth);
                    node.y(canvasHeight);
                  }}
                  onMouseEnter={(e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'nwse-resize';
                  }}
                  onMouseLeave={(e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'default';
                  }}
                >
                  <Circle
                    radius={10}
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth={2}
                    shadowColor="rgba(0, 0, 0, 0.25)"
                    shadowBlur={6}
                  />
                  <Line
                    points={[-3, 0, 0, -3, 3, 0]}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                </Group>
              </Group>
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
      <div
        className={clsx(
          'absolute left-1/2 bottom-4 -translate-x-1/2 z-10 flex items-center gap-1.5 p-1.5 rounded-2xl border shadow-xl backdrop-blur-md select-none transition-colors duration-300',
          isDark ? 'bg-slate-900/90 border-slate-800 text-slate-350' : 'bg-white/90 border-slate-200 text-slate-700'
        )}
      >
        <button
          onClick={props.onZoomIn}
          className={clsx(
            'rounded-lg font-bold hover:bg-black/10 transition active:scale-95 text-xs flex items-center justify-center h-7 w-7',
            isDark ? 'hover:text-white' : 'hover:text-slate-900'
          )}
          title="Zoom In"
        >
          +
        </button>
        <span className="text-[10px] font-bold px-1 min-w-[36px] text-center font-mono">
          {Math.round(props.scale * 100)}%
        </span>
        <button
          onClick={props.onZoomOut}
          className={clsx(
            'rounded-lg font-bold hover:bg-black/10 transition active:scale-95 text-xs flex items-center justify-center h-7 w-7',
            isDark ? 'hover:text-white' : 'hover:text-slate-900'
          )}
          title="Zoom Out"
        >
          -
        </button>
        <span className={`h-4 w-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
        <button
          onClick={props.onFit}
          className={clsx(
            'px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-black/10 transition active:scale-95 h-7 flex items-center justify-center',
            isDark ? 'hover:text-white' : 'hover:text-slate-900'
          )}
        >
          Fit
        </button>
        <button
          onClick={props.onReset}
          className={clsx(
            'px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-black/10 transition active:scale-95 h-7 flex items-center justify-center',
            isDark ? 'hover:text-white' : 'hover:text-slate-900'
          )}
        >
          100%
        </button>
      </div>


      {props.editMode && selectedObjects.length > 0 && (
        <div
          className={clsx(
            'absolute left-1/2 top-4 z-20 flex -translate-x-1/2 gap-2 rounded-2xl border p-2 text-xs shadow-xl transition-colors duration-300 items-center',
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          )}
        >
          <span className="flex items-center px-1 font-semibold whitespace-nowrap">{selectedObjects.length} đã chọn</span>
          <button
            onClick={() => props.onContextAction('duplicate', selectedObjects[0].id)}
            className={clsx(
              'rounded-xl px-3 py-1.5 font-bold transition whitespace-nowrap',
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-750'
            )}
          >
            Nhân đôi
          </button>

          {selectedObjects.length === 2 && (
            <>
              <button
                onClick={() => props.onContextAction('connect_nodes', '')}
                className="rounded-xl bg-blue-600 px-3 py-1.5 font-bold text-white hover:bg-blue-700 transition whitespace-nowrap"
              >
                Kết nối các nút
              </button>
              <button
                onClick={() => props.onContextAction('find_path', '')}
                className="rounded-xl bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700 transition whitespace-nowrap"
              >
                Tìm đường đi an toàn
              </button>
            </>
          )}

          <button
            onClick={() => props.onContextAction('delete', selectedObjects[0].id)}
            className="rounded-xl bg-rose-600 px-3 py-1.5 font-bold text-white hover:bg-rose-700 active:scale-95 whitespace-nowrap"
          >
            Xóa
          </button>
        </div>
      )}

      {/* Context Menu for right-click in Edit Mode */}
      {contextMenu && (
        <div
          className={clsx(
            'fixed z-50 w-44 rounded-2xl border p-2 shadow-2xl transition-colors duration-300',
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          )}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {['rename', 'duplicate', 'delete', 'front', 'back', 'lock'].map((action) => (
            <button
              key={action}
              onClick={() => {
                props.onContextAction(action, contextMenu.objectId);
                setContextMenu(null);
              }}
              className={clsx(
                'block w-full rounded-xl px-3 py-2 text-left text-xs font-semibold transition',
                isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-55'
              )}
            >
              {action === 'front'
                ? 'Bring to front'
                : action === 'back'
                  ? 'Send to back'
                  : action.charAt(0).toUpperCase() + action.slice(1)}
            </button>
          ))}
        </div>
      )}
      {/* Inline Text Editor Overlay */}
      {editingLabelId && (
        <textarea
          value={editingTextVal}
          onChange={(e) => setEditingTextVal(e.target.value)}
          onBlur={() => {
            props.onUpdateObject(editingLabelId, { name: editingTextVal });
            setEditingLabelId(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              props.onUpdateObject(editingLabelId, { name: editingTextVal });
              setEditingLabelId(null);
            }
            if (e.key === 'Escape') {
              setEditingLabelId(null);
            }
          }}
          autoFocus
          style={{
            position: 'fixed',
            left: `${inputPos.x}px`,
            top: `${inputPos.y}px`,
            width: `${inputPos.width}px`,
            height: `${inputPos.height}px`,
            transform: `rotate(${inputPos.rotation}deg)`,
            transformOrigin: 'left top',
            fontSize: `${(props.objects.find(o => o.id === editingLabelId)?.fontSize || 20) * props.scale}px`,
            color: isDark ? '#f8fafc' : '#1e293b',
            background: isDark ? '#1e293b' : '#ffffff',
            border: '1.5px solid #3b82f6',
            borderRadius: '6px',
            padding: '2px',
            outline: 'none',
            resize: 'none',
            zIndex: 100,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 'bold',
          }}
        />
      )}
    </div>
  );
}
export default CanvasEditor;