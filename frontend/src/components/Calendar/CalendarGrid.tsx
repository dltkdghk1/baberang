import { CalendarDay } from '../../pages/Calendar/calendarUtils';
import { MenuDataType } from '../../pages/Calendar/index';

interface CalendarGridProps {
  days: CalendarDay[];
  weeksCount: number;
  selectedYear: number;
  selectedMonth: number;
  selectedDate: string | null;
  handleDateClick: (day: number) => void;
  menuData: MenuDataType;
}

const CalendarGrid = ({
  days,
  weeksCount,
  selectedYear,
  selectedMonth,
  selectedDate,
  handleDateClick,
  menuData,
}: CalendarGridProps) => {
  // 요일 표기
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="w-4/5 flex flex-col h-full">
      <div className="grid grid-cols-7 mb-2">
        {weekdays.map((day, index) => (
          <div
            key={index}
            className={`text-center text-lg font-semibold ${
              index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : ''
            }`}
          >
            {day}요일
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-7 gap-1 flex-grow"
        style={{
          gridTemplateRows: `repeat(${weeksCount}, 1fr)`,
          height: 'calc(100% - 40px)', // 요일 헤더 높이를 뺀 값
          overflow: 'hidden',
        }}
      >
        {days.map((day, index) => {
          const dateString = `${selectedYear}-${String(selectedMonth + 1).padStart(
            2,
            '0'
          )}-${String(day.date).padStart(2, '0')}`;
          const isSelected = day.type === 'current' && dateString === selectedDate;
          const dayMenus = day.type === 'current' && day.hasMenu ? menuData[dateString]?.menu : [];

          // 공휴일 정보 가져오기
          const isHoliday = day.type === 'current' && day.isHoliday;
          const holidayName = day.holidayName || '';

          return (
            <div
              key={index}
              onClick={() => day.type === 'current' && handleDateClick(day.date)}
              className={`
                border rounded-lg p-2 flex flex-col justify-start h-full overflow-hidden
                ${
                  day.type === 'prev' || day.type === 'next'
                    ? 'bg-transparent text-gray-400'
                    : 'bg-white/50'
                }
                ${day.type === 'current' && day.hasMenu ? 'cursor-pointer hover:bg-orange-50' : ''}
                ${isSelected ? 'bg-orange-100 border-orange-400 border-2' : ''}
              `}
            >
              <div className="flex justify-between">
                <span
                  className={`font-medium ${
                    day.type === 'prev' || day.type === 'next'
                      ? index % 7 === 0
                        ? 'text-red-500 opacity-40'
                        : index % 7 === 6
                        ? 'text-blue-500 opacity-40'
                        : 'text-gray-400'
                      : isHoliday
                      ? 'text-red-500' // 공휴일인 경우 빨간색으로 표시
                      : index % 7 === 0
                      ? 'text-red-500'
                      : index % 7 === 6
                      ? 'text-blue-500'
                      : ''
                  }`}
                >
                  {day.date}
                </span>
                {
                  day.type === 'current' && day.hasMenu && dayMenus && dayMenus.length > 0
                  // && (
                  //   <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  // )
                }
              </div>

              {/* 공휴일 정보 표시 */}
              {day.type === 'current' && isHoliday && (
                <div className="text-[10px] text-red-500 mt-1 overflow-hidden">{holidayName}</div>
              )}

              {/* 메뉴 정보 표시 */}
              {day.type === 'current' && day.hasMenu && dayMenus && dayMenus.length > 0 && (
                <div className="text-[11px] text-gray-600 overflow-hidden">
                  {dayMenus[0] && <div className="truncate">{dayMenus[0]}</div>}
                  {dayMenus.length > 1 && (
                    <div className="text-[11px] text-gray-500">+{dayMenus.length - 1}개</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;
