import React from 'react';

export interface InputCardProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** 필드 위에 표시할 레이블 텍스트 */
  label?: string;
  /** 추가 클래스명 */
  className?: string;
  /** 오류 메시지 */
  error?: string;
  /** 중복 확인 버튼 표시 여부 */
  showCheckButton?: boolean;
  /** 중복 확인 버튼 클릭 핸들러 */
  onCheck?: () => void;
  /** 중복 확인 로딩 상태 */
  checkLoading?: boolean;
  /** 중복 확인 완료 상태 */
  checked?: boolean;
}

const InputCard: React.FC<InputCardProps> = ({
  label,
  className = '',
  error,
  showCheckButton,
  onCheck,
  checkLoading,
  checked,
  ...props
}) => (
  <div className={`flex flex-col space-y-1 ${className}`}>
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <div className="relative flex items-center">
      <input
        {...props}
        className={`
          w-full
          px-4 py-5
          bg-white/50
          rounded-2xl
          text-gray-800
          placeholder-gray-400
          focus:outline-none focus:ring-2 ${
            error ? 'focus:ring-red-500 border border-red-500' : 'focus:ring-green-500'
          }
          ${showCheckButton ? 'pr-28' : ''}
        `}
      />
      {showCheckButton && (
        <button
          type="button"
          onClick={onCheck}
          disabled={checkLoading || checked || !props.value}
          className={`
            absolute right-4
            px-3 py-2
            rounded-xl
            text-sm
            transition-colors
            ${
              checked
                ? 'bg-green-500 text-white cursor-default'
                : checkLoading
                ? 'bg-gray-300 text-gray-500 cursor-wait'
                : !props.value
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }
          `}
        >
          {checked ? '확인완료' : checkLoading ? '확인중...' : '중복확인'}
        </button>
      )}
    </div>
    {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
  </div>
);

export default InputCard;
