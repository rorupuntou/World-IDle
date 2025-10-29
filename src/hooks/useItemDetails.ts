import { useState, useCallback } from 'react';
import { Requirement, Effect } from '@/components/types';

export type SelectedItem = {
    name: string;
    desc?: string;
    req?: Requirement;
    effect?: Effect[];
    id?: number;
    cost?: number;
} & { itemType?: "upgrade" | "achievement" | "autoclicker" };

export const useItemDetails = () => {
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);

  const showItemDetails = useCallback((item: SelectedItem) => {
    setSelectedItem(item);
  }, []);

  const closeItemDetails = useCallback(() => {
    setSelectedItem(null);
  }, []);

  return { selectedItem, showItemDetails, closeItemDetails };
};