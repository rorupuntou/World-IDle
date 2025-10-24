import { useState, useCallback } from 'react';

export const useFloatingNumbers = () => {
  const [floatingNumbers, setFloatingNumbers] = useState<
    { id: number; value: string; x: number; y: number }[]
  >([]);

  const addFloatingNumber = useCallback((value: string, x: number, y: number) => {
    const id = Date.now();
    setFloatingNumbers((current) => [
      ...current,
      { id, value, x, y },
    ]);
    setTimeout(() => {
      setFloatingNumbers((current) => current.filter((n) => n.id !== id));
    }, 2000);
  }, []);

  return { floatingNumbers, addFloatingNumber };
};