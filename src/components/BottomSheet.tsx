import React from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--panel)',
          color: 'var(--fg)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar & Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ width: 44 }} />
          <div style={{ fontWeight: 600, fontSize: 16 }}>{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: 'var(--accent)',
              minWidth: 44,
              minHeight: 44,
            }}
          >
            Done
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', padding: '16px' }}>{children}</div>
      </div>
    </div>
  );
};
