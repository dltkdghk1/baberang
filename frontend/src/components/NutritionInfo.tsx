import React from 'react';
import Card, { CardBody, CardHeader } from './ui/Card';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import API_CONFIG from '../config/api';
import { useState, useEffect } from 'react';
import { NutritionInfoProps, NutrientResponse } from '../types/types';

const NutritionInfo: React.FC<NutritionInfoProps> = ({ selectedMenu, currentDate }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [nutritionData, setNutritionData] = useState<Record<string, string>>({});
  const { accessToken } = useAuthStore();

  useEffect(() => {
    const fetchNutritionInfo = async () => {
      if (!selectedMenu) {
        setNutritionData({});
        return;
      }

      setLoading(true);
      try {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(currentDate.getDate()).padStart(2, '0')}`;

        const menuNutrientEndpoint = '/api/v1/menu/menu_nutrient';

        const url = API_CONFIG.getUrl(menuNutrientEndpoint, {
          menu: selectedMenu,
          date: dateStr,
        });

        const authHeaderValue = accessToken?.startsWith('Bearer ')
          ? accessToken
          : `Bearer ${accessToken}`;

        const response = await axios.get<NutrientResponse>(url, {
          headers: {
            Authorization: authHeaderValue,
            'Content-Type': 'application/json',
          },
        });

        if (response.data && response.data.영양소) {
          setNutritionData(response.data.영양소);
        } else {
          setNutritionData({});
        }
      } catch {
        setNutritionData({});
      } finally {
        setLoading(false);
      }
    };

    fetchNutritionInfo();
  }, [selectedMenu, currentDate, accessToken]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="w-full text-center font-semibold text-gray-800 text-xl">
          {selectedMenu ? `${selectedMenu} 영양소 정보` : '반찬을 선택하세요'}
        </div>
      </CardHeader>
      <CardBody className="p-2 md:p-4 flex-grow overflow-hidden">
        <div className="h-full flex flex-col items-center justify-center">
          {loading ? (
            <div className="text-center w-full">
              <p className="text-sm font-medium text-gray-600">데이터를 불러오는 중...</p>
            </div>
          ) : selectedMenu && Object.keys(nutritionData).length > 0 ? (
            <div
              className="w-full overflow-y-auto flex justify-center"
              style={{ maxHeight: '100%' }}
            >
              <div className="space-y-3 pr-2 w-full max-w-[98%]">
                {Object.entries(nutritionData).map(([name, value], index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center px-3 py-3.5 rounded-xl bg-white/60 mx-auto"
                  >
                    <span className="text-sm font-medium text-gray-700 truncate mr-2">{name}</span>
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center w-full">
              <p className="text-base font-medium text-gray-500">
                {selectedMenu
                  ? `${selectedMenu}의 영양소 정보가 없습니다`
                  : '반찬을 선택하면 영양소 정보가 표시됩니다'}
              </p>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default NutritionInfo;
