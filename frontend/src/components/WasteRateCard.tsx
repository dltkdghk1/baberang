import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { WasteData } from '../data/menuData';
import { WasteRateCardProps } from '../types/types';

const WasteRateCard: React.FC<WasteRateCardProps> = ({ data }) => {
  // 잔반률 값 표준화 (API에서 이미 퍼센트로 변환된 값인지 확인)
  const normalizedData = data.map((item) => ({
    ...item,
    잔반률: parseFloat(item.잔반률.toFixed(1)), // 소수점 한 자릿수로 제한
  }));

  // 최대 잔반률 값 찾기
  const maxValue = Math.max(...normalizedData.map((item) => item.잔반률));

  // 색상 결정 함수
  const getFillColor = (entry: WasteData) => {
    return entry.잔반률 === maxValue ? '#FF7814' : '#CF722C';
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={normalizedData}
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
            domain={[0, 100]} // 0~100% 고정
            tickFormatter={(value) => `${value.toFixed(1)}%`}
            tickMargin={10}
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(1)}%`, '잔반률']}
            contentStyle={{ backgroundColor: 'white', borderRadius: '4px' }}
          />
          <Bar
            dataKey="잔반률"
            radius={[15, 15, 0, 0]}
            barSize={80}
            label={{
              position: 'top',
              fill: '#333',
              fontSize: 12,
              formatter: (value: number) => `${value.toFixed(1)}%`,
              dy: -1,
            }}
          >
            {normalizedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getFillColor(entry)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WasteRateCard;
