import React, { useState, useMemo } from 'react';
import { Table, Tooltip, Modal, Input, Space, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTableStore } from '../stores/useTableStore';
import { useTranslation } from '../hooks/useTranslation';
import {
  processMultiValue,
  hasEstimatedValues,
  generateValueTooltip,
} from '../utils/dataUtils';
import { translateSpecificTerms } from '../utils/translateSpecificTerms';
import DraggableModelCell from './DraggableModelCell';
import DraggableColumnHeader from './DraggableColumnHeader';
import type { Model, Dataset, DataPoint } from '../types';

const { Text } = Typography;

// Cell component for data editing
interface DataCellProps {
  model: Model;
  dataset: Dataset;
  dataPoint?: DataPoint;
  onEdit: (
    modelId: string,
    datasetId: string,
    value: string,
    notes?: string
  ) => void;
}

function DataCell({ model, dataset, dataPoint, onEdit }: DataCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(dataPoint?.value || '');
  const [editNotes, setEditNotes] = useState(dataPoint?.notes || '');
  const { t, language } = useTranslation();

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditValue(dataPoint?.value || '');
    setEditNotes(dataPoint?.notes || '');
  };

  const handleSave = () => {
    onEdit(model.id, dataset.id, editValue, editNotes);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(dataPoint?.value || '');
    setEditNotes(dataPoint?.notes || '');
  };

  // Helper functions for model info columns
  const getModelInfoPlaceholder = () => {
    switch (dataset.name) {
      case 'input_price':
        return t('form.inputPrice');
      case 'output_price':
        return t('form.outputPrice');
      case 'context_length':
        return t('form.contextLength');
      case 'cutoff_date':
        return t('form.cutoffDate');
      default:
        return t('dialog.editCell.valuePlaceholder');
    }
  };

  const getModelInfoHelpText = () => {
    switch (dataset.name) {
      case 'input_price':
      case 'output_price':
        return t('form.inputPriceHelp');
      case 'context_length':
        return t('form.contextLengthHelp');
      case 'cutoff_date':
        return t('form.cutoffDateHelp');
      default:
        return t('dialog.editCell.valueHint');
    }
  };

  // Check if this is a model info type by checking common model info dataset names
  const isModelInfoType = [
    'input_price',
    'output_price',
    'context_length',
    'cutoff_date',
  ].includes(dataset.name);

  // Process and format display value with multi-value support
  const rawValue = dataPoint?.value || '';
  const displayValue = isModelInfoType
    ? rawValue || '-'
    : processMultiValue(rawValue);
  const hasNotes = dataPoint?.notes && dataPoint.notes.trim().length > 0;
  const isEstimated = hasEstimatedValues(rawValue);
  const hasMultipleValues = rawValue.includes('/');

  // Generate comprehensive tooltip
  const valueTooltip = generateValueTooltip(rawValue);
  const tooltip = valueTooltip || (hasNotes ? dataPoint?.notes : undefined);

  // Style based on value properties
  const cellStyle = {
    cursor: 'pointer',
    minHeight: 16,
    padding: '1px 2px',
    borderRadius: 2,
    fontSize: isModelInfoType ? 10 : 11,
    lineHeight: 1.2,
    textAlign: 'center' as const,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    backgroundColor: 'transparent',
    color: '#333',
    fontWeight: 400,
    fontStyle: 'normal',
  };

  return (
    <>
      <div onDoubleClick={handleDoubleClick} style={cellStyle} title={tooltip}>
        {displayValue || '-'}
        {(hasNotes || hasMultipleValues || isEstimated) && (
          <InfoCircleOutlined
            style={{
              fontSize: 8,
              color: isEstimated ? '#ffa500' : '#52c41a',
              marginLeft: 2,
              opacity: 0.7,
            }}
          />
        )}
      </div>

      <Modal
        title={
          isModelInfoType
            ? `${language === 'zh' ? '编辑' : 'Edit '}${translateSpecificTerms(dataset.fullName || dataset.name, language)}`
            : t('dialog.editCell.title')
        }
        open={isEditing}
        onOk={handleSave}
        onCancel={handleCancel}
        width={400}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>
              {isModelInfoType
                ? translateSpecificTerms(
                    dataset.fullName || dataset.name,
                    language
                  )
                : t('dialog.editCell.value')}
            </Text>
            <Input
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              placeholder={
                isModelInfoType
                  ? getModelInfoPlaceholder()
                  : t('dialog.editCell.valuePlaceholder')
              }
            />
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              {isModelInfoType
                ? getModelInfoHelpText()
                : t('dialog.editCell.valueHint')}
            </div>
          </div>
          <div>
            <Text strong>{t('dialog.editCell.notes')}</Text>
            <Input.TextArea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              placeholder={t('dialog.editCell.notesPlaceholder')}
              rows={3}
            />
          </div>
        </Space>
      </Modal>
    </>
  );
}

// Dataset info tooltip component
interface DatasetInfoProps {
  dataset: Dataset;
}

function DatasetInfo({ dataset }: DatasetInfoProps) {
  const { t, language } = useTranslation();

  // Only show the info icon if there's a full name or notes
  const hasFullName =
    dataset.fullName &&
    dataset.fullName.trim() !== '' &&
    dataset.fullName !== dataset.name;
  const hasNotes = dataset.notes && dataset.notes.trim() !== '';

  if (!hasFullName && !hasNotes) {
    return null;
  }

  const content = (
    <div style={{ maxWidth: 300 }}>
      {hasFullName && (
        <div>
          <strong>{t('table.fullName')}:</strong>{' '}
          {translateSpecificTerms(dataset.fullName || '', language)}
        </div>
      )}
      {hasNotes && (
        <div>
          <strong>{t('table.notes')}:</strong>{' '}
          {translateSpecificTerms(dataset.notes || '', language)}
        </div>
      )}
    </div>
  );

  return (
    <Tooltip title={content} placement="bottom">
      <InfoCircleOutlined
        style={{ marginLeft: 2, color: '#1890ff', fontSize: 10 }}
      />
    </Tooltip>
  );
}

// Edit Model Dialog Component
interface EditModelDialogProps {
  model: Model;
  open: boolean;
  onClose: () => void;
  onSave: (modelId: string, updates: Partial<Model>) => void;
}

function EditModelDialog({
  model,
  open,
  onClose,
  onSave,
}: EditModelDialogProps) {
  const { t, language } = useTranslation();
  const { datasets, getDataPoint, updateDataPoint } = useTableStore();

  const [name, setName] = useState(model.name);
  const [fullName, setFullName] = useState(model.fullName || '');
  const [apiName, setApiName] = useState(model.apiName || '');
  const [dataPointValues, setDataPointValues] = useState<{
    [datasetId: string]: { value: string; notes: string };
  }>({});

  // Get datasets that should show in model info (showInModel=true) - include hidden datasets too
  const showInModelDatasets = datasets.filter(d => d.showInModel);

  React.useEffect(() => {
    if (open) {
      setName(model.name);
      setFullName(model.fullName || '');
      setApiName(model.apiName || '');

      // Initialize data point values for showInModel datasets
      const initialDataPoints: {
        [datasetId: string]: { value: string; notes: string };
      } = {};
      showInModelDatasets.forEach(dataset => {
        const dataPoint = getDataPoint(model.id, dataset.id);
        initialDataPoints[dataset.id] = {
          value: dataPoint?.value || '',
          notes: dataPoint?.notes || '',
        };
      });
      setDataPointValues(initialDataPoints);
    }
  }, [open, model, getDataPoint]);

  const handleSave = () => {
    // Save model info
    onSave(model.id, {
      name: name.trim(),
      fullName: fullName.trim() || undefined,
      apiName: apiName.trim() || undefined,
    });

    // Save data points for showInModel datasets
    Object.entries(dataPointValues).forEach(([datasetId, { value, notes }]) => {
      updateDataPoint(model.id, datasetId, value, notes);
    });

    onClose();
  };

  const handleCancel = () => {
    setName(model.name);
    setFullName(model.fullName || '');
    setApiName(model.apiName || '');
    onClose();
  };

  const handleDataPointChange = (
    datasetId: string,
    field: 'value' | 'notes',
    newValue: string
  ) => {
    setDataPointValues(prev => ({
      ...prev,
      [datasetId]: {
        value: prev[datasetId]?.value || '',
        notes: prev[datasetId]?.notes || '',
        [field]: newValue,
      },
    }));
  };

  return (
    <Modal
      title={t('dialog.editModel.title')}
      open={open}
      onOk={handleSave}
      onCancel={handleCancel}
      width={500}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Text strong>{t('dialog.editModel.name')}</Text>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('dialog.editModel.namePlaceholder')}
          />
        </div>

        {/* Show model info data fields for datasets with showInModel=true */}
        {showInModelDatasets.length > 0 && (
          <>
            <div
              style={{
                borderTop: '1px solid #f0f0f0',
                margin: '16px 0',
                paddingTop: '16px',
              }}
            >
              <Text strong>{t('dialog.editModel.detailsSection')}</Text>
            </div>
            {showInModelDatasets.map(dataset => (
              <div key={dataset.id}>
                <Text strong>
                  {translateSpecificTerms(
                    dataset.fullName || dataset.name,
                    language
                  )}
                </Text>
                <Input
                  value={dataPointValues[dataset.id]?.value || ''}
                  onChange={e =>
                    handleDataPointChange(dataset.id, 'value', e.target.value)
                  }
                  placeholder={`${language === 'zh' ? '请输入' : 'Enter '}${translateSpecificTerms(dataset.fullName || dataset.name, language)}`}
                  style={{ marginBottom: 8 }}
                />
                <Input.TextArea
                  value={dataPointValues[dataset.id]?.notes || ''}
                  onChange={e =>
                    handleDataPointChange(dataset.id, 'notes', e.target.value)
                  }
                  placeholder={t('form.notesOptional')}
                  rows={1}
                />
              </div>
            ))}
          </>
        )}
      </Space>
    </Modal>
  );
}

// Edit Dataset Dialog Component
interface EditDatasetDialogProps {
  dataset: Dataset;
  open: boolean;
  onClose: () => void;
  onSave: (datasetId: string, updates: Partial<Dataset>) => void;
}

function EditDatasetDialog({
  dataset,
  open,
  onClose,
  onSave,
}: EditDatasetDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(dataset.name);
  const [fullName, setFullName] = useState(dataset.fullName || '');
  const [notes, setNotes] = useState(dataset.notes || '');
  const [showInModel, setShowInModel] = useState(dataset.showInModel || false);
  const [isHidden, setIsHidden] = useState(dataset.isHidden || false);

  React.useEffect(() => {
    if (open) {
      setName(dataset.name);
      setFullName(dataset.fullName || '');
      setNotes(dataset.notes || '');
      setShowInModel(dataset.showInModel || false);
      setIsHidden(dataset.isHidden || false);
    }
  }, [open, dataset]);

  const handleSave = () => {
    onSave(dataset.id, {
      name: name.trim(),
      fullName: fullName.trim() || undefined,
      notes: notes.trim() || undefined,
      showInModel,
      isHidden,
    });
    onClose();
  };

  const handleCancel = () => {
    setName(dataset.name);
    setFullName(dataset.fullName || '');
    setNotes(dataset.notes || '');
    setShowInModel(dataset.showInModel || false);
    setIsHidden(dataset.isHidden || false);
    onClose();
  };

  return (
    <Modal
      title={t('dialog.editDataset.title')}
      open={open}
      onOk={handleSave}
      onCancel={handleCancel}
      width={400}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Text strong>{t('dialog.editDataset.name')}</Text>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('dialog.editDataset.namePlaceholder')}
          />
        </div>
        <div>
          <Text strong>{t('dialog.editDataset.fullName')}</Text>
          <Input
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder={t('dialog.editDataset.fullNamePlaceholder')}
          />
        </div>
        <div>
          <Text strong>{t('dialog.editDataset.notes')}</Text>
          <Input.TextArea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={t('dialog.editDataset.notesPlaceholder')}
            rows={3}
          />
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={isHidden}
              onChange={e => setIsHidden(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            {t('dialog.editDataset.hideDataset')}
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={showInModel}
              onChange={e => setShowInModel(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            {t('dialog.editDataset.showBesideModel')}
          </label>
        </div>
      </Space>
    </Modal>
  );
}

export default function RankingTable() {
  const { t, language } = useTranslation();
  const {
    getVisibleModels,
    getVisibleDatasets,
    getModelInfoDatasets,
    getDataPoint,
    updateDataPoint,
    updateModel,
    updateDataset,
    reorderModels,
    reorderDatasets,
    toggleModelVisibility,
    isLoading,
    error,
    datasetOrder,
  } = useTableStore();

  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);

  const visibleModels = getVisibleModels();
  // Get all datasets in their original CSV order (by sortOrder)
  const allDatasets = [...getModelInfoDatasets(), ...getVisibleDatasets()].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  // Define column order state, initialize from store's datasetOrder
  const [columnOrder, setColumnOrder] = React.useState(() => {
    if (datasetOrder.length > 0) {
      // Filter out invalid dataset IDs and add any missing ones
      const allDatasetIds = allDatasets.map(d => d.id);
      const validStoredOrder = datasetOrder.filter(id =>
        allDatasetIds.includes(id)
      );
      const missingIds = allDatasetIds.filter(id => !datasetOrder.includes(id));
      return ['model', ...validStoredOrder, ...missingIds];
    }
    return ['model', ...allDatasets.map(d => d.id)];
  });

  // Update column order when datasets or store's datasetOrder changes
  React.useEffect(() => {
    const allDatasetIds = allDatasets.map(d => d.id);

    if (datasetOrder.length > 0) {
      // Use store's order but ensure all current datasets are included
      const validStoredOrder = datasetOrder.filter(id =>
        allDatasetIds.includes(id)
      );
      const missingIds = allDatasetIds.filter(id => !datasetOrder.includes(id));
      const newOrder = ['model', ...validStoredOrder, ...missingIds];
      setColumnOrder(newOrder);
    } else {
      // Fallback to sortOrder if no stored order
      const newOrder = ['model', ...allDatasetIds];
      setColumnOrder(newOrder);
    }
  }, [allDatasets.length, datasetOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    console.log('Drag end:', { active: active.id, over: over.id, columnOrder });

    // Check if it's a model drag (row)
    const modelIndex = visibleModels.findIndex(model => model.id === active.id);
    if (modelIndex >= 0) {
      const oldIndex = modelIndex;
      const newIndex = visibleModels.findIndex(model => model.id === over.id);
      if (newIndex >= 0) {
        const newOrder = arrayMove(visibleModels, oldIndex, newIndex).map(
          m => m.id
        );
        reorderModels(newOrder);
      }
      return;
    }

    // Check if it's a column drag
    const columnIndex = columnOrder.findIndex(id => id === active.id);
    if (columnIndex >= 0) {
      const targetIndex = columnOrder.findIndex(id => id === over.id);
      if (targetIndex >= 0) {
        console.log('Column drag:', {
          columnIndex,
          targetIndex,
          oldOrder: columnOrder,
        });
        const newOrder = arrayMove(columnOrder, columnIndex, targetIndex);
        console.log('New column order:', newOrder);
        setColumnOrder(newOrder);

        // Also update the store's dataset order
        const datasetOrder = newOrder.filter(id => id !== 'model');
        reorderDatasets(datasetOrder);
      }
      return;
    }
  };

  // Calculate optimal column widths based on content
  const getColumnWidth = (dataset: Dataset) => {
    // Model info columns should be narrower
    const isModelInfoType = [
      'input_price',
      'output_price',
      'context_length',
      'cutoff_date',
    ].includes(dataset.name);
    if (isModelInfoType) {
      return 60;
    }

    // Base width for dataset name
    let nameWidth = Math.min(Math.max(dataset.name.length * 6, 40), 80);

    // Check data lengths for this dataset based on processed display values
    let maxDataWidth = 0;
    visibleModels.forEach(model => {
      const dataPoint = getDataPoint(model.id, dataset.id);
      if (dataPoint?.value) {
        // Use the processed display value length instead of raw value length
        const displayValue = isModelInfoType
          ? dataPoint.value
          : processMultiValue(dataPoint.value);
        maxDataWidth = Math.max(maxDataWidth, displayValue.length * 6);
      }
    });

    return Math.max(nameWidth, Math.min(maxDataWidth + 20, 100));
  };

  // Define all column definitions
  const allColumnDefs: { [key: string]: any } = {
    model: {
      title: (
        <DraggableColumnHeader id="model" isDraggable={false}>
          <Text strong style={{ fontSize: 11 }}>
            {t('table.model')}
          </Text>
        </DraggableColumnHeader>
      ),
      dataIndex: 'name',
      key: 'model',
      width: 160,
      fixed: 'left' as const,
      render: (_: string, model: Model) => (
        <DraggableModelCell
          model={model}
          onToggleVisibility={toggleModelVisibility}
          onDoubleClick={setEditingModel}
        />
      ),
    },
  };

  // Create all dataset columns (both model info and regular datasets)
  const datasetColumns = allDatasets.reduce(
    (acc, dataset) => {
      const isModelInfoType = [
        'input_price',
        'output_price',
        'context_length',
        'cutoff_date',
      ].includes(dataset.name);

      acc[dataset.id] = {
        title: (
          <DraggableColumnHeader
            id={dataset.id}
            onDoubleClick={() => setEditingDataset(dataset)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Text
                strong
                style={{
                  fontSize: 9,
                  lineHeight: 1.1,
                  textAlign: 'center',
                  wordBreak: 'break-all' as const,
                  hyphens: 'auto' as const,
                }}
              >
                {isModelInfoType
                  ? translateSpecificTerms(
                      dataset.name.replace('_', ''),
                      language
                    )
                  : translateSpecificTerms(dataset.name, language)}
              </Text>
              <DatasetInfo dataset={dataset} />
            </div>
          </DraggableColumnHeader>
        ),
        dataIndex: dataset.id,
        key: dataset.id,
        width: getColumnWidth(dataset),
        render: (_: string, model: Model) => {
          const dataPoint = getDataPoint(model.id, dataset.id);
          return (
            <DataCell
              model={model}
              dataset={dataset}
              dataPoint={dataPoint}
              onEdit={updateDataPoint}
            />
          );
        },
      };
      return acc;
    },
    {} as { [key: string]: any }
  );

  // Combine all column definitions
  const allColumns = { ...allColumnDefs, ...datasetColumns };

  // Create columns array based on current order
  const columns = useMemo(() => {
    return columnOrder.filter(id => allColumns[id]).map(id => allColumns[id]);
  }, [
    columnOrder,
    visibleModels,
    allDatasets,
    getDataPoint,
    updateDataPoint,
    toggleModelVisibility,
    t,
    language,
  ]);

  if (error) {
    return (
      <div>
        {t('error.loadFailed')}: {error}
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={[...visibleModels.map(m => m.id), ...columnOrder]}
          strategy={verticalListSortingStrategy}
        >
          <div
            style={{
              backgroundColor: 'white',
              border: '1px solid #f0f0f0',
              borderRadius: 8,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <Table
              dataSource={visibleModels}
              columns={columns}
              rowKey="id"
              pagination={false}
              scroll={{
                x: 'max-content',
              }}
              size="small"
              loading={isLoading}
              style={{
                tableLayout: 'fixed',
              }}
              className="fixed-width-table"
            />
          </div>
        </SortableContext>
      </DndContext>

      {/* Edit Model Dialog */}
      {editingModel && (
        <EditModelDialog
          model={editingModel}
          open={!!editingModel}
          onClose={() => setEditingModel(null)}
          onSave={updateModel}
        />
      )}

      {/* Edit Dataset Dialog */}
      {editingDataset && (
        <EditDatasetDialog
          dataset={editingDataset}
          open={!!editingDataset}
          onClose={() => setEditingDataset(null)}
          onSave={updateDataset}
        />
      )}
    </>
  );
}
