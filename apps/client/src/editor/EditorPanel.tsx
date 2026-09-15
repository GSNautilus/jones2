/**
 * In-browser town editor side panel. Pure presentation + orchestration over
 * `model.ts`'s pure functions; the parent owns the `Town` state and forwards
 * scene pick/drag events to us through the imperative handle (see NOTES.md).
 */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { LOCATIONS } from '@jones2/sim';
import type { LocationId } from '@jones2/town';
import type { BuildingRecipe, Decor, NodeId, RoadKind, Town, TownEdge } from '@jones2/town';
import type { PickResult, TownScene } from '../map/api';
import {
  addDecor,
  addEdge,
  addNode,
  defaultRecipe,
  moveNode,
  removeDecor,
  removeEdge,
  removeNode,
  setBuilding,
  setStartNode,
  suggestMinutes,
  updateDecor,
  updateEdge,
  updateNode,
  validate,
} from './model';

export interface EditorHandle {
  onPick(hit: PickResult): void;
  onHover(hit: PickResult): void;
  onDragStart(hit: PickResult): void;
  onDrag(hit: PickResult): void;
  onDragEnd(): void;
}

export interface EditorPanelProps {
  scene: TownScene;
  town: Town;
  onChange: (town: Town) => void;
}

type Mode = 'select' | 'add-node' | 'add-edge' | 'add-decor';

const ROAD_KINDS: RoadKind[] = ['street', 'path', 'highway', 'busline'];
const DECOR_KINDS: Decor['kind'][] = ['tree', 'bush', 'lamp', 'bench', 'water', 'grass', 'plaza'];
const AREA_DECOR: Set<Decor['kind']> = new Set(['water', 'grass', 'plaza']);
const ROOFS: BuildingRecipe['roof'][] = ['flat', 'gable', 'hip', 'none'];
const PROPS: NonNullable<BuildingRecipe['prop']>[] = [
  'none',
  'burger',
  'tree',
  'chimney',
  'antenna',
  'fountain',
  'car',
  'book',
  'dumbbell',
  'cross',
  'dollar',
];
const FACINGS: BuildingRecipe['facing'][] = [0, 1, 2, 3];

const HISTORY_LIMIT = 50;

function snap(v: number): number {
  return Math.round(v * 2) / 2;
}

function edgeKey(e: Pick<TownEdge, 'a' | 'b'>): string {
  return [e.a, e.b].sort().join('|');
}

export const EditorPanel = forwardRef<EditorHandle, EditorPanelProps>(function EditorPanel(
  { scene, town, onChange },
  ref,
) {
  const initialTownRef = useRef<Town>(town);
  const townRef = useRef(town);
  townRef.current = town;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const pastRef = useRef<Town[]>([]);
  const futureRef = useRef<Town[]>([]);

  const [mode, setMode] = useState<Mode>('select');
  const [selectedNodeId, setSelectedNodeId] = useState<NodeId | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<{ a: NodeId; b: NodeId } | null>(null);
  const [pendingEdgeFrom, setPendingEdgeFrom] = useState<NodeId | null>(null);
  const [nextEdgeKind, setNextEdgeKind] = useState<RoadKind>('street');
  const [nextEdgeMinutes, setNextEdgeMinutes] = useState<string>('');
  const [decorKind, setDecorKind] = useState<Decor['kind']>('tree');
  const [asLocation, setAsLocation] = useState(false);
  const [newLocationId, setNewLocationId] = useState<LocationId>(Object.keys(LOCATIONS)[0]!);

  const draggingId = useRef<NodeId | null>(null);
  const dragPos = useRef<{ x: number; y: number } | null>(null);

  const problems = useMemo(() => validate(town), [town]);

  function commit(next: Town) {
    pastRef.current = [...pastRef.current, townRef.current].slice(-HISTORY_LIMIT);
    futureRef.current = [];
    onChangeRef.current(next);
  }

  function undo() {
    const past = pastRef.current;
    if (past.length === 0) return;
    const prev = past[past.length - 1]!;
    pastRef.current = past.slice(0, -1);
    futureRef.current = [...futureRef.current, townRef.current].slice(-HISTORY_LIMIT);
    onChangeRef.current(prev);
  }

  function redo() {
    const future = futureRef.current;
    if (future.length === 0) return;
    const next = future[future.length - 1]!;
    futureRef.current = future.slice(0, -1);
    pastRef.current = [...pastRef.current, townRef.current].slice(-HISTORY_LIMIT);
    onChangeRef.current(next);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    scene.setHighlight(selectedNodeId ? [selectedNodeId] : []);
  }, [scene, selectedNodeId, town]);

  useImperativeHandle(
    ref,
    () => ({
      onPick(hit: PickResult) {
        const current = townRef.current;
        if (mode === 'select') {
          setSelectedEdge(null);
          setSelectedNodeId(hit.node);
          return;
        }
        if (mode === 'add-node') {
          if (hit.node) return;
          if (asLocation) {
            const loc = LOCATIONS[newLocationId];
            const name = window.prompt('Location name?', loc?.name ?? newLocationId);
            if (name === null) return;
            const next = addNode(current, snap(hit.x), snap(hit.y), {
              name,
              location: newLocationId,
              building: defaultRecipe(name),
            });
            commit(next);
          } else {
            commit(addNode(current, snap(hit.x), snap(hit.y)));
          }
          return;
        }
        if (mode === 'add-edge') {
          if (!hit.node) return;
          if (!pendingEdgeFrom) {
            setPendingEdgeFrom(hit.node);
            return;
          }
          if (pendingEdgeFrom === hit.node) {
            setPendingEdgeFrom(null);
            return;
          }
          const a = current.nodes.find((n) => n.id === pendingEdgeFrom);
          const b = current.nodes.find((n) => n.id === hit.node);
          const minutes = nextEdgeMinutes.trim() !== '' ? Number(nextEdgeMinutes) : a && b ? suggestMinutes(a, b) : 1;
          try {
            commit(addEdge(current, pendingEdgeFrom, hit.node, nextEdgeKind, minutes));
          } catch (err) {
            window.alert(err instanceof Error ? err.message : String(err));
          }
          setPendingEdgeFrom(null);
          return;
        }
        if (mode === 'add-decor') {
          if (hit.node) return;
          const decor: Decor = { kind: decorKind, x: snap(hit.x), y: snap(hit.y) };
          if (AREA_DECOR.has(decorKind)) {
            decor.w = 5;
            decor.h = 5;
          }
          commit(addDecor(current, decor));
        }
      },
      onHover() {
        // Reserved for future hover affordances; selection highlight is
        // driven by selectedNodeId (see the effect above).
      },
      onDragStart(hit: PickResult) {
        if (mode !== 'select' || !hit.node) return;
        draggingId.current = hit.node;
        dragPos.current = { x: hit.x, y: hit.y };
        setSelectedEdge(null);
        setSelectedNodeId(hit.node);
      },
      onDrag(hit: PickResult) {
        if (!draggingId.current) return;
        const x = snap(hit.x);
        const y = snap(hit.y);
        dragPos.current = { x, y };
        scene.moveNode(draggingId.current, x, y);
      },
      onDragEnd() {
        const id = draggingId.current;
        const pos = dragPos.current;
        draggingId.current = null;
        dragPos.current = null;
        if (!id || !pos) return;
        commit(moveNode(townRef.current, id, pos.x, pos.y));
      },
    }),
    [mode, asLocation, newLocationId, pendingEdgeFrom, nextEdgeKind, nextEdgeMinutes, decorKind, scene],
  );

  const selectedNode = selectedNodeId ? town.nodes.find((n) => n.id === selectedNodeId) ?? null : null;
  const connectedEdges = selectedNodeId
    ? town.edges.filter((e) => e.a === selectedNodeId || e.b === selectedNodeId)
    : [];
  const edgeForInspector =
    selectedEdge && town.edges.find((e) => e.a === selectedEdge.a && e.b === selectedEdge.b);

  function handleExport() {
    const json = JSON.stringify(town, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'riverton.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    navigator.clipboard?.writeText(json).catch(() => {
      /* clipboard is best-effort */
    });
  }

  function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    file
      .text()
      .then((text) => {
        const parsed = JSON.parse(text) as Town;
        commit(parsed);
      })
      .catch((err) => window.alert(`Could not import: ${err instanceof Error ? err.message : String(err)}`));
  }

  function handleReset() {
    commit(initialTownRef.current);
  }

  function renderEdgeControls(e: TownEdge) {
    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <select
          value={e.kind}
          onChange={(ev) => commit(updateEdge(town, e.a, e.b, { kind: ev.target.value as RoadKind }))}
        >
          {ROAD_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={e.minutes}
          style={{ width: 64 }}
          onChange={(ev) => commit(updateEdge(town, e.a, e.b, { minutes: Number(ev.target.value) }))}
        />
        <button
          onClick={() => {
            if (selectedEdge && edgeKey(selectedEdge) === edgeKey(e)) setSelectedEdge(null);
            commit(removeEdge(town, e.a, e.b));
          }}
        >
          Delete
        </button>
      </div>
    );
  }

  return (
    <div className="panel">
      <h3>Tool</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {(['select', 'add-node', 'add-edge', 'add-decor'] as Mode[]).map((m) => (
          <button
            key={m}
            disabled={mode === m}
            onClick={() => {
              setMode(m);
              setPendingEdgeFrom(null);
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === 'add-node' && (
        <div style={{ marginTop: 8 }}>
          <label>
            <input type="checkbox" checked={asLocation} onChange={(e) => setAsLocation(e.target.checked)} />{' '}
            as location
          </label>
          {asLocation && (
            <select value={newLocationId} onChange={(e) => setNewLocationId(e.target.value)}>
              {Object.keys(LOCATIONS).map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {mode === 'add-edge' && (
        <div style={{ marginTop: 8 }}>
          <div className="muted">{pendingEdgeFrom ? `From ${pendingEdgeFrom}: pick the other node.` : 'Pick the first node.'}</div>
          <select value={nextEdgeKind} onChange={(e) => setNextEdgeKind(e.target.value as RoadKind)}>
            {ROAD_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <input
            placeholder="minutes (auto)"
            value={nextEdgeMinutes}
            onChange={(e) => setNextEdgeMinutes(e.target.value)}
          />
        </div>
      )}

      {mode === 'add-decor' && (
        <div style={{ marginTop: 8 }}>
          <select value={decorKind} onChange={(e) => setDecorKind(e.target.value as Decor['kind'])}>
            {DECOR_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      )}

      <h3>Validation</h3>
      {problems.length === 0 ? (
        <div className="muted">No problems.</div>
      ) : (
        <ul className="log">
          {problems.map((p, i) => (
            <li key={i} className="warn">
              {p}
            </li>
          ))}
        </ul>
      )}

      <h3>File</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button onClick={handleExport}>Export</button>
        <label style={{ display: 'block' }}>
          Import
          <input type="file" accept="application/json" onChange={handleImport} style={{ display: 'none' }} />
        </label>
        <button onClick={handleReset}>Reset to saved</button>
      </div>

      {selectedNode && (
        <>
          <h3>Node</h3>
          <div className="stat">
            <span>id</span>
            <span>{selectedNode.id}</span>
          </div>
          <label>
            name
            <input
              value={selectedNode.name ?? ''}
              onChange={(e) => commit(updateNode(town, selectedNode.id, { name: e.target.value || undefined }))}
            />
          </label>
          <label>
            x
            <input
              type="number"
              value={selectedNode.x}
              onChange={(e) => commit(moveNode(town, selectedNode.id, Number(e.target.value), selectedNode.y))}
            />
          </label>
          <label>
            y
            <input
              type="number"
              value={selectedNode.y}
              onChange={(e) => commit(moveNode(town, selectedNode.id, selectedNode.x, Number(e.target.value)))}
            />
          </label>
          <label>
            location
            <select
              value={selectedNode.location ?? ''}
              onChange={(e) =>
                commit(updateNode(town, selectedNode.id, { location: e.target.value || undefined }))
              }
            >
              <option value="">none</option>
              {Object.keys(LOCATIONS).map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={town.startNode === selectedNode.id}
              onChange={() => commit(setStartNode(town, selectedNode.id))}
            />{' '}
            start node
          </label>

          <h3>Building</h3>
          {!selectedNode.building ? (
            <button onClick={() => commit(setBuilding(town, selectedNode.id, defaultRecipe(selectedNode.name ?? selectedNode.id)))}>
              Add building
            </button>
          ) : (
            <BuildingEditor
              recipe={selectedNode.building}
              onChange={(recipe) => commit(setBuilding(town, selectedNode.id, recipe))}
              onRemove={() => commit(setBuilding(town, selectedNode.id, undefined))}
            />
          )}

          <button className="warn" onClick={() => {
            setSelectedNodeId(null);
            commit(removeNode(town, selectedNode.id));
          }}>
            Delete node
          </button>

          <h3>Edges</h3>
          {connectedEdges.length === 0 ? (
            <div className="muted">No edges.</div>
          ) : (
            connectedEdges.map((e) => (
              <div
                key={edgeKey(e)}
                style={{ padding: '4px 0', borderBottom: '1px dotted var(--line)', cursor: 'pointer' }}
                onClick={() => setSelectedEdge({ a: e.a, b: e.b })}
              >
                <div className="muted">
                  {e.a} &harr; {e.b}
                </div>
                {renderEdgeControls(e)}
              </div>
            ))
          )}
        </>
      )}

      {edgeForInspector && (
        <>
          <h3>Edge</h3>
          <div className="muted">
            {edgeForInspector.a} &harr; {edgeForInspector.b}
          </div>
          {renderEdgeControls(edgeForInspector)}
        </>
      )}
    </div>
  );
});

function BuildingEditor({
  recipe,
  onChange,
  onRemove,
}: {
  recipe: BuildingRecipe;
  onChange: (recipe: BuildingRecipe) => void;
  onRemove: () => void;
}) {
  function set<K extends keyof BuildingRecipe>(key: K, value: BuildingRecipe[K]) {
    onChange({ ...recipe, [key]: value });
  }
  return (
    <div>
      <label>
        width
        <input type="number" value={recipe.width} onChange={(e) => set('width', Number(e.target.value))} />
      </label>
      <label>
        depth
        <input type="number" value={recipe.depth} onChange={(e) => set('depth', Number(e.target.value))} />
      </label>
      <label>
        height
        <input type="number" value={recipe.height} onChange={(e) => set('height', Number(e.target.value))} />
      </label>
      <label>
        color
        <input type="color" value={recipe.color} onChange={(e) => set('color', e.target.value)} />
      </label>
      <label>
        roof
        <select value={recipe.roof} onChange={(e) => set('roof', e.target.value as BuildingRecipe['roof'])}>
          {ROOFS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label>
        roof color
        <input
          type="color"
          value={recipe.roofColor ?? '#888888'}
          onChange={(e) => set('roofColor', e.target.value)}
        />
      </label>
      <label>
        sign
        <input value={recipe.sign ?? ''} onChange={(e) => set('sign', e.target.value || undefined)} />
      </label>
      <label>
        prop
        <select value={recipe.prop ?? 'none'} onChange={(e) => set('prop', e.target.value as BuildingRecipe['prop'])}>
          {PROPS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <label>
        facing
        <select
          value={recipe.facing}
          onChange={(e) => set('facing', Number(e.target.value) as BuildingRecipe['facing'])}
        >
          {FACINGS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <button className="warn" onClick={onRemove}>
        Remove building
      </button>
    </div>
  );
}
