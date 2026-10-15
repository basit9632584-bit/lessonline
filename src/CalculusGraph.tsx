import { useEffect, useId, useRef, useState } from 'react';
import JXG from 'jsxgraph';
import { quadraticAt, tangentAt } from './calculus';
import type { CalculusParameters } from './calculus';

JXG.Options.jc.compile = false;
function verticalBounds(p: CalculusParameters): [number, number] {
  const values = [0, quadraticAt(p, -4), quadraticAt(p, 4)];
  if (p.a !== 0) { const vertex = -p.b / (2 * p.a); if (vertex >= -4 && vertex <= 4) values.push(quadraticAt(p, vertex)); }
  // Curve bounds also cover nearby tangent values with the a-sized margin.
  const low = Math.min(...values), high = Math.max(...values);
  const margin = Math.max(2, (high - low) * 0.1, Math.abs(p.a));
  return [low - margin, high + margin];
}
export default function CalculusGraph({ parameters }: { parameters: CalculusParameters }) {
  const id = `calculus-graph-${useId().replace(/:/g, '')}`;
  const container = useRef<HTMLDivElement>(null);
  const values = useRef(parameters); values.current = parameters;
  const board = useRef<ReturnType<typeof JXG.JSXGraph.initBoard> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!container.current) return;
    try {
      const [low, high] = verticalBounds(values.current);
      const active = JXG.JSXGraph.initBoard(id, {
        boundingbox: [-4, high, 4, low], axis: true, grid: false, showCopyright: false, showNavigation: false,
        keepaspectratio: false, pan: { enabled: false }, zoom: { wheel: false, min: 1, max: 1, pinchHorizontal: false, pinchVertical: false },
        resize: { enabled: false, throttle: 10 }, ...{ keyboard: { enabled: false } },
        defaultAxes: {
          x: { name: 'x', withLabel: true, label: { position: 'rt', offset: [-16, 12] }, strokeColor: '#8294AC', strokeWidth: 1, ticks: { ticksDistance: 1, minorTicks: 0, drawLabels: true, label: { fontSize: 12, strokeColor: '#51637B' } } },
          y: { name: 'y', withLabel: true, label: { position: 'rt', offset: [12, -12] }, strokeColor: '#8294AC', strokeWidth: 1, ticks: { minorTicks: 0, drawLabels: true, label: { fontSize: 12, strokeColor: '#51637B' } } },
        },
      });
      board.current = active;
      active.create('functiongraph', [(x: number) => quadraticAt(values.current, x), -4, 4], { strokeColor: '#08717D', strokeWidth: 3, numberPointsLow: 32, numberPointsHigh: 96, fixed: true, highlight: false });
      const style = { name: '', fixed: true, highlight: false, size: 4, strokeColor: '#fff', strokeWidth: 2, withLabel: false };
      const point = active.create('point', [() => values.current.x0, () => quadraticAt(values.current, values.current.x0)], { ...style, fillColor: '#2457D6' });
      const helper = active.create('point', [() => values.current.x0 + 1, () => tangentAt(values.current, values.current.x0 + 1)], { ...style, visible: false });
      active.create('line', [point, helper], { strokeColor: '#A84616', strokeWidth: 2, dash: 2, fixed: true, highlight: false, straightFirst: true, straightLast: true });
      container.current.tabIndex = -1; container.current.style.touchAction = 'pan-y';
      container.current.querySelectorAll('[tabindex]').forEach(element => element.setAttribute('tabindex', '-1'));
      const frame = container.current.parentElement!;
      const resize = new ResizeObserver(() => { const width = frame.clientWidth, height = frame.clientHeight; if (width > 0 && height > 0 && (width !== active.canvasWidth || height !== active.canvasHeight)) active.resizeContainer(width, height); });
      resize.observe(frame);
      return () => { resize.disconnect(); JXG.JSXGraph.freeBoard(active); board.current = null; };
    } catch {
      if (board.current) { JXG.JSXGraph.freeBoard(board.current); board.current = null; }
      setFailed(true);
    }
  }, [id]);
  useEffect(() => { const [low, high] = verticalBounds(parameters); board.current?.setBoundingBox([-4, high, 4, low], false); }, [parameters.a, parameters.b, parameters.c]);
  useEffect(() => { board.current?.update(); }, [parameters.a, parameters.b, parameters.c, parameters.x0]);
  if (failed) return <div className="graph-unavailable" role="status">The curve could not load. The function, slope, and value table remain available.</div>;
  return <div id={id} ref={container} className="graph-board" aria-hidden="true" />;
}
