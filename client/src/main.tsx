import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// 使用React.lazy进行组件懒加载
const App = lazy(() => import('./App.tsx'));

// 创建一个简单的加载指示器
const LoadingIndicator = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: 'var(--bg-color)',
    }}
  >
    <div className="loading-spinner"></div>
  </div>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<LoadingIndicator />}>
      <App />
    </Suspense>
  </StrictMode>
);
