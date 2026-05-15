import { useEffect, useMemo, useRef, useState } from 'react';
import Konva from 'konva';
import { Circle, Group, Layer, Line, Rect, Stage, Text, Transformer } from 'react-konva';
import { FloorPlanObject } from '../../types/editor';
import { getDefaultSize, isResizable } from '../../utils/geometryHelpers';
import { getGuideLines, snapPosition } from '../../utils/snapHelpers';

interface Props {
  objects: FloorPlanObject[];
  selectedIds: string[];
  activeTool: string;
  scale: number;
  position: { x: number; y: number };
  panMode: boolean;
  snapEnabled: boolean;
  onStageChange: (patch: { scale?: number; position?: { x: number; y: number } }) => void;
  onAddObject: (type: FloorPlanObject['type'], x: number, y: number) => void;
  onSelect: (id: string, append: boolean) => void;
  onClearSelection: () => void;
  onUpdateObject: (id: string, patch: Partial<FloorPlanObject>) => void;
  onSelectionBox: (ids: string[]) => void;
  onContextAction: (action: string, objectId: string) => void;
  onViewportChange?: (viewport: { width: number; height: number }) => void;
}

const CANVAS_WIDTH = 4000;
const CANVAS_HEIGHT = 2600;
const GRID_SIZE = 24;

function objectFill(object: FloorPlanObject) {
  if (object.type === 'room') return object.color || '#ead9cf';
  if (object.type === 'led') return object.nodeStatus === 'danger' ? '#d8453b' : '#2ea85f';
  if (object.type === 'exit') return 'transparent';
  if (object.type === 'door') return '#d9a36b';
  if (object.type === 'stairs') return '#c7856c';
  if (object.type === 'mq2') return '#ef8e78';
  if (object.type === 'temp') return '#f3b2a6';
  return object.color || '#fff8f3';
}

export function CanvasEditor(props: Props) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; objectId: string } | null>(null);
  const [guides, setGuides] = useState<Array<{ orientation: 'vertical' | 'horizontal'; value: number }>>([]);
  const [viewport, setViewport] = useState({ width: 1200, height: 760 });

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [panOrigin, setPanOrigin] = useState<{ x: number; y: number } | null>(null);

  const selectedObjects = useMemo(
    () => props.objects.filter((object) => props.selectedIds.includes(object.id)),
    [props.objects, props.selectedIds],
  );

  const resizeEnabled = selectedObjects.length === 1 && isResizable(selectedObjects[0].type);

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
  }, [props]);

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
      target === target.getStage()
      || target.hasName('workspace-empty')
      || target.hasName('workspace-grid')
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

    if (!emptyArea) return;

    // Nếu đang chọn token thì click bao nhiêu lần cũng tiếp tục thêm
    if (props.activeTool !== 'select' && props.activeTool !== 'pan') {
      const pointer = stagePointerToWorld();
      if (pointer) {
        props.onAddObject(props.activeTool as FloorPlanObject['type'], pointer.x, pointer.y);
      }
      return;
    }

    // select hoặc pan mode: giữ chuột trái để kéo canvas
    if (event.evt.button === 0) {
      startPan(event.evt.clientX, event.evt.clientY);
      props.onClearSelection();
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

  function renderObject(object: FloorPlanObject) {
    if (object.visible === false) return null;

    const selected = props.selectedIds.includes(object.id);
    const width = object.width || getDefaultSize(object.type).width;
    const height = object.height || getDefaultSize(object.type).height;

    const commonProps = {
      id: object.id,
      key: object.id,
      x: object.x,
      y: object.y,
      draggable: !object.locked && !isPanning,
      rotation: object.rotation || 0,
      dragBoundFunc: (pos) => pos,

      onClick: (event: Konva.KonvaEventObject<MouseEvent>) => {
        event.cancelBubble = true;
        props.onSelect(object.id, event.evt.shiftKey);
      },
      onTap: (event: Konva.KonvaEventObject<Event>) => {
        event.cancelBubble = true;
        props.onSelect(object.id, false);
      },
      onDblClick: () => {
        const nextName = window.prompt('Rename object', object.name || '');
        if (nextName !== null) props.onUpdateObject(object.id, { name: nextName });
      },
      onContextMenu: (event: Konva.KonvaEventObject<PointerEvent>) => {
        event.evt.preventDefault();
        event.cancelBubble = true;
        setContextMenu({
          x: event.evt.clientX,
          y: event.evt.clientY,
          objectId: object.id,
        });
      },
      onDragMove: (event: Konva.KonvaEventObject<DragEvent>) => {
        const next = { x: event.target.x(), y: event.target.y() };
        props.onUpdateObject(object.id, next);
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
      return (
        <Group {...commonProps}>
          <Rect
            width={width}
            height={height}
            fill={objectFill(object)}
            stroke={selected ? '#b42318' : '#d2b7aa'}
            cornerRadius={18}
            strokeWidth={selected ? 2.4 : 1.4}
            shadowColor="rgba(147, 61, 41, 0.16)"
            shadowBlur={10}
            shadowOffset={{ x: 0, y: 3 }}
          />
          <Text
            text={object.name || 'Room'}
            x={12}
            y={10}
            fontSize={16}
            fontStyle="bold"
            fill={object.textColor || '#8f241e'}
          />
        </Group>
      );
    }

    if (object.type === 'door') {
      return (
        <Group {...commonProps}>
          <Rect width={width} height={height} fill={objectFill(object)} cornerRadius={8} />
          <Text text={object.name || 'Door'} x={-8} y={height + 6} fontSize={12} fill="#9f3a2a" />
        </Group>
      );
    }

    if (object.type === 'exit') {
      return (
        <Group {...commonProps}>
          <Text text={object.name || 'EXIT'} fontStyle="bold" fontSize={22} fill={object.color || '#2ea85f'} />
        </Group>
      );
    }

    if (object.type === 'stairs') {
      return (
        <Group {...commonProps}>
          <Rect width={width} height={height} stroke="#c77864" dash={[6, 4]} cornerRadius={10} />
          <Text text={object.name || 'Stairs'} x={10} y={18} fontSize={14} fill="#8f241e" />
        </Group>
      );
    }

    if (object.type === 'mq2' || object.type === 'temp') {
      const label = object.type === 'mq2' ? 'MQ2' : 'TEMP';
      return (
        <Group {...commonProps}>
          <Rect width={width} height={height} fill={objectFill(object)} cornerRadius={10} />
          <Text text={label} width={width} align="center" y={10} fontSize={12} fontStyle="bold" fill="#5b1816" />
          <Text text={object.name || label} y={height + 4} width={100} fontSize={12} fill="#8f241e" />
        </Group>
      );
    }

    if (object.type === 'led') {
      return (
        <Group {...commonProps}>
          <Circle
            radius={(width || 16) / 2}
            fill={objectFill(object)}
            stroke={selected ? '#8f241e' : '#f8ece5'}
            strokeWidth={selected ? 2.2 : 1.2}
          />
        </Group>
      );
    }

    return (
      <Group {...commonProps}>
        <Text
          text={object.name || 'Label'}
          fontSize={object.fontSize || 20}
          fill={object.color || '#8f241e'}
        />
      </Group>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="relative h-[82vh] overflow-hidden rounded-[28px] border border-[#e2c6bb] bg-[#f4e9e2]"
      style={{
        cursor: isPanning ? 'grabbing' : 'default',
      }}
      onMouseLeave={handleMouseUp}
    >
      <Stage
        ref={stageRef}
        width={viewport.width}
        height={viewport.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Layer>
          <Rect
            name="workspace-empty"
            x={props.position.x}
            y={props.position.y}
            width={CANVAS_WIDTH * props.scale}
            height={CANVAS_HEIGHT * props.scale}
            fill="#fff8f3"
            stroke="#ddc0b4"
            cornerRadius={28}
            shadowColor="rgba(126, 43, 31, 0.08)"
            shadowBlur={16}
            shadowOffset={{ x: 0, y: 4 }}
          />
        </Layer>

        <Layer>
          <Group
            x={props.position.x}
            y={props.position.y}
            scaleX={props.scale}
            scaleY={props.scale}
          >
            {Array.from({ length: Math.ceil(CANVAS_WIDTH / GRID_SIZE) + 1 }).map((_, index) => (
              <Line
                key={`v-${index}`}
                name="workspace-grid"
                points={[index * GRID_SIZE, 0, index * GRID_SIZE, CANVAS_HEIGHT]}
                stroke="rgba(157, 90, 70, 0.10)"
                strokeWidth={1}
              />
            ))}

            {Array.from({ length: Math.ceil(CANVAS_HEIGHT / GRID_SIZE) + 1 }).map((_, index) => (
              <Line
                key={`h-${index}`}
                name="workspace-grid"
                points={[0, index * GRID_SIZE, CANVAS_WIDTH, index * GRID_SIZE]}
                stroke="rgba(157, 90, 70, 0.10)"
                strokeWidth={1}
              />
            ))}

            {props.objects.map(renderObject)}

            {guides.map((guide, index) => (
              guide.orientation === 'vertical' ? (
                <Line
                  key={`guide-${index}`}
                  points={[guide.value, 0, guide.value, CANVAS_HEIGHT]}
                  stroke="#c2410c"
                  dash={[4, 6]}
                />
              ) : (
                <Line
                  key={`guide-${index}`}
                  points={[0, guide.value, CANVAS_WIDTH, guide.value]}
                  stroke="#c2410c"
                  dash={[4, 6]}
                />
              )
            ))}

            <Transformer
              ref={transformerRef}
              rotateEnabled={resizeEnabled}
              resizeEnabled={resizeEnabled}
              borderStroke="#b42318"
              anchorStroke="#b42318"
              anchorFill="#fff8f3"
              enabledAnchors={resizeEnabled ? ['top-left', 'top-right', 'bottom-left', 'bottom-right'] : []}
              boundBoxFunc={(oldBox, newBox) => (newBox.width < 14 || newBox.height < 14 ? oldBox : newBox)}
            />
          </Group>
        </Layer>
      </Stage>

      <div className="absolute bottom-4 left-4 z-20 rounded-2xl border border-[#e0b8a6] bg-[#fff7f2]/95 px-3 py-2 text-xs text-[#7c2d23] shadow-xl">
        Giữ chuột trái ở vùng trống để kéo canvas
      </div>

      {selectedObjects.length > 0 && (
        <div className="absolute right-4 top-4 z-20 flex gap-2 rounded-2xl border border-[#e0b8a6] bg-[#fff7f2]/95 p-2 text-xs text-[#7c2d23] shadow-xl">
          <span>{selectedObjects.length} selected</span>
          <button
            onClick={() => props.onContextAction('duplicate', selectedObjects[0].id)}
            className="rounded-lg bg-[#f1ded5] px-2 py-1 hover:bg-[#ead0c3]"
          >
            Duplicate
          </button>
          <button
            onClick={() => props.onContextAction('delete', selectedObjects[0].id)}
            className="rounded-lg bg-[#d8453b] px-2 py-1 text-white hover:bg-[#bb352d]"
          >
            Delete
          </button>
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed z-50 w-44 rounded-2xl border border-[#e0b8a6] bg-[#fff8f3] p-2 shadow-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {['rename', 'duplicate', 'delete', 'front', 'back', 'lock'].map((action) => (
            <button
              key={action}
              onClick={() => {
                props.onContextAction(action, contextMenu.objectId);
                setContextMenu(null);
              }}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[#7c2d23] hover:bg-[#f7e8df]"
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
    </div>
  );
}