/**
 * Mode switch. Filled in during milestone 2 integration:
 *   (default)  play   — hot-seat harness with the 3D map (src/game/)
 *   ?replay    replay — demo replay of a generated week (src/replay/)
 *   ?editor    editor — town editor (src/editor/)
 */
export function App() {
  const mode = new URLSearchParams(location.search).has('editor') ? 'editor' : new URLSearchParams(location.search).has('replay') ? 'replay' : 'play';
  return (
    <div className="center">
      <h1>Jones 2</h1>
      <p className="muted">Client skeleton. Mode: {mode}. Renderer, replay, and editor are being built.</p>
    </div>
  );
}
