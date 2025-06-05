import { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { WasteData } from '../data/menuData';
import { PreferenceChartProps, PreferenceData } from '../types/types';

const PreferenceChart: React.FC<PreferenceChartProps> = ({ data }) => {
  const [preferenceData, setPreferenceData] = useState<PreferenceData[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);

  // 데이터를 선호도 형식으로 변환 - SSE에서 받은 데이터만 사용
  const convertToPreferenceData = (wasteData: WasteData[]): PreferenceData[] => {
    // SSE에서 받은 데이터만 필터링 (선호도 값이 0보다 큰 항목만)
    const filteredData = wasteData.filter((item) => (item.선호도 ?? 0) > 0);

    // 데이터가 비어있으면 빈 배열 반환
    if (!filteredData || filteredData.length === 0) {
      return [];
    }

    // 데이터 변환
    const converted = filteredData.map((item) => ({
      name: item.name,
      선호도: item.선호도 ?? 0,
    }));

    return converted;
  };

  // 선호도 데이터 초기화 (props로 받은 데이터 사용)
  useEffect(() => {
    const newData = convertToPreferenceData(data);
    // React의 불변성을 유지하면서 동일 레퍼런스 문제 방지
    if (JSON.stringify(newData) !== JSON.stringify(preferenceData)) {
      setPreferenceData(newData);
    }
  }, [data, preferenceData]);

  // 데이터가 없는 경우 표시할 내용
  if (preferenceData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p className="text-gray-500 text-xl">선호도 데이터가 아직 없습니다</p>
      </div>
    );
  }

  // 최대 선호도 값 찾기 (최대값이 5를 넘지 않도록 제한)
  const maxPreferenceValue = Math.min(
    5,
    Math.max(...preferenceData.map((item) => item.선호도), 0.1)
  );

  // 선호도 색상 결정 함수
  const getPreferenceFillColor = (entry: PreferenceData) => {
    // 선호도가 0인 경우에도 색상 지정
    if (entry.선호도 <= 0) return '#FFCACA';
    return entry.선호도 === maxPreferenceValue ? '#FF5252' : '#FF8A8A';
  };

  return (
    <div className="relative h-full w-full flex flex-col" ref={chartRef}>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={preferenceData}
            margin={{
              top: 30,
              right: 20,
              left: 20,
              bottom: 0,
            }}
          >
            <XAxis dataKey="name" type="category" tick={{ fontSize: 14 }} tickMargin={10} />
            <YAxis
              type="number"
              domain={[0, 5]}
              ticks={[0, 1, 2, 3, 4, 5]}
              tickFormatter={(value) => `${value}점`}
              tickMargin={10}
            />
            <Tooltip
              formatter={(value) => [`${Number(value).toFixed(1)}점`, '선호도']}
              contentStyle={{ backgroundColor: 'white', borderRadius: '4px' }}
            />
            <Bar
              dataKey="선호도"
              radius={[15, 15, 0, 0]}
              barSize={80}
              isAnimationActive={true}
              animationBegin={0}
              animationDuration={300}
              animationEasing="ease-in-out"
              label={{
                position: 'top',
                fill: '#333',
                fontSize: 12,
                formatter: (value: number) => `${value > 0 ? value.toFixed(1) : '0'}점`,
                dy: -1,
              }}
            >
              {preferenceData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getPreferenceFillColor(entry)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PreferenceChart;
