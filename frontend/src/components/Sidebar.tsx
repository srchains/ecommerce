import React from 'react';
import { 
  LayoutDashboard, 
  Grid, 
  Layers, 
  Package, 
  ClipboardCheck,
  Hammer, 
  ShoppingBag, 
  Users, 
  Image as ImageIcon, 
  BarChart3, 
  Settings, 
  ChevronDown, 
  ChevronUp, 
  LogOut
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SidebarProps {
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { setAdminTab, adminTab, setSelectedDesignCode, logout } = useApp();
  const [designsOpen, setDesignsOpen] = React.useState(true);

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { 
      id: 'designs-group', 
      name: 'Designs', 
      icon: Grid,
      isGroup: true,
      children: [
        { id: 'all-designs', name: 'All Designs' },
        { id: 'add-design', name: 'Add Design' },
        { id: 'categories', name: 'Categories' },
        { id: 'collections', name: 'Collections' }
      ]
    },
    { id: 'variants', name: 'Variants', icon: Layers },
    { id: 'inventory', name: 'Inventory', icon: Package },
    { id: 'worker-orders', name: 'Worker Orders', icon: ClipboardCheck },
    { id: 'make-to-order', name: 'Make To Order', icon: Hammer },
    { id: 'orders', name: 'Orders', icon: ShoppingBag },
    { id: 'customers', name: 'Customers', icon: Users },
    { id: 'media-library', name: 'Media Library', icon: ImageIcon },
    { id: 'reports', name: 'Reports', icon: BarChart3 },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  const handleTabClick = (tabId: string) => {
    setSelectedDesignCode(null);
    setAdminTab(tabId);
    if (onClose) onClose();
  };

  return (
    <aside className="sidebar w-64 flex flex-col h-screen shrink-0 select-none">
      <div className="sidebar-brand p-5 flex items-center space-x-3">
        <div className="h-10 w-10 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
          <img src="/logo.jpg" alt="SR Chains Logo" className="h-full w-full object-cover" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-wide">SR CHAINS</h1>
          <p className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase mt-0.5">Wholesale ERP</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-1.5 scrollbar-thin">
        {navItems.map(item => {
          if (item.isGroup) {
            const Icon = item.icon;
            const isChildActive = item.children?.some(c => adminTab === c.id);
            return (
              <div key={item.id} className="space-y-1">
                <button
                  onClick={() => setDesignsOpen(!designsOpen)}
                  className={`sidebar-link w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium cursor-pointer ${
                    isChildActive ? 'sidebar-link-active' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </div>
                  {designsOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </button>
                
                {designsOpen && item.children && (
                  <div className="pl-10 space-y-1 mt-0.5">
                    {item.children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => handleTabClick(child.id)}
                        className={`sidebar-sublink w-full text-left block py-2 text-sm font-medium cursor-pointer ${
                          adminTab === child.id ? 'sidebar-sublink-active' : ''
                        }`}
                      >
                        {child.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          const Icon = item.icon;
          const isActive = adminTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`sidebar-link w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-medium cursor-pointer ${
                isActive ? 'sidebar-link-active' : ''
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg cursor-pointer transition-all"
        >
          <LogOut className="h-4 w-4" />
          <span>Log Out Staff</span>
        </button>
      </div>
    </aside>
  );
};