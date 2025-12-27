
import React from 'react';

interface ButtonProps {
  // Fixed: Made children optional to resolve TypeScript errors where nested elements aren't correctly mapped to required children props in JSX.
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'gold';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

export default function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  disabled, 
  type = 'button',
  className = ''
}: ButtonProps) {
  const baseStyle = "w-full py-3 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-brand-900 text-white shadow-md hover:bg-brand-800",
    secondary: "bg-white text-brand-900 border-2 border-brand-900 hover:bg-brand-50",
    gold: "bg-gold-gradient text-brand-900 hover:brightness-110 shadow-lg"
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled} 
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
