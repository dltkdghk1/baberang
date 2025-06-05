import React from 'react';
import * as XLSX from 'xlsx';
import { ExcelExportProps } from '../types/types';
import { FiFileText } from 'react-icons/fi';

const ExcelExport: React.FC<ExcelExportProps> = ({ data, filename = '재고관리_데이터.xlsx' }) => {
  const exportToExcel = () => {
    // 엑셀에 들어갈 데이터 가공
    const excelData = data.map((item) => ({
      날짜: item.date,
      상품명: item.productName,
      거래처: item.supplier,
      가격: item.price.toLocaleString() + '원',
      주문수량: item.orderedQuantity + item.unit,
      실제사용수량: item.usedQuantity + item.unit,
      diff: item.orderedQuantity - item.usedQuantity + item.unit,
    }));

    // 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // 열 너비 설정
    const colWidths = [
      { wch: 12 }, // 날짜
      { wch: 10 }, // 상품명
      { wch: 12 }, // 거래처
      { wch: 15 }, // 가격
      { wch: 10 }, // 주문수량
      { wch: 15 }, // 실제사용수량
      { wch: 10 }, // diff
    ];
    worksheet['!cols'] = colWidths;

    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '재고관리');

    // 파일로 저장
    XLSX.writeFile(workbook, filename);
  };

  return (
    <button
      onClick={exportToExcel}
      className="flex items-center bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors"
    >
      <FiFileText className="mr-2" />
      <span>엑셀 내보내기</span>
    </button>
  );
};

export default ExcelExport;
