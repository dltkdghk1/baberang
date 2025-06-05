import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';

interface DailyWasteRate {
  date: string;
  day: number;
  wasteRate: number;
}

// 차트 클릭 이벤트 데이터 타입
interface ChartClickData {
  activePayload?: Array<{
    payload: DailyWasteRate;
  }>;
}

interface MonthlyWasteChartProps {
  monthlyWasteData: DailyWasteRate[];
  selectedDate: string | null;
  handleDotClick: (data: ChartClickData) => void;
}

const MonthlyWasteChart = ({
  monthlyWasteData,
  selectedDate,
  handleDotClick,
}: MonthlyWasteChartProps) => {
  return (
    <div className="w-4/5 flex flex-col h-full bg-white/50 rounded-xl p-4">
      <div className="flex-grow" style={{ height: '350px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={monthlyWasteData}
            margin={{ top: 20, right: 10, left: 10, bottom: 10 }}
            onClick={handleDotClick}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" type="category" tickFormatter={(value) => `${value}`} />
            <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
            <Tooltip
              formatter={(value) => [value !== null ? `${value}%` : '데이터 없음', '잔반률']}
              labelFormatter={(label) => `${label}일`}
            />
            <Line
              type="monotone"
              dataKey="wasteRate"
              stroke="#FF7814"
              strokeWidth={2}
              activeDot={{ r: 8 }}
              name="잔반률"
              connectNulls={true}
              dot={{ r: 5, fill: '#FF7814', stroke: 'none' }}
              isAnimationActive={false}
            />
            {selectedDate &&
              monthlyWasteData.find((d) => d.date === selectedDate && d.wasteRate !== null) && (
                <ReferenceDot
                  x={parseInt(selectedDate.split('-')[2])}
                  y={monthlyWasteData.find((d) => d.date === selectedDate)?.wasteRate || 0}
                  r={8}
                  fill="#FF0000"
                  stroke="none"
                />
              )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center text-sm text-gray-500 mt-2">
        ※ 그래프의 점을 클릭하면 해당 일자의 반찬별 잔반률을 확인할 수 있습니다.
      </div>
    </div>
  );
};

export default MonthlyWasteChart;
