import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 버튼 안에 들어갈 텍스트 또는 엘리먼트 */
  children: React.ReactNode;
  /** 추가 클래스명 */
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, className = '', ...props }) => (
  <button
    {...props}
    className={`
      w-full
      px-4 py-5
      bg-white/50
      rounded-2xl
      text-gray-800
      font-medium
      transition-colors
      hover:bg-green-500 hover:text-white
      ${className}
    `}
  >
    {children}
  </button>
);

export default Button;
