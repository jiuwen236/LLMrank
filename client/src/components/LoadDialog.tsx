import { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Switch,
  message,
  Space,
  Typography,
  Alert,
} from 'antd';
import { LoginOutlined } from '@ant-design/icons';
import { useTableStore } from '../stores/useTableStore';
import { useTranslation } from '../hooks/useTranslation';
import { isValidUserId } from '../utils/dataUtils';

const { Text } = Typography;

interface LoadDialogProps {
  open: boolean;
  onClose: () => void;
  showLoginPrompt?: boolean;
}

export default function LoadDialog({
  open,
  onClose,
  showLoginPrompt = false,
}: LoadDialogProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const { t } = useTranslation();
  const {
    loadUserTable,
    saveUserTable,
    currentUserId,
    adminPassword,
    setAdminPassword,
  } = useTableStore();

  // Check for cached admin password when dialog opens
  useEffect(() => {
    if (open) {
      if (adminPassword) {
        setUsePassword(true);
        // Also set the password field in the form
        form.setFieldsValue({ password: adminPassword });
      } else {
        setUsePassword(false);
      }
    } else {
      // Reset state when dialog closes
      setUsePassword(false);
    }
  }, [open, form, adminPassword]);

  const handleLoad = async (values: any) => {
    try {
      setLoading(true);

      const { userId, password } = values;

      // Validate userId (support Chinese characters)
      if (!userId || userId.trim().length === 0) {
        message.error(t('dialog.load.placeholder'));
        return;
      }

      try {
        // Try to load the table data
        await loadUserTable(userId.trim());

        // If admin password was provided, save it for later use
        if (usePassword && password) {
          // Store admin password in store for persistence
          setAdminPassword(password);
        }

        message.success(t('messages.tableLoadSuccess'));

        form.resetFields();
        setUsePassword(false);
        onClose();
      } catch (loadError) {
        // If loading fails (user table doesn't exist), try to save current table with the new user ID
        console.log(
          'User table not found, creating new table with current data...'
        );

        try {
          // Save current table data with the new user ID
          const isAdmin = await saveUserTable(
            userId.trim(),
            usePassword && password ? password : undefined
          );

          if (isAdmin) {
            message.success(t('messages.newUserAdminSuccess'));
          } else {
            message.success(t('messages.newUserSuccess'));
          }

          // Store admin password if provided
          if (usePassword && password) {
            setAdminPassword(password);
          }

          form.resetFields();
          setUsePassword(false);
          onClose();
        } catch (saveError) {
          console.error('Save error:', saveError);
          message.error(t('messages.userCreateFailed'));
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      message.error(t('messages.operationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setUsePassword(false);
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <LoginOutlined />
          {t('dialog.load.title')}
        </Space>
      }
      open={open}
      onOk={() => form.submit()}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={500}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleLoad}
        initialValues={{
          userId: currentUserId || '',
          usePassword: false,
        }}
      >
        {showLoginPrompt && (
          <Alert
            message={t('dialog.save.loginFirst')}
            description={t('dialog.save.loginDescription')}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Alert
          message={t('dialog.load.title')}
          description={
            <div style={{ fontSize: 12 }}>
              <p>{t('dialog.load.loadDescription1')}</p>
              <p>{t('dialog.load.loadDescription2')}</p>
              <p>{t('dialog.load.loadDescription3')}</p>
              <p>{t('dialog.load.loadDescription4')}</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form.Item
          name="userId"
          label={t('dialog.load.userId')}
          rules={[
            { required: true, message: t('dialog.load.placeholder') },
            {
              min: 2,
              message:
                t('dialog.load.userId') + t('dialog.load.userIdMinLength'),
            },
            {
              max: 50,
              message:
                t('dialog.load.userId') + t('dialog.load.userIdMaxLength'),
            },
            {
              validator: (_, value) => {
                if (!value || isValidUserId(value)) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error(t('dialog.load.userIdInvalidFormat'))
                );
              },
            },
          ]}
        >
          <Input placeholder={t('dialog.load.placeholder')} maxLength={50} />
        </Form.Item>

        <Form.Item>
          <Space align="center">
            <Switch
              checked={usePassword}
              onChange={setUsePassword}
              size="small"
            />
            <Text>{t('dialog.load.adminToggle')}</Text>
          </Space>
        </Form.Item>

        {usePassword && (
          <Form.Item
            name="password"
            label={t('dialog.load.adminPassword')}
            rules={[
              {
                required: true,
                message: t('dialog.load.adminPasswordRequired'),
              },
            ]}
          >
            <Input.Password
              placeholder={t('dialog.load.adminPasswordPlaceholder')}
              maxLength={100}
            />
          </Form.Item>
        )}

        {usePassword && (
          <Alert
            message={t('dialog.load.adminMode')}
            description={t('dialog.load.adminModeDescription')}
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Form>
    </Modal>
  );
}
