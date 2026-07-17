import { useCallback, useState } from 'react';

const MAX_HISTORY_ENTRIES = 100;

export function useHistory<T>(initial: T) {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initial);
  const [future, setFuture] = useState<T[]>([]);

  const set = useCallback((next: T) => {
    setPast((current) => [...current, present].slice(-MAX_HISTORY_ENTRIES));
    setPresent(next);
    setFuture([]);
  }, [present]);

  const undo = useCallback(() => {
    setPast((currentPast) => {
      if (!currentPast.length) return currentPast;
      const previous = currentPast[currentPast.length - 1];
      setFuture((currentFuture) => [present, ...currentFuture]);
      setPresent(previous);
      return currentPast.slice(0, -1);
    });
  }, [present]);

  const redo = useCallback(() => {
    setFuture((currentFuture) => {
      if (!currentFuture.length) return currentFuture;
      const next = currentFuture[0];
      setPast((currentPast) => [...currentPast, present].slice(-MAX_HISTORY_ENTRIES));
      setPresent(next);
      return currentFuture.slice(1);
    });
  }, [present]);

  return {
    state: present,
    set,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    reset: (value: T) => {
      setPast([]);
      setFuture([]);
      setPresent(value);
    },
  };
}
