import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import AssistantWidget from './AssistantWidget';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="portal-shell">
      <a className="portal-skip-link" href="#main-content">Skip to content</a>
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {/* Main Content */}
      <div className="portal-workspace">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Page Content */}
        <main id="main-content" className="portal-main" tabIndex={-1}>
          <div key={pathname} className="portal-page-enter">{children}</div>
        </main>
      </div>
      <AssistantWidget />
    </div>
  );
};

export default Layout; 
