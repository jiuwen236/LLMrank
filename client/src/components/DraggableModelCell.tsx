import { Button, Typography, Tooltip } from 'antd';
import {
  EyeInvisibleOutlined,
  InfoCircleOutlined,
  DragOutlined,
} from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useTableStore } from '../stores/useTableStore';
import { useTranslation } from '../hooks/useTranslation';
import { translateSpecificTerms } from '../utils/translateSpecificTerms';
import type { Model } from '../types';

const { Text } = Typography;

interface DraggableModelCellProps {
  model: Model;
  onToggleVisibility: (modelId: string) => void;
  onDoubleClick?: (model: Model) => void;
}

function ModelInfo({ model }: { model: Model }) {
  const { datasets, getDataPoint } = useTableStore();
  const { language } = useTranslation();

  // Get datasets that should show in model info (showInModel=true)
  const showInModelDatasets = datasets.filter(d => d.showInModel);

  // Collect model info data to display
  const modelInfoItems: Array<{ label: string; value: string }> = [];

  // Add data points from showInModel datasets
  showInModelDatasets.forEach(dataset => {
    const dataPoint = getDataPoint(model.id, dataset.id);
    if (
      dataPoint?.value &&
      dataPoint.value.trim() !== '' &&
      dataPoint.value !== model.name
    ) {
      modelInfoItems.push({
        label: translateSpecificTerms(
          dataset.fullName || dataset.name,
          language
        ),
        value: translateSpecificTerms(dataPoint.value, language),
      });
    }
  });

  if (modelInfoItems.length === 0) {
    return null;
  }

  const content = (
    <div style={{ maxWidth: 300 }}>
      {modelInfoItems.map((item, index) => (
        <div key={index}>
          <strong>{item.label}:</strong> {item.value}
        </div>
      ))}
    </div>
  );

  return (
    <Tooltip title={content} placement="right">
      <InfoCircleOutlined
        style={{ marginLeft: 3, color: '#1890ff', fontSize: 10 }}
      />
    </Tooltip>
  );
}

export default function DraggableModelCell({
  model,
  onToggleVisibility,
  onDoubleClick,
}: DraggableModelCellProps) {
  const { getDataPoint } = useTableStore();
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `model-${model.id}`,
  });

  // Helper function to check if model is reasoning/thinking mode based on id=57 dataset (即时)
  // Reasoning models are those with id=57 value of "否"
  const isReasoningModel = () => {
    const thinkingDataPoint = getDataPoint(model.id, '57');
    const isReasoning = thinkingDataPoint?.value === '否';
    return isReasoning;
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const cellStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '2px 4px',
    borderRadius: 3,
    backgroundColor: 'transparent',
    minHeight: 20,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div style={cellStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <DragOutlined
            {...attributes}
            {...listeners}
            style={{ cursor: 'grab', color: '#999', fontSize: 10 }}
          />
          <Text
            strong
            className={isReasoningModel() ? 'thinking-model' : ''}
            style={{
              fontSize: 11,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              cursor: onDoubleClick ? 'pointer' : 'default',
            }}
            onDoubleClick={() => onDoubleClick?.(model)}
            title={
              onDoubleClick ? t('tooltip.doubleClickEditModel') : undefined
            }
          >
            {model.name}
          </Text>
          <ModelInfo model={model} />
        </div>
        <Button
          type="text"
          size="small"
          icon={<EyeInvisibleOutlined />}
          onClick={() => onToggleVisibility(model.id)}
          style={{ fontSize: 8, padding: '0 4px', height: 16 }}
        />
      </div>
    </div>
  );
}
