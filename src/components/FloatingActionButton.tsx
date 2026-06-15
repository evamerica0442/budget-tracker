import React from 'react';
import './FloatingActionButton.css';

interface FloatingActionButtonProps {
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onClick, icon, label }) => {
  return (
    <button className="fab" onClick={onClick} aria-label={label || 'Quick action'}>
      <span className="fab-icon">
        {icon || (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        )}
      </span>
      {label && <span className="fab-label">{label}</span>}
    </button>
  );
};

export default FloatingActionButton;