import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  CreditCard, 
  UserCheck, 
  ClipboardList, 
  BarChart3, 
  Settings, 
  LogOut,
  Image,
  User,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ sidebarState, setSidebarState, isMobile, mobileOpen, setMobileOpen }) => {
  const navigate = useNavigate();
  const { userRole, roleData, dndMode, toggleDndMode } = useAuth();

  const getMenuItems = () => {
    if (userRole === 'trainer') {
      const trainerId = roleData?.id || '';
      return [
        { path: '/trainer-dashboard', name: 'Trainer Dashboard', icon: <LayoutDashboard size={20} /> },
        { path: `/trainers/${trainerId}`, name: 'My Profile', icon: <User size={20} /> },
        { path: '/gallery', name: 'Gym Gallery', icon: <Image size={20} /> },
      ];
    }
    
    if (userRole === 'member') {
      const memberId = roleData?.id || '';
      return [
        { path: '/member-dashboard', name: 'Member Dashboard', icon: <LayoutDashboard size={20} /> },
        { path: `/members/${memberId}`, name: 'My Profile', icon: <User size={20} /> },
        { path: '/gallery', name: 'Gym Gallery', icon: <Image size={20} /> },
      ];
    }

    // Owner / Default Full Navigation
    return [
      { path: '/dashboard', name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
      { path: '/members', name: 'Members', icon: <Users size={20} /> },
      { path: '/attendance', name: 'Attendance', icon: <CalendarCheck size={20} /> },
      { path: '/payments', name: 'Payments', icon: <CreditCard size={20} /> },
      { path: '/trainers', name: 'Trainers', icon: <UserCheck size={20} /> },
      { path: '/workout-plans', name: 'Workout Plans', icon: <ClipboardList size={20} /> },
      { path: '/reports', name: 'Reports', icon: <BarChart3 size={20} /> },
      { path: '/settings', name: 'Settings', icon: <Settings size={20} /> },
      { path: '/gallery', name: 'Gym Gallery', icon: <Image size={20} /> },
    ];
  };

  const menuItems = getMenuItems();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error logging out:", err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate('/login');
    }
  };

  return (
    <div className={`sidebar ${sidebarState === 'collapsed' ? 'collapsed' : ''} ${sidebarState === 'hidden' ? 'hidden' : ''} ${isMobile && mobileOpen ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-logo-container">
          {sidebarState === 'collapsed' ? (
            <h2 className="brand-title brand-collapsed">
              <span className="text-white">F</span>
              <span className="text-red">T</span>
            </h2>
          ) : (
            <h2 className="brand-title">
              <span className="text-white">FIT</span>
              <span className="text-red">TRACK</span>
            </h2>
          )}
        </div>
        
        {!isMobile && (
          <button 
            className="sidebar-collapse-toggle" 
            onClick={() => setSidebarState(sidebarState === 'collapsed' ? 'expanded' : 'collapsed')}
            aria-label={sidebarState === 'collapsed' ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarState === 'collapsed' ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>
      
      <div className="sidebar-menu">
        {menuItems.map((item) => (
          <NavLink 
            to={item.path} 
            key={item.name}
            className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
            onClick={() => isMobile && setMobileOpen(false)}
          >
            <span className="menu-icon">{item.icon}</span>
            {sidebarState !== 'collapsed' && <span className="menu-text">{item.name}</span>}
            
            {sidebarState === 'collapsed' && (
              <span className="sidebar-tooltip">{item.name}</span>
            )}
          </NavLink>
        ))}
      </div>

      <div className="sidebar-footer">
        <button 
          className="menu-item dnd-toggle-btn" 
          onClick={toggleDndMode}
          style={{ marginBottom: '8px' }}
        >
          <span className="menu-icon">
            {dndMode ? <Moon size={20} className="text-red-500" /> : <Sun size={20} className="text-amber-500" />}
          </span>
          {sidebarState !== 'collapsed' ? (
            <span className="menu-text">
              {dndMode ? 'Focus DND: ON' : 'Focus DND: OFF'}
            </span>
          ) : (
            <span className="sidebar-tooltip">
              {dndMode ? 'DND: ON' : 'DND: OFF'}
            </span>
          )}
        </button>
        
        <button className="menu-item logout-btn" onClick={handleLogout}>
          <span className="menu-icon"><LogOut size={20} /></span>
          {sidebarState !== 'collapsed' ? (
            <span className="menu-text">Logout</span>
          ) : (
            <span className="sidebar-tooltip">Logout</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;


