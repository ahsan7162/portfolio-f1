import { useCallback, useEffect, useState } from 'react';
import type { DialogProps } from '@/components/dialogs/DialogFrame';
import { Loader } from './Loader';

// All projects loads its own code the first time it opens. Until it arrives the AH04 loader
// covers the screen; once it is ready, at the next moment the mark is whole, the loader drains
// away and the screen is under it. Later opens find the code loaded and skip the loader.

type Screen = typeof import('./Showcase').default;

const load = () => import('./Showcase');
let loaded: Screen | undefined;

export function ArchiveGate(props: DialogProps) {
  const [Screen, setScreen] = useState<Screen | undefined>(() => loaded);
  // covered: the loader ran, so the screen opens without its own wipe.
  const [covered] = useState(!loaded);
  const [show, setShow] = useState(!!loaded);
  const [loader, setLoader] = useState(!loaded);
  const { onClose } = props;

  useEffect(() => {
    if (loaded) return;
    let alive = true;
    load().then(m => { loaded = m.default; if (alive) setScreen(() => m.default); }, () => { if (alive) onClose(); });
    return () => { alive = false; };
  }, [onClose]);

  const onExit = useCallback(() => setShow(true), []);
  const onGone = useCallback(() => setLoader(false), []);

  return (
    <>
      {show && Screen && <Screen {...props} wipe={!covered} />}
      {loader && <Loader origin={props.origin} ready={!!Screen} onExit={onExit} onGone={onGone} />}
    </>
  );
}
