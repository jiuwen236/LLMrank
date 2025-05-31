import { useState } from 'react';
import { Modal, message, Typography, Alert } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useTableStore } from '../stores/useTableStore';
import { useTranslation } from '../hooks/useTranslation';

const { Text } = Typography;

interface SaveDialogProps {
  open: boolean;
  onClose: () => void;
  onRequestLogin: () => void;
}

export default function SaveDialog({
  open,
  onClose,
  onRequestLogin,
}: SaveDialogProps) {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const { saveUserTable, currentUserId, adminPassword } = useTableStore();

  const handleSave = async () => {
    // Check if user is logged in
    if (!currentUserId) {
      onClose();
      onRequestLogin();
      return;
    }

    try {
      setLoading(true);

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

      onClose();
    } catch (error) {
      console.error('Save error:', error);
      message.error(t('messages.saveRetry'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Text>
          <SaveOutlined style={{ marginRight: 8 }} />
          {t('dialog.save.title')}
        </Text>
      }
      open={open}
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={loading}
      width={400}
      destroyOnClose
      okText={t('save')}
      cancelText={t('cancel')}
    >
      {currentUserId ? (
        <div>
          <Alert
            message={t('dialog.save.saveCurrentTable')}
            description={
              <div style={{ fontSize: 12 }}>
                <p>
                  <Text strong>{t('dialog.save.userId')}: </Text>
                  {currentUserId}
                </p>
                <p>{t('dialog.save.saveDescription1')}</p>
                {adminPassword && (
                  <p style={{ color: '#faad14' }}>
                    {t('dialog.save.saveDescription2')}
                  </p>
                )}
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        </div>
      ) : (
        <Alert
          message={t('dialog.save.loginFirst')}
          description={t('dialog.save.loginDescription')}
          type="warning"
          showIcon
        />
      )}
    </Modal>
  );
}
