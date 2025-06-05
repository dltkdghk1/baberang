import * as XLSX from 'xlsx';
import { InventoryItem } from '../../data/inventoryData';
import { showErrorAlert, showSuccessAlert } from '../../utils/sweetalert';

/**
 * 재고 관리 데이터를 Excel 파일로 내보내는 함수
 * @param data 내보낼 재고 데이터
 * @param filename 저장할 파일 이름 (기본값: '재고관리_데이터.xlsx')
 */
export const exportInventoryToExcel = (
  data: InventoryItem[],
  filename: string = '재고관리_데이터.xlsx'
): void => {
  try {
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

    showSuccessAlert('엑셀 파일 다운로드 완료');
  } catch {
    showErrorAlert('엑셀 파일 다운로드 오류', '엑셀 파일 다운로드 중 오류가 발생했습니다.');
  }
};
