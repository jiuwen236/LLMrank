import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from '../hooks/useTranslation';

interface DraggableColumnHeaderProps {
  id: string;
  children: ReactNode;
  isDraggable?: boolean;
  onDoubleClick?: () => void;
}

export default function DraggableColumnHeader({
  id,
  children,
  isDraggable = true,
  onDoubleClick,
}: DraggableColumnHeaderProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!isDraggable) {
    return (
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            justifyContent: 'center',
            padding: '0 1px',
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          justifyContent: 'center',
          padding: '0 1px',
          cursor: 'grab',
          userSelect: 'none',
        }}
        onDoubleClick={onDoubleClick}
        title={onDoubleClick ? t('tooltip.doubleClickEditColumn') : undefined}
      >
        {children}
      </div>
    </div>
  );
}
