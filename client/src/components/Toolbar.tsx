import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Space,
  Modal,
  message,
  Dropdown,
  Typography,
  Divider,
} from 'antd';
import {
  SaveOutlined,
  DownloadOutlined,
  GlobalOutlined,
  LoginOutlined,
  ReloadOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { useTableStore } from '../stores/useTableStore';
import { useTranslation } from '../hooks/useTranslation';
import AddItemsManager from './HiddenItemsManager';
import SaveDialog from './SaveDialog';
import LoadDialog from './LoadDialog';
import type { Language } from '../types';

const { Text } = Typography;

export default function Toolbar() {
  const { t, language } = useTranslation();
  const {
    setLanguage,
    theme,
    setTheme,
    restoreDefaultSettings,
    clearUserData,
    getVisibleModels,
    getVisibleDatasets,
    getModelInfoDatasets,
    getDataPoint,
    saveUserTable,
    currentUserId,
    adminPassword,
  } = useTableStore();

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Handle save operation
  const handleSaveTable = useCallback(async () => {
    // Check if user is logged in
    if (!currentUserId) {
      // Show save dialog if no user ID
      setSaveDialogOpen(true);
      return;
    }

    try {
      setIsSaving(true);

      // Use admin password from store if available
      const isAdmin = await saveUserTable(
        currentUserId,
        adminPassword || undefined
      );

      if (isAdmin) {
        message.success(t('messages.adminSaveSuccess'));
      } else {
        message.success(t('messages.tableSaveSuccess'));
      }
    } catch (error) {
      console.error('Save error:', error);
      message.error(t('messages.saveRetry'));
    } finally {
      setIsSaving(false);
    }
  }, [currentUserId, saveUserTable, setSaveDialogOpen, t, adminPassword]);

  // Handle Ctrl+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault(); // Prevent browser's default save dialog
        handleSaveTable();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSaveTable]); // Re-register when handleSaveTable changes

  const handleOpenLoadDialog = () => {
    setShowLoginPrompt(false);
    setLoadDialogOpen(true);
  };

  const handleRequestLogin = () => {
    setShowLoginPrompt(true);
    setLoadDialogOpen(true);
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    message.success(t('messages.saveSuccess'));
  };

  // Handle theme change
  const handleThemeChange = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    message.success(t('messages.themeSwitch'));
  };

  // Handle reset to default data (keeping user ID)
  const handleRestoreDefault = async () => {
    try {
      await restoreDefaultSettings();
      // Don't clear admin password when restoring default data
      // The user should remain logged in with admin privileges
      message.success(t('messages.resetToDefault'));
      setResetModalOpen(false);
    } catch (error) {
      message.error(t('messages.resetRetry'));
    }
  };

  // Handle clear user data (logout)
  const handleClearUserData = async () => {
    try {
      await clearUserData();
      message.success(t('messages.logoutConfirm'));
      setResetModalOpen(false);
    } catch (error) {
      message.error(t('messages.logoutRetry'));
    }
  };

  const handleDownloadCSV = async () => {
    const visibleModels = getVisibleModels();
    const visibleDatasets = getVisibleDatasets();
    const modelInfoDatasets = getModelInfoDatasets();
    const allDataPoints = useTableStore.getState().dataPoints;

    try {
      // Only include data points that are actually visible
      const relevantDataPoints = allDataPoints.filter(dp => {
        const modelVisible = visibleModels.some(m => m.id === dp.modelId);
        const datasetVisible = [...modelInfoDatasets, ...visibleDatasets].some(
          d => d.id === dp.datasetId
        );
        return modelVisible && datasetVisible;
      });

      // Prepare data to match export-to-csv.ts format
      const downloadData = {
        models: visibleModels.map(m => {
          // Check if model is thinking mode based on id=57 dataset (即时)
          const thinkingDataPoint = getDataPoint(m.id, '57');
          const isThinking = thinkingDataPoint?.value === '否';

          return {
            id: m.id,
            name: m.name,
            fullName: m.fullName,
            apiName: m.apiName,
            isThinking: isThinking,
            isHidden: m.isHidden,
            sortOrder: m.sortOrder,
            showInColumn: m.showInColumn,
            isModel: true,
          };
        }),
        datasets: [...modelInfoDatasets, ...visibleDatasets].map(d => ({
          id: d.id,
          name: d.name,
          fullName: d.fullName,
          isModelInfo: d.isModelInfo,
          category: d.category,
          showInModel: d.showInModel,
          isHidden: d.isHidden,
          sortOrder: d.sortOrder,
          notes: d.notes,
        })),
        dataPoints: relevantDataPoints.map(dp => ({
          id: dp.id,
          modelId: dp.modelId,
          datasetId: dp.datasetId,
          value: dp.value,
          notes: dp.notes,
        })),
        // Include all datasets for proper column structure
        allDatasets: [...modelInfoDatasets, ...visibleDatasets],
        // Separate model info and regular datasets
        modelInfoDatasets: modelInfoDatasets,
        regularDatasets: visibleDatasets,
        // Include ordering information
        modelOrder: visibleModels.map(m => m.id),
        datasetOrder: [...modelInfoDatasets, ...visibleDatasets].map(d => d.id),
        // Export format flag to indicate we want CSV format matching export-to-csv.ts
        exportFormat: 'csv-compatible',
      };

      // Log data size for debugging
      const dataSize = JSON.stringify(downloadData).length;
      console.log(`Download data size: ${dataSize} bytes`);
      console.log(
        `Models: ${downloadData.models.length}, Datasets: ${downloadData.datasets.length}, Data Points: ${downloadData.dataPoints.length}`
      );

      // Send data to server and get ZIP file
      const response = await fetch('http://124.221.176.216:3000/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(downloadData),
      });

      if (!response.ok) {
        throw new Error(t('messages.downloadFailed'));
      }

      // Get the ZIP file as blob
      const blob = await response.blob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `llm-ranking-${new Date().toISOString().split('T')[0]}.zip`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the URL object
      URL.revokeObjectURL(url);

      message.success(t('messages.downloadSuccess'));
    } catch (error) {
      console.error('Download error:', error);
      message.error(t('messages.downloadFailed'));
    }
  };

  const languageItems = [
    {
      key: 'zh',
      label: '中文',
      onClick: () => handleLanguageChange('zh'),
    },
    {
      key: 'en',
      label: 'English',
      onClick: () => handleLanguageChange('en'),
    },
  ];

  return (
    <>
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid var(--border-color)`,
          backgroundColor: 'var(--bg-secondary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
            {t('title')}
          </Text>
          <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
            {t('subtitle')}
          </Text>
        </div>

        <Space split={<Divider type="vertical" />}>
          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveTable}
              loading={isSaving}
              size="small"
              title={t('tooltip.saveTable')}
            >
              {t('dialog.save.title')}
            </Button>

            <Button
              icon={<LoginOutlined />}
              onClick={handleOpenLoadDialog}
              size="small"
            >
              {t('dialog.load.title')}
            </Button>
          </Space>

          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadCSV}
              size="small"
            >
              {t('actions.downloadCsv')}
            </Button>

            <AddItemsManager />

            <Button
              icon={<ReloadOutlined />}
              onClick={() => setResetModalOpen(true)}
              size="small"
              danger
            >
              {t('actions.reset')}
            </Button>
          </Space>

          <Button
            icon={theme === 'light' ? <MoonOutlined /> : <SunOutlined />}
            onClick={handleThemeChange}
            size="small"
            title={t('actions.switchTheme')}
          />

          <Dropdown menu={{ items: languageItems }} placement="bottomRight">
            <Button icon={<GlobalOutlined />} size="small">
              {language === 'zh' ? '中文' : 'English'}
            </Button>
          </Dropdown>
        </Space>
      </div>

      {/* Save Dialog - Only show when no user ID */}
      <SaveDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onRequestLogin={handleRequestLogin}
      />

      {/* Load Dialog */}
      <LoadDialog
        open={loadDialogOpen}
        onClose={() => {
          setLoadDialogOpen(false);
          setShowLoginPrompt(false);
        }}
        showLoginPrompt={showLoginPrompt}
      />

      {/* Reset Modal */}
      <Modal
        title={t('dialog.reset.title')}
        open={resetModalOpen}
        onCancel={() => setResetModalOpen(false)}
        footer={null}
        width={500}
      >
        <div>
          <Text>{t('dialog.reset.message')}</Text>

          <div
            style={{
              marginTop: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* Reset to Default Data */}
            <div
              style={{
                border: '1px solid #d9d9d9',
                borderRadius: 8,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <Text strong style={{ fontSize: 16 }}>
                    {t('dialog.reset.restoreDefault')}
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t('dialog.reset.restoreDefaultMessage')}
                    </Text>
                  </div>
                </div>
                <Button type="primary" size="small" onClick={handleRestoreDefault}>
                  {t('dialog.reset.restoreDefaultBtn')}
                </Button>
              </div>
            </div>

            {/* Clear Local Data */}
            <div
              style={{
                border: '1px solid #d9d9d9',
                borderRadius: 8,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <Text strong style={{ fontSize: 16 }}>
                    {t('dialog.reset.clearLocal')}
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t('dialog.reset.clearLocalMessage')}
                    </Text>
                  </div>
                </div>
                <Button danger size="small" onClick={handleClearUserData}>
                  {t('dialog.reset.clearLocalBtn')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
