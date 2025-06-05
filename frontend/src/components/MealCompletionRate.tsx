import React, { useState, useEffect } from 'react';
import { MealCompletionRateProps } from '../types/types';

const MealCompletionRate: React.FC<MealCompletionRateProps> = ({
  completionRate,
  totalStudents,
  completedStudents,
}) => {
  // 완료율이 범위를 벗어나지 않도록 보정
  const targetRate = Math.max(0, Math.min(100, completionRate));

  // 애니메이션을 위한 상태값
  const [animatedRate, setAnimatedRate] = useState(0);

  // 컴포넌트가 마운트될 때 애니메이션 시작
  useEffect(() => {
    // 애니메이션의 총 지속 시간 (밀리초)
    const animationDuration = 1000;
    // 증가 단계 수
    const steps = 120;
    // 각 단계 간의 시간 간격
    const interval = animationDuration / steps;
    // 각 단계마다 증가하는 값
    const increment = targetRate / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setAnimatedRate((prev) => {
        // 다음 값 계산
        const nextValue = Math.min(targetRate, prev + increment);
        // 애니메이션이 끝나면 타이머 정리
        if (currentStep >= steps || nextValue >= targetRate) {
          clearInterval(timer);
          return targetRate;
        }
        return nextValue;
      });
    }, interval);

    // 컴포넌트 언마운트 시 타이머 정리
    return () => clearInterval(timer);
  }, [targetRate]);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative object-contain h-full">
        {/* 식판 이미지 */}
        <img src="/images/items/dish.png" alt="식판" className=" w-full h-full" />

        {/* 채워지는 부분 (오버레이) */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[99%] h-[100%] rounded-3xl bg-[#FF8A8A] opacity-70"
          style={{
            clipPath: `inset(${100 - animatedRate}% 0 0 0)`,
            transition: 'clip-path 0.2s ease-out',
          }}
        ></div>

        {/* 분수 형태의 표시: 완료명수/총명수 */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-baseline">
          <span className="text-6xl font-bold text-black pr-2">{completedStudents}</span>
          <span className="text-3xl font-bold text-gray-900">/ {totalStudents}</span>
        </div>
      </div>

      <p className="text-lg mt-6 text-gray-700">오늘 급식을 다 먹은 학생 비율입니다</p>
    </div>
  );
};

export default MealCompletionRate;
