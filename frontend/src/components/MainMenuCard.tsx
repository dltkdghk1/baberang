import { FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi';
import Card, { CardHeader, CardBody } from './ui/Card';
import { useNavigate } from 'react-router-dom';
import { MenuCardProps } from '../types/types';

const MenuCard: React.FC<MenuCardProps> = ({
  menuItems,
  currentDate,
  onPrevDay,
  onNextDay,
  loading = false,
  onMenuSelect,
}) => {
  const navigate = useNavigate();

  // 날짜 포맷 함수
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekDay = weekDays[date.getDay()];

    return `${year} / ${month} / ${day} (${weekDay})`;
  };

  const handleCalendarClick = () => {
    navigate('/calendar');
  };

  const handleMenuItemClick = (item: string) => {
    if (onMenuSelect && item !== '메뉴 정보가 없습니다') {
      onMenuSelect(item);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <button
          onClick={onPrevDay}
          className="text-gray-600 hover:text-gray-900 focus:outline-none"
        >
          <FiChevronLeft size={30} />
        </button>
        <div className="flex items-center space-x-4 font-semibold text-gray-800 text-xl">
          <span>{formatDate(currentDate)}</span>
          <button onClick={handleCalendarClick} className="focus:outline-none">
            <FiCalendar />
          </button>
        </div>
        <button
          onClick={onNextDay}
          className="text-gray-600 hover:text-gray-900 focus:outline-none"
        >
          <FiChevronRight size={30} />
        </button>
      </CardHeader>
      <CardBody className="p-2 md:p-4 flex-grow overflow-hidden">
        <div className="h-full flex flex-col items-center justify-center">
          {loading ? (
            <div className="text-center w-full">
              <p className="text-sm font-medium text-gray-600">데이터를 불러오는 중...</p>
            </div>
          ) : menuItems.length > 0 ? (
            <div
              className="w-full overflow-y-auto flex justify-center"
              style={{ maxHeight: '100%' }}
            >
              <div className="pr-2 w-full max-w-[95%]">
                {menuItems.map((item, index) => (
                  <div
                    key={index}
                    className="text-center p-3 rounded-xl bg-transparent hover:bg-white/60 cursor-pointer mx-auto"
                    onClick={() => handleMenuItemClick(item)}
                  >
                    <p className="text-base font-medium text-gray-800 break-words">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center w-full">
              <p className="text-xl font-medium text-gray-200 cursor-not-allowed">
                오늘의 메뉴가 없습니다
              </p>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default MenuCard;
