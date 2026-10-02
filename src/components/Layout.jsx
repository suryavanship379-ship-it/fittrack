import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { Menu } from 'lucide-react';
import './Sidebar.css';

const Layout = ({ children }) => {
  const { dndMode } = useAuth();

  // sidebarState: 'expanded' | 'collapsed' | 'hidden'
  const [sidebarState, setSidebarState] = useState(() => {
    return localStorage.getItem('sidebarState') || 'expanded';
  });

  // lastVisibleState: 'expanded' | 'collapsed'
  const [lastVisibleState, setLastVisibleState] = useState(() => {
    return localStorage.getItem('lastVisibleState') || 'expanded';
  });

  // mobileOpen: boolean (for slide-out drawer on mobile)
  const [mobileOpen, setMobileOpen] = useState(false);

  // isMobile: boolean (dynamically checks if screen is mobile)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileOpen(false); // Close mobile drawer when resizing back to desktop
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync state to localStorage
  const handleSetSidebarState = (state) => {
    setSidebarState(state);
    localStorage.setItem('sidebarState', state);
    if (state === 'expanded' || state === 'collapsed') {
      setLastVisibleState(state);
      localStorage.setItem('lastVisibleState', state);
    }
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      if (sidebarState === 'hidden') {
        handleSetSidebarState(lastVisibleState);
      } else {
        handleSetSidebarState('hidden');
      }
    }
  };

  return (
    <div 
      className={`app-layout ${dndMode ? 'dnd-mode' : ''}`}
      style={{ 
        display: 'flex', 
        minHeight: '100vh', 
        backgroundColor: dndMode ? '#000000' : 'transparent', 
        color: dndMode ? '#ffffff' : '#0f172a',
        transition: 'background-color 0.35s ease, color 0.35s ease'
      }}
    >
      {/* Mobile Overlay Backdrop */}
      {isMobile && mobileOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <Sidebar 
        sidebarState={sidebarState} 
        setSidebarState={handleSetSidebarState}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area Wrapper */}
      <div className={`main-content-wrapper ${isMobile ? 'mobile' : sidebarState}`}>
        {/* Top Header Row with Hamburger Menu */}
        <header className="main-header">
          <button 
            id="sidebar-toggle-btn"
            className="hamburger-btn" 
            onClick={toggleSidebar}
            aria-label="Toggle Sidebar"
          >
            <Menu size={22} />
          </button>
        </header>

        {/* Content Body */}
        <div className="content-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;

