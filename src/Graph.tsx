import { useEffect, useId, useRef, useState } from 'react';
import JXG from 'jsxgraph';

// JSXGraph generates internal coordinate helpers through JessieCode. Use its
// interpreter so exported lessons work with CSP that prohibits eval.
JXG.Options.jc.compile = false;

export default function Graph({ m, b }: { m: number; b: number }) {
  const id = `graph-${useId().replace(/:/g, '')}`;
  const container = useRef<HTMLDivElement>(null);
  const values = useRef({ m, b });
  const board = useRef<ReturnType<typeof JXG.JSXGraph.initBoard> | null>(null);
  const [failed, setFailed] = useState(false);
  values.current = { m, b };

  useEffect(() => {
    if (!container.current) return;
    try {
      const active = JXG.JSXGraph.initBoard(id, {
        boundingbox: [-4, 12, 4, -12], axis: true, grid: false,
        showCopyright: false, showNavigation: false, keepaspectratio: false,
        pan: { enabled: false }, zoom: { wheel: false, min: 1, max: 1, pinchHorizontal: false, pinchVertical: false },
        resize: { enabled: false, throttle: 10 },
        // Supported in 1.14.0 options.js, omitted from its declaration file.
        ...{ keyboard: { enabled: false } },
        defaultAxes: {
          x: { name: 'x', withLabel: true, label: { position: 'rt', offset: [-16, 12] },
            strokeColor: '#8294AC', strokeWidth: 1,
            ticks: { ticksDistance: 1, minorTicks: 0, drawLabels: true, label: { fontSize: 12, strokeColor: '#51637B' } } },
          y: { name: 'y', withLabel: true, label: { position: 'rt', offset: [12, -12] },
            strokeColor: '#8294AC', strokeWidth: 1,
            ticks: { ticksDistance: 2, minorTicks: 0, drawLabels: true, label: { fontSize: 12, strokeColor: '#51637B' } } },
        },
      });
      board.current = active;
      active.create('grid', [], { majorStep: [1, 2], minorElements: 0, strokeColor: '#DCE5F2', strokeOpacity: 0.7 });
      const pointStyle = { name: '', fixed: true, highlight: false, size: 4, strokeColor: '#fff', strokeWidth: 2, withLabel: false };
      const start = active.create('point', [0, () => values.current.b], { ...pointStyle, fillColor: '#A84616' });
      const corner = active.create('point', [1, () => values.current.b], { ...pointStyle, visible: false });
      const end = active.create('point', [1, () => values.current.m + values.current.b], { ...pointStyle, fillColor: '#087E8B' });
      // This lesson supports straight lines only. Existing dynamic points define
      // the exact line without repeatedly sampling an adaptive function curve.
      active.create('line', [start, end], {
        strokeColor: '#087E8B', strokeWidth: 3,
        straightFirst: true, straightLast: true, highlight: false, fixed: true,
      });
      const segmentStyle = { strokeColor: '#087E8B', strokeWidth: 2, dash: 2, highlight: false, fixed: true };
      active.create('segment', [start, corner], segmentStyle);
      active.create('segment', [corner, end], segmentStyle);
      container.current.tabIndex = -1;
      container.current.style.touchAction = 'pan-y';
      container.current.querySelectorAll('[tabindex]').forEach(element => element.setAttribute('tabindex', '-1'));
      const frame = container.current.parentElement!;
      const resize = new ResizeObserver(() => {
        const width = frame.clientWidth;
        const height = frame.clientHeight;
        if (width > 0 && height > 0 && (width !== active.canvasWidth || height !== active.canvasHeight)) active.resizeContainer(width, height);
      });
      resize.observe(frame);
      return () => { resize.disconnect(); JXG.JSXGraph.freeBoard(active); board.current = null; };
    } catch {
      if (board.current) { JXG.JSXGraph.freeBoard(board.current); board.current = null; }
      setFailed(true);
    }
  }, [id]);

  useEffect(() => { board.current?.update(); }, [m, b]);

  if (failed) return <div className="graph-unavailable" role="status">The graph could not load. You can still explore the equation and value table.</div>;
  return <div id={id} ref={container} className="graph-board" aria-hidden="true" />;
}
