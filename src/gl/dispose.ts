type Disposable = { dispose: () => void };

/** Collects GPU resources as they are made (`keep` passes each one through), so one `dispose` frees them all. */
export function disposables() {
  const list: Disposable[] = [];
  return {
    keep: <T extends Disposable>(x: T) => { list.push(x); return x; },
    dispose: () => list.forEach(d => d.dispose()),
  };
}
