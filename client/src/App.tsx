import { useEffect, lazy, Suspense } from 'react';
import { Layout, Spin, Alert, message } from 'antd';
import { useTableStore } from './stores/useTableStore';
import { useTranslation } from './hooks/useTranslation';
import './App.css';

// 懒加载组件
const Toolbar = lazy(() => import('./components/Toolbar'));
const RankingTable = lazy(() => import('./components/RankingTable'));

const { Header, Content } = Layout;

function App() {
  const { t } = useTranslation();
  const { loadData, isLoading, error, theme, setTheme, isThemeManuallySet } =
    useTableStore();

  // Configure message globally
  useEffect(() => {
    message.config({
      top: 50,
      duration: 1, // Default duration for all messages
      maxCount: 3,
    });
  }, []);

  // Listen to system theme changes and auto-update if not manually set
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (!isThemeManuallySet) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [isThemeManuallySet, setTheme]);

  useEffect(() => {
    // Load data on app start
    loadData();
  }, [loadData]);

  // Set initial theme on component mount
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: 'var(--bg-color)',
        }}
      >
        <Spin size="large" tip={t('loading')} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: 'var(--bg-color)',
          padding: 20,
        }}
      >
        <Alert
          message={t('error')}
          description={error}
          type="error"
          showIcon
          style={{ maxWidth: 500 }}
        />
      </div>
    );
  }

  // 轻量级加载占位符
  const fallbackComponent = (
    <div className="loading-spinner" style={{ margin: '20px auto' }} />
  );

  return (
    <Layout
      style={{
        height: '100vh',
        backgroundColor: 'var(--bg-color)',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Header
        style={{
          padding: 0,
          height: 'auto',
          backgroundColor: 'transparent',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          flexShrink: 0,
        }}
      >
        <Suspense fallback={fallbackComponent}>
          <Toolbar />
        </Suspense>
      </Header>

      <Content
        style={{
          padding: '0 16px 16px 16px',
          backgroundColor: 'var(--bg-color)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div>
          <Suspense fallback={fallbackComponent}>
            <RankingTable />
          </Suspense>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 0 8px 0',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            lineHeight: '20px',
            flexShrink: 0,
          }}
        >
          <div>
            {t('footer.disclaimer')} |{' '}
            <a
              href="https://github.com/jiuwen236/LLMrank"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
            >
              GitHub
            </a>
          </div>
        </div>
      </Content>
    </Layout>
  );
}

export default App;
