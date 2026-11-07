import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { menuSections } from './menuConfig';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { state } = useAuth();
  const { pathname } = useLocation();
  const userRole = state.user?.role;

  const [expandedSection, setExpandedSection] = useState<string | null>(() => menuSections.find(section => section.items.some(item => item.path === pathname))?.title || menuSections[0]?.title || null);

  useEffect(() => {
    setExpandedSection(menuSections.find(section => section.items.some(item => item.path === pathname))?.title || null);
  }, [pathname]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [setIsOpen]);

  // Toggle accordion - only one section open at a time
  const toggleSection = (title: string) => {
    setExpandedSection(expandedSection === title ? null : title);
  };

  // Filter menu items based on user role
  const getFilteredMenuSections = () => {
    if (userRole === 'librarian') {
      // Librarian can only see Library section
      return menuSections
        .filter(section => section.items.some(item => item.path === '/library'))
        .map(section => ({
          ...section,
          items: [...section.items.filter(item => item.path === '/library'), { path: '/staff-checkin', label: 'My attendance' }]
        }))
        .filter(section => section.items.length > 0);
    } else if (userRole === 'accountant') {
      // Accountant can only see Fees & Finance Management ERP section
      return menuSections
        .filter(section => section.title === 'Finance Management')
        .map(section => ({
          ...section,
          items: [...section.items.filter(item =>
            ['/fees', '/salary', '/fee-salary-manager', '/accounts', '/shop'].includes(item.path)
          ), { path: '/staff-checkin', label: 'My attendance' }]
        }));
    } else if (userRole === 'teacher') {
      return menuSections
        .map(section => ({ ...section, items: section.items.filter(item => ['/exams', '/assistant'].includes(item.path)) }))
        .filter(section => section.items.length > 0);
    }
    // School admin and other roles see all menu items
    return menuSections;
  };

  const filteredMenuSections = getFilteredMenuSections();

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <button type="button" aria-label="Close navigation"
          className="portal-sidebar-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`portal-sidebar ${isOpen ? 'portal-sidebar-open' : ''}`} aria-label="Primary navigation">
        <div className="portal-sidebar-inner">
          {/* Header */}
          <div className="portal-brand">
            <div className="portal-brand-lockup">
              <img 
                src="/assets/spark-logo-transparent.png" 
                alt="Spark" 
                className="portal-brand-logo"
              />
              <span className="portal-brand-copy"><strong>Spark</strong><small>School workspace</small></span>
            </div>
            <button type="button" className="portal-close-button" onClick={() => setIsOpen(false)} aria-label="Close navigation"><X size={20} /></button>
          </div>

          {/* Navigation */}
          <nav className="portal-nav" aria-label="School modules">
            <div className="portal-nav-list">
              {filteredMenuSections.map(section => {
                const SectionIcon = section.icon;
                const isExpanded = expandedSection === section.title;

                return (
                  <div key={section.title} className="portal-nav-section">
                    {/* Section Title - Always Visible */}
                    <button
                      type="button" className="portal-section-button" aria-expanded={isExpanded}
                      onClick={() => toggleSection(section.title)}
                    >
                      <div className="portal-section-label">
                        <SectionIcon size={18} aria-hidden="true" />
                        <span>{section.title}</span>
                      </div>
                      <ChevronDown 
                        className={`portal-section-chevron ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {/* Menu Items - Visible Only When Expanded */}
                    {isExpanded && (
                      <ul className="portal-nav-items">
                        {section.items.map(item => {
                          const ItemIcon = item.icon;
                          return (
                            <li key={item.path}>
                              <NavLink
                                to={item.path}
                                className={({ isActive }: { isActive: boolean }) => `
                                  portal-nav-link
                                  ${isActive 
                                    ? 'portal-nav-link-active' 
                                    : ''
                                  }
                                `}
                                onClick={() => setIsOpen(false)}
                              >
                                {ItemIcon && <ItemIcon size={16} aria-hidden="true" />}
                                <span>{item.label}</span>
                              </NavLink>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>

          {/* Bottom Section */}
          <div className="portal-sidebar-footer">
            <span className="portal-status-dot" /> School operations, in one place
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar; 
