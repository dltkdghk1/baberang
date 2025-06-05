import { WasteData } from '../../data/menuData';

interface DishWasteRatesProps {
  selectedDayWaste: WasteData[] | null;
  selectedDate: string | null;
}

const DishWasteRates = ({ selectedDayWaste, selectedDate }: DishWasteRatesProps) => {
  // 선택된 날짜의 요일 계산
  let dayOfWeek = '';
  if (selectedDate) {
    const date = new Date(selectedDate);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    dayOfWeek = weekdays[date.getDay()];
  }

  // 날짜 포맷팅 (YYYY-MM-DD → MM월 DD일)
  const formattedDate = selectedDate
    ? `${parseInt(selectedDate.split('-')[1])}월 ${parseInt(selectedDate.split('-')[2])}일`
    : '';

  // 선택된 날짜가 없거나 해당 날짜의 잔반률 데이터가 없는 경우
  if (!selectedDate || !selectedDayWaste) {
    return (
      <div
        className="w-1/5 bg-[#FCF8F3]/90 rounded-3xl p-4 flex flex-col h-full"
        style={{ width: '350px', flexShrink: 0 }}
      >
        <div className="h-full flex items-center text-center justify-center text-gray-500">
          날짜를 선택하면 <br /> 잔반률의 상세정보가 표시됩니다.
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-1/5 bg-[#FCF8F3]/90 rounded-3xl p-4 flex flex-col h-full"
      style={{ width: '350px', flexShrink: 0 }}
    >
      <div className="flex flex-col h-full">
        <div className="text-base font-semibold text-center mb-3">
          {formattedDate} ({dayOfWeek}) 잔반률
        </div>
        <div className="overflow-y-auto h-[380px] flex flex-col items-center">
          {selectedDayWaste.length > 0 ? (
            selectedDayWaste.map((dish, index) => (
              <div
                key={index}
                className="bg-white/40 w-[95%] px-3 py-2 rounded-xl text-base shadow-sm mb-3"
                style={{ width: '95%', maxWidth: '95%' }}
              >
                <div className="flex flex-col w-full overflow-hidden">
                  <div className="truncate font-medium text-center">{dish.name}</div>
                  <div className="text-center text-orange-500 mt-1">{dish.잔반률}%</div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-center text-gray-400 mb-4">잔반률 정보가 없습니다.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DishWasteRates;
