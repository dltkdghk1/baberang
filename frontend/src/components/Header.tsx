import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeaderProps } from '../types/types';

const Header = ({ isLoggedIn }: HeaderProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="bg-transparent py-8 fixed top-4 left-0 right-0 z-50 w-full">
      <div className="flex justify-between items-center w-[94%] mx-auto">
        <div className="flex items-center">
          {/* 로고 이미지와 텍스트 */}
          <Link to="/" className="flex items-center">
            <img src="/images/logo/logo.png" alt="밥이랑 로고" className="h-16 w-auto mr-2" />
          </Link>
        </div>

        {/* 모바일 메뉴 토글 버튼 */}
        <div className="md:hidden">
          <button onClick={() => setIsOpen(!isOpen)} className="text-gray-700 focus:outline-none">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* 데스크탑 메뉴 */}
        <div className="hidden md:flex md:items-center mr-4 md:mr-8 text-2xl">
          {isLoggedIn && (
            <nav className="flex space-x-8">
              <Link to="/calendar" className="text-gray-700 hover:text-gray-900 font-bold ">
                식단관리
              </Link>
              <Link to="/student" className="text-gray-700 hover:text-gray-900 font-bold">
                학생관리
              </Link>
              <Link to="/inventory" className="text-gray-700 hover:text-gray-900 font-bold">
                재고관리
              </Link>
              <Link to="/dashboard" className="text-gray-700 hover:text-gray-900 font-bold">
                대시보드
              </Link>
              <Link to="/mypage" className="text-gray-700 hover:text-gray-900 font-bold">
                마이페이지
              </Link>
            </nav>
          )}
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {isOpen && (
        <div className="md:hidden mt-4 bg-white p-4 rounded-lg shadow-lg absolute left-0 right-0 z-50">
          {isLoggedIn ? (
            <nav className="flex flex-col space-y-4">
              <Link
                to="/calendar"
                className="text-gray-700 hover:text-gray-900 font-bold px-4 py-2"
                onClick={() => setIsOpen(false)}
              >
                식단관리
              </Link>
              <Link
                to="/student"
                className="text-gray-700 hover:text-gray-900 font-bold px-4 py-2"
                onClick={() => setIsOpen(false)}
              >
                학생관리
              </Link>
              <Link
                to="/inventory"
                className="text-gray-700 hover:text-gray-900 font-bold px-4 py-2"
                onClick={() => setIsOpen(false)}
              >
                재고관리
              </Link>
              <Link
                to="/dashboard"
                className="text-gray-700 hover:text-gray-900 font-bold px-4 py-2"
                onClick={() => setIsOpen(false)}
              >
                대시보드
              </Link>
              <Link
                to="/mypage"
                className="text-gray-700 hover:text-gray-900 font-bold px-4 py-2"
                onClick={() => setIsOpen(false)}
              >
                마이페이지
              </Link>
            </nav>
          ) : null}
        </div>
      )}
    </header>
  );
};

export default Header;
