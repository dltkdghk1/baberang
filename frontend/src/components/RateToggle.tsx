import { useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import Card, { CardHeader, CardBody } from './ui/Card';
import WasteRateCard from './WasteRateCard';
import PreferenceChart from './PreferenceChart';
import MealCompletionRate from './MealCompletionRate';
import { RateToggleCardProps } from '../types/types';

const RateToggleCard: React.FC<RateToggleCardProps> = ({ data, leftoverData, completionData }) => {
  // 0: 실시간 잔반률, 1: 실시간 선호도, 2: 실시간 식사 완료율
  // 기본으로 선호도 차트를 먼저 보여줌
  const [viewMode, setViewMode] = useState(1);

  const handleLeftClick = () => {
    // 왼쪽으로 전환 (현재 모드에서 -1, 0보다 작아지면 마지막 모드로)
    setViewMode((prev) => (prev > 0 ? prev - 1 : 2));
  };

  const handleRightClick = () => {
    // 오른쪽으로 전환 (현재 모드에서 +1, 마지막 모드보다 커지면 첫 모드로)
    setViewMode((prev) => (prev < 2 ? prev + 1 : 0));
  };

  // 현재 모드에 따른 제목 설정
  const getTitle = () => {
    switch (viewMode) {
      case 0:
        return '실시간 잔반률';
      case 1:
        return '실시간 선호도';
      case 2:
        return '실시간 식사 완료율';
      default:
        return '실시간 잔반률';
    }
  };

  // 현재 모드에 따른 컴포넌트 렌더링
  const renderContent = () => {
    switch (viewMode) {
      case 0:
        return <WasteRateCard data={leftoverData || []} />;
      case 1:
        return <PreferenceChart data={data} />;
      case 2:
        return (
          <MealCompletionRate
            completionRate={completionData?.completionRate || 0}
            totalStudents={completionData?.totalStudents || 0}
            completedStudents={completionData?.completedStudents || 0}
          />
        );
      default:
        return <WasteRateCard data={leftoverData || []} />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <button
          className="text-gray-600 hover:text-gray-900 focus:outline-none"
          onClick={handleLeftClick}
        >
          <FiChevronLeft size={30} />
        </button>
        <div className="font-semibold text-gray-800 text-xl">{getTitle()}</div>
        <button
          className="text-gray-600 hover:text-gray-900 focus:outline-none"
          onClick={handleRightClick}
        >
          <FiChevronRight size={30} />
        </button>
      </CardHeader>
      <CardBody className="flex items-center justify-center flex-grow">
        <div className="w-full h-full">{renderContent()}</div>
      </CardBody>
    </Card>
  );
};

export default RateToggleCard;
