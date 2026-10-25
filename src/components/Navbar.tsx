import React from 'react';
import { Home, Bookmark, Grid, Sparkles } from 'lucide-react';

interface NavbarProps {
  currentTab: number;
  onTabChange: (tab: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: 0, label: 'Inicio', icon: Home },
    { id: 1, label: 'Colección', icon: Bookmark },
    { id: 2, label: 'Mazos', icon: Grid },
    { id: 3, label: 'Estrategia', icon: Sparkles },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[color:var(--surface-color)]/95 backdrop-blur-md border-t border-[color:var(--border-color)] shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center py-1.5 px-4 rounded-2xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'text-[color:var(--accent-color)] bg-[color:var(--accent-color)]/15 scale-105 font-bold'
                  : 'text-[color:var(--muted-color)] hover:text-[color:var(--fg-color)] hover:bg-white/5'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
