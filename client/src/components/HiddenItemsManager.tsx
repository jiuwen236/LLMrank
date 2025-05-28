import { useState } from 'react';
import {
  Button,
  List,
  Checkbox,
  Typography,
  Empty,
  Form,
  Input,
  Switch,
  message,
  Space,
  Drawer,
  Divider,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTableStore } from '../stores/useTableStore';
import { useTranslation } from '../hooks/useTranslation';

const { Text, Title } = Typography;

export default function AddItemsManager() {
  const { t } = useTranslation();
  const {
    models,
    datasets,
    hiddenModels,
    hiddenDatasets,
    showHiddenModels,
    showHiddenDatasets,
    addModel,
    addDataset,
  } = useTableStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'hidden' | 'add'>('hidden');

  // Get models that are currently hidden (either by user or by default, but not control fields)
  const allHiddenModels = models.filter(m => {
    const isControlField = parseInt(m.id) < 10 && !isNaN(parseInt(m.id));
    return !isControlField && (m.isHidden || hiddenModels.has(m.id));
  });

  // Get datasets that are currently hidden (either by user or by default, but not control fields)
  const allHiddenDatasets = datasets.filter(d => {
    const isControlField = parseInt(d.id) < 10 && !isNaN(parseInt(d.id));
    return !isControlField && (d.isHidden || hiddenDatasets.has(d.id));
  });

  const handleShowSelectedModels = () => {
    if (selectedModels.length > 0) {
      showHiddenModels(selectedModels);
      setSelectedModels([]);
      setDrawerOpen(false); // 关闭弹出窗口
    }
  };

  const handleShowSelectedDatasets = () => {
    if (selectedDatasets.length > 0) {
      showHiddenDatasets(selectedDatasets);
      setSelectedDatasets([]);
      setDrawerOpen(false); // 关闭弹出窗口
    }
  };

  const handleModelCheckboxChange = (modelId: string, checked: boolean) => {
    if (checked) {
      setSelectedModels([...selectedModels, modelId]);
    } else {
      setSelectedModels(selectedModels.filter(id => id !== modelId));
    }
  };

  const handleDatasetCheckboxChange = (datasetId: string, checked: boolean) => {
    if (checked) {
      setSelectedDatasets([...selectedDatasets, datasetId]);
    } else {
      setSelectedDatasets(selectedDatasets.filter(id => id !== datasetId));
    }
  };

  const handleAddModel = async (values: any) => {
    try {
      const newModel = {
        name: values.modelName,
        isHidden: false,
        sortOrder: models.length + 100,
        showInColumn: false,
      };

      await addModel(newModel);
      message.success(t('addItems.addModel.addSuccess'));
      setDrawerOpen(false); // 关闭弹出窗口
    } catch (error) {
      message.error(t('addItems.addModel.addError'));
    }
  };

  const handleAddDataset = async (values: any) => {
    try {
      const newDataset = {
        name: values.datasetName,
        fullName: values.datasetFullName || values.datasetName,
        notes: values.notes || '',
        isHidden: false,
        sortOrder: datasets.length + 100,
        isModelInfo: values.isModelInfo || false,
        showInModel: false,
      };

      await addDataset(newDataset);
      message.success(t('addItems.addDataset.addSuccess'));
      setDrawerOpen(false); // 关闭弹出窗口
    } catch (error) {
      message.error(t('addItems.addDataset.addError'));
    }
  };

  return (
    <>
      {/* Add items manager button */}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => setDrawerOpen(true)}
        size="small"
      >
        {t('addItems.title')}
      </Button>

      <Drawer
        title={t('addItems.title')}
        placement="bottom"
        height={500}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          <Space>
            <Button
              type={activeTab === 'hidden' ? 'primary' : 'default'}
              size="small"
              onClick={() => setActiveTab('hidden')}
            >
              {t('addItems.showHidden')}
            </Button>
            <Button
              type={activeTab === 'add' ? 'primary' : 'default'}
              size="small"
              onClick={() => setActiveTab('add')}
            >
              {t('addItems.addNew')}
            </Button>
          </Space>
        }
      >
        {activeTab === 'hidden' && (
          <div style={{ display: 'flex', gap: 24 }}>
            {/* Hidden Models */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <Title level={5}>{t('dialog.hiddenItems.hiddenModels')}</Title>
                <Button
                  type="primary"
                  size="small"
                  disabled={selectedModels.length === 0}
                  onClick={handleShowSelectedModels}
                >
                  {t('dialog.hiddenItems.showSelected')} (
                  {selectedModels.length})
                </Button>
              </div>
              {allHiddenModels.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t('dialog.hiddenItems.noHiddenItems')}
                  style={{ margin: '20px 0' }}
                />
              ) : (
                <List
                  size="small"
                  dataSource={allHiddenModels}
                  renderItem={model => (
                    <List.Item style={{ padding: '4px 0' }}>
                      <Checkbox
                        checked={selectedModels.includes(model.id)}
                        onChange={e =>
                          handleModelCheckboxChange(model.id, e.target.checked)
                        }
                        disabled={parseInt(model.id) < 10} // Only disable control fields (id < 10)
                      >
                        <Text style={{ fontSize: 12 }}>
                          {model.name}
                          {model.isHidden && (
                            <Text
                              type="secondary"
                              style={{ fontSize: 10, marginLeft: 4 }}
                            >
                              {t('dialog.hiddenItems.defaultHidden')}
                            </Text>
                          )}
                        </Text>
                      </Checkbox>
                    </List.Item>
                  )}
                />
              )}
            </div>

            <Divider type="vertical" style={{ height: '100%' }} />

            {/* Hidden Datasets */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <Title level={5}>
                  {t('dialog.hiddenItems.hiddenDatasets')}
                </Title>
                <Button
                  type="primary"
                  size="small"
                  disabled={selectedDatasets.length === 0}
                  onClick={handleShowSelectedDatasets}
                >
                  {t('dialog.hiddenItems.showSelected')} (
                  {selectedDatasets.length})
                </Button>
              </div>
              {allHiddenDatasets.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t('dialog.hiddenItems.noHiddenItems')}
                  style={{ margin: '20px 0' }}
                />
              ) : (
                <List
                  size="small"
                  dataSource={allHiddenDatasets}
                  renderItem={dataset => (
                    <List.Item style={{ padding: '4px 0' }}>
                      <Checkbox
                        checked={selectedDatasets.includes(dataset.id)}
                        onChange={e =>
                          handleDatasetCheckboxChange(
                            dataset.id,
                            e.target.checked
                          )
                        }
                        disabled={parseInt(dataset.id) < 10} // Only disable control fields (id < 10)
                      >
                        <Text style={{ fontSize: 12 }}>
                          {dataset.name}
                          {dataset.isHidden && (
                            <Text
                              type="secondary"
                              style={{ fontSize: 10, marginLeft: 4 }}
                            >
                              {t('dialog.hiddenItems.defaultHidden')}
                            </Text>
                          )}
                        </Text>
                      </Checkbox>
                    </List.Item>
                  )}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'add' && (
          <div style={{ display: 'flex', gap: 24 }}>
            {/* Add Model */}
            <div style={{ flex: 1 }}>
              <Title level={5}>{t('addItems.addModel.title')}</Title>
              <Form layout="vertical" onFinish={handleAddModel} size="small">
                <Form.Item
                  name="modelName"
                  label={t('addItems.addModel.nameLabel')}
                  rules={[
                    {
                      required: true,
                      message: t('addItems.addModel.nameRequired'),
                    },
                  ]}
                >
                  <Input />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" size="small">
                    {t('addItems.addModel.addButton')}
                  </Button>
                </Form.Item>
              </Form>
            </div>

            <Divider type="vertical" style={{ height: '100%' }} />

            {/* Add Dataset */}
            <div style={{ flex: 1 }}>
              <Title level={5}>{t('addItems.addDataset.title')}</Title>
              <Form layout="vertical" onFinish={handleAddDataset} size="small">
                <Form.Item
                  name="datasetName"
                  label={t('addItems.addDataset.nameLabel')}
                  rules={[
                    {
                      required: true,
                      message: t('addItems.addDataset.nameRequired'),
                    },
                  ]}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name="datasetFullName"
                  label={t('addItems.addDataset.fullNameLabel')}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name="notes"
                  label={t('addItems.addDataset.notesLabel')}
                >
                  <Input.TextArea rows={2} />
                </Form.Item>
                <Form.Item name="isModelInfo" valuePropName="checked">
                  <Switch size="small" />
                  <Text style={{ marginLeft: 8, fontSize: 12 }}>
                    {t('addItems.addDataset.isModelInfoLabel')}
                  </Text>
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" size="small">
                    {t('addItems.addDataset.addButton')}
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}
