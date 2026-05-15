import { useState } from 'react';

export function useSelection() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectOne = (id: string) => setSelectedIds([id]);
  const toggleSelection = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };
  const clearSelection = () => setSelectedIds([]);

  return { selectedIds, setSelectedIds, selectOne, toggleSelection, clearSelection };
}
