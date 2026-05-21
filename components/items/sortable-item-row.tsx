'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { Item } from '@/db/schema';
import { ItemRow } from './item-row';

interface SortableItemRowProps {
  item: Item;
  onUpdated: (item: Item) => void;
  onDeleted: (id: string) => void;
  selectMode?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  shoppingMode?: boolean;
}

export function SortableItemRow(props: SortableItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 10 : undefined,
  };

  const showHandle = !props.selectMode && !props.shoppingMode;

  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch">
      {showHandle && (
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="flex w-6 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
          style={{ color: 'var(--text-hint)' }}
        >
          <GripVertical size={14} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <ItemRow {...props} />
      </div>
    </div>
  );
}
