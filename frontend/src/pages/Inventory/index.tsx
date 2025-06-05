import React, { useState, useEffect, useMemo } from 'react';
import {
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiPlus,
  FiEdit,
  FiCheck,
  FiMinus,
  FiArrowUp,
  FiArrowDown,
  FiChevronsLeft,
  FiChevronsRight,
} from 'react-icons/fi';
import { exportInventoryToExcel } from './excelExporter';
import { showErrorAlert, showSuccessAlert, showConfirmAlert } from '../../utils/sweetalert';
import axios from 'axios';
import API_CONFIG from '../../config/api';
import { useAuthStore } from '../../store/authStore';

// API 응답 타입 정의
interface InventoryApiResponse {
  year: number;
  month: number;
  totalCount: number;
  inventories: InventoryApiItem[];
}

interface InventoryApiItem {
  id: number;
  inventoryDate: string;
  productName: string;
  vendor: string;
  price: number;
  orderQuantity: number;
  useQuantity: number;
  orderUnit?: string;
  useUnit?: string;
}

// 프론트엔드에서 사용할 인벤토리 아이템 타입
export interface InventoryItem {
  id: number;
  date: string;
  productName: string;
  supplier: string;
  price: number;
  orderedQuantity: number;
  usedQuantity: number;
  unit: string;
  orderUnit?: string;
  useUnit?: string;
}

// 공통 스타일 상수 정의
const STYLES = {
  headerCell:
    'py-[0.688%] px-1 text-center border-t border-b border-r border-gray-300 font-semibold truncate text-base md:text-lg',
  headerCellLast:
    'py-[0.688%] px-1 text-center border-t border-b border-gray-300 font-semibold truncate text-base md:text-lg',
  dataCell:
    'py-[0.688%] px-1 text-center border-b border-r border-gray-300 truncate text-base md:text-lg',
  dataCellLast:
    'py-[0.688%] px-1 text-center border-b border-gray-300 truncate text-base md:text-lg',
  dataCellFixed:
    'py-[0.688%] px-1 text-center border-b border-r border-gray-300 truncate text-base md:text-lg',
  dataCellLastFixed:
    'py-[0.688%] px-1 text-center border-b border-gray-300 truncate text-base md:text-lg',
};

const InventoryPage: React.FC = () => {
  // 상태 관리
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    id: number | null;
    field: string | null;
    message: string;
    type: 'success' | 'error';
  }>({
    id: null,
    field: null,
    message: '',
    type: 'success',
  });
  const itemsPerPage = 8;
  const { accessToken } = useAuthStore();

  // 수정 중인 아이템의 ID와 수정 값
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // 항목 추가/삭제 상태
  const [isAddingNewRow, setIsAddingNewRow] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    date: new Date().toISOString().split('T')[0],
    productName: '',
    supplier: '',
    price: 0,
    orderedQuantity: 0,
    usedQuantity: 0,
    unit: 'kg',
    orderUnit: 'kg',
    useUnit: 'kg',
  });

  // 필터링된 데이터 (현재 월에 해당하는 데이터만)
  const [filteredData, setFilteredData] = useState<InventoryItem[]>([]);

  // 정렬 상태 - 날짜 기준으로 초기 정렬 설정
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // API로부터 데이터 가져오기
  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 토큰 확인
      if (!accessToken) {
        showErrorAlert('인증 오류', '로그인이 필요합니다.');
        return;
      }

      const authHeaderValue = accessToken?.startsWith('Bearer ')
        ? accessToken
        : `Bearer ${accessToken}`;

      // 경로 변수 형식에 맞게 URL 수정
      const response = await axios.get<InventoryApiResponse>(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.INVENTORY.GET_BY_MONTH}=${currentYear}&month=${currentMonth}`,
        {
          headers: {
            Authorization: authHeaderValue,
            'Content-Type': 'application/json',
          },
        }
      );

      // API 응답 데이터를 프론트엔드 형식으로 변환
      const inventories = response.data?.inventories || [];
      const transformedData: InventoryItem[] = inventories.map((item) => ({
        id: item.id,
        date: formatDateString(item.inventoryDate),
        productName: item.productName,
        supplier: item.vendor,
        price: item.price,
        orderedQuantity: item.orderQuantity,
        usedQuantity: item.useQuantity,
        orderUnit: item.orderUnit || '개',
        useUnit: item.useUnit || '개',
        unit: item.orderUnit || '개', // 기존 UI 호환성을 위해 유지
      }));

      setInventory(transformedData);
      setFilteredData(transformedData);
      setTotalPages(Math.ceil(transformedData.length / itemsPerPage));
    } catch {
      setError('재고 데이터를 불러오는 중 오류가 발생했습니다.');
      showErrorAlert('데이터 로드 실패', '재고 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 날짜 형식 변환 함수 (YYYY-MM-DD -> YYYY.MM.DD)
  const formatDateString = (dateStr: string): string => {
    if (!dateStr) return '';
    return dateStr.replace(/-/g, '.');
  };

  // 날짜 형식 변환 함수 (YYYY.MM.DD -> YYYY-MM-DD)
  const formatDateForApi = (dateStr: string): string => {
    if (!dateStr) return '';
    return dateStr.replace(/\./g, '-');
  };

  // 컴포넌트 마운트 시 및 월/년 변경 시 데이터 가져오기
  useEffect(() => {
    fetchInventoryData();
  }, [currentMonth, currentYear]);

  // 정렬 토글 함수
  const toggleSort = (field: string) => {
    if (sortField === field) {
      // 같은 필드를 다시 클릭한 경우, 정렬 방향 전환
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 다른 필드를 클릭한 경우, 필드 변경 및 오름차순으로 설정
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 필터링 및 정렬된 데이터
  const processedData = useMemo(() => {
    const result = [...filteredData];

    // 정렬 적용
    if (sortField) {
      result.sort((a, b) => {
        if (sortField === 'date') {
          // 날짜 정렬 (YYYY.MM.DD 형식)
          const datePartsA = a.date.split('.');
          const datePartsB = b.date.split('.');

          // 연도 비교
          if (datePartsA[0] !== datePartsB[0]) {
            return sortDirection === 'asc'
              ? parseInt(datePartsA[0]) - parseInt(datePartsB[0])
              : parseInt(datePartsB[0]) - parseInt(datePartsA[0]);
          }

          // 월 비교
          if (datePartsA[1] !== datePartsB[1]) {
            return sortDirection === 'asc'
              ? parseInt(datePartsA[1]) - parseInt(datePartsB[1])
              : parseInt(datePartsB[1]) - parseInt(datePartsA[1]);
          }

          // 일 비교
          return sortDirection === 'asc'
            ? parseInt(datePartsA[2]) - parseInt(datePartsB[2])
            : parseInt(datePartsB[2]) - parseInt(datePartsA[2]);
        } else if (sortField === 'diff') {
          // diff 정렬
          const diffA = a.orderedQuantity - a.usedQuantity;
          const diffB = b.orderedQuantity - b.usedQuantity;
          return sortDirection === 'asc' ? diffA - diffB : diffB - diffA;
        }
        return 0;
      });
    }

    return result;
  }, [filteredData, sortField, sortDirection]);

  // 현재 페이지에 표시할 데이터
  const currentData = useMemo(() => {
    // 추가 행이 있으면 한 개 적게 표시
    const effectiveItemsPerPage = isAddingNewRow ? itemsPerPage - 1 : itemsPerPage;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + effectiveItemsPerPage;

    return processedData.slice(startIndex, endIndex);
  }, [processedData, currentPage, itemsPerPage, isAddingNewRow]);

  // 월 변경 함수
  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  // 페이지 변경 함수
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  // 수정 시작
  const startEdit = (item: InventoryItem, field: string) => {
    setEditingId(item.id);
    setEditingField(field);

    // 필드에 따라 적절한 초기값 설정
    if (field === 'date') {
      setEditValue(item.date);
    } else if (field === 'productName') {
      setEditValue(item.productName);
    } else if (field === 'supplier') {
      setEditValue(item.supplier);
    } else if (field === 'price') {
      setEditValue(item.price.toString());
    } else if (field === 'orderedQuantity') {
      setEditValue(item.orderedQuantity.toString());
    } else if (field === 'usedQuantity') {
      setEditValue(item.usedQuantity.toString());
    }

    // 전체 아이템 정보도 저장
  };

  // 수정 취소
  const cancelEdit = () => {
    setEditingId(null);
    setEditingField(null);
    setEditValue('');
  };

  // 피드백 표시 후 타이머로 자동 제거하는 함수
  const showFeedback = (
    id: number | null,
    field: string | null,
    message: string,
    type: 'success' | 'error'
  ) => {
    setFeedback({ id, field, message, type });

    // 3초 후 피드백 제거
    setTimeout(() => {
      setFeedback({ id: null, field: null, message: '', type: 'success' });
    }, 3000);
  };

  // 수정 저장
  const saveEdit = async () => {
    if (editingId === null || editingField === null) return;

    try {
      const item = inventory.find((i) => i.id === editingId);
      if (!item) return;

      // 필드별 값 변환 및 유효성 검사
      const updateData: Record<string, string | number> = {};
      const updatedItem = { ...item };

      if (editingField === 'date') {
        updatedItem.date = editValue;
        updateData.inventoryDate = formatDateForApi(editValue);
      } else if (editingField === 'productName') {
        updatedItem.productName = editValue;
        updateData.productName = editValue;
      } else if (editingField === 'supplier') {
        updatedItem.supplier = editValue;
        updateData.vendor = editValue;
      } else if (editingField === 'price') {
        const priceValue = parseInt(editValue) || 0;
        updatedItem.price = priceValue;
        updateData.price = priceValue;
      } else if (editingField === 'orderedQuantity') {
        const quantityValue = parseInt(editValue) || 0;
        updatedItem.orderedQuantity = quantityValue;
        updateData.orderQuantity = quantityValue;
        // 단위 필드 추가 (kg으로 고정)
        updateData.orderUnit = 'kg';
      } else if (editingField === 'usedQuantity') {
        const quantityValue = parseInt(editValue) || 0;
        updatedItem.usedQuantity = quantityValue;
        updateData.useQuantity = quantityValue;
        // 단위 필드 추가 (kg으로 고정)
        updateData.useUnit = 'kg';
      }

      // 토큰 확인
      if (!accessToken) {
        showErrorAlert('인증 오류', '로그인이 필요합니다.');
        return;
      }

      const authHeaderValue = accessToken?.startsWith('Bearer ')
        ? accessToken
        : `Bearer ${accessToken}`;

      // API 호출로 데이터 업데이트
      await axios.patch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.INVENTORY.UPDATE}/${editingId}`,
        updateData,
        {
          headers: {
            Authorization: authHeaderValue,
            'Content-Type': 'application/json',
          },
        }
      );

      // 성공 시 로컬 상태 업데이트
      const updatedInventory = inventory.map((item) => {
        if (item.id === editingId) {
          return updatedItem;
        }
        return item;
      });

      setInventory(updatedInventory);
      setFilteredData(updatedInventory);

      // 토스트 대신 인라인 피드백 표시
      showFeedback(editingId, editingField, '수정 완료', 'success');

      setEditingId(null);
      setEditingField(null);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        showErrorAlert('인증 오류', '인증에 실패했습니다. 다시 로그인해주세요.');
      } else {
        // 오류 피드백 표시
        showFeedback(editingId, editingField, '수정 실패', 'error');
      }
      cancelEdit();
    }
  };

  // ID를 직접 받아 삭제 처리하는 함수
  const deleteInventoryItem = async (id: number) => {
    try {
      // 토큰 확인
      if (!accessToken) {
        showErrorAlert('인증 오류', '로그인이 필요합니다.');
        return;
      }

      const authHeaderValue = accessToken?.startsWith('Bearer ')
        ? accessToken
        : `Bearer ${accessToken}`;

      // API 호출로 항목 삭제
      await axios.delete(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.INVENTORY.DELETE}/${id}`, {
        headers: {
          Authorization: authHeaderValue,
          'Content-Type': 'application/json',
        },
      });

      // 성공 시 로컬 상태 업데이트
      const updatedInventory = inventory.filter((item) => item.id !== id);
      setInventory(updatedInventory);
      setFilteredData(updatedInventory);
      showSuccessAlert('삭제 완료', '항목이 성공적으로 삭제되었습니다.');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        showErrorAlert('인증 오류', '인증에 실패했습니다. 다시 로그인해주세요.');
      } else {
        showErrorAlert('삭제 실패', '재고 항목을 삭제하는 중 오류가 발생했습니다.');
      }
    }
  };

  // SweetAlert를 사용한 삭제 확인
  const confirmDelete = (id: number) => {
    showConfirmAlert(
      '정말로 삭제하시겠습니까?',
      '이 작업은 되돌릴 수 없습니다.',
      '네, 삭제합니다',
      '취소'
    ).then((result) => {
      if (result.isConfirmed) {
        // 상태 업데이트 없이 ID를 직접 전달하여 삭제 처리
        deleteInventoryItem(id);
      }
    });
  };

  // diff 계산 및 색상 결정
  const calculateDiff = (ordered: number, used: number) => {
    const diff = ordered - used;
    let color = 'text-black';
    if (diff > 0) color = 'text-red-600';
    else if (diff < 0) color = 'text-blue-600';
    return { value: diff, color };
  };

  // 데이터 셀 렌더링 함수
  const renderEditableCell = (item: InventoryItem, field: string) => {
    const isEditing = editingId === item.id && editingField === field;
    const showFeedbackIcon = feedback.id === item.id && feedback.field === field;

    // 피드백 아이콘 렌더링 함수
    const renderFeedbackIcon = () => {
      if (!showFeedbackIcon) return null;

      return (
        <div
          className={
            feedback.type === 'success'
              ? 'absolute right-4 top-1 text-green-500'
              : 'absolute right-4 top-1 text-red-500'
          }
        >
          {feedback.type === 'success' ? <FiCheck size={16} /> : <FiMinus size={16} />}
        </div>
      );
    };

    // 필드별 편집 UI 및 표시 로직
    if (field === 'date') {
      return (
        <div className="flex items-center justify-center h-full w-full relative">
          {renderFeedbackIcon()}
          {isEditing ? (
            <input
              type="date"
              value={editValue.replace(/\./g, '-')}
              onChange={(e) => {
                const dateValue = e.target.value;
                if (dateValue) {
                  const [year, month, day] = dateValue.split('-');
                  setEditValue(`${year}.${month}.${day}`);
                }
              }}
              onBlur={saveEdit}
              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
              className="w-[84%] h-11 border-1 p-1 rounded-xl text-center text-base"
              autoFocus
            />
          ) : (
            <span
              onClick={() => startEdit(item, 'date')}
              className="cursor-pointer hover:bg-white/70 rounded-xl text-base w-[84%] h-11 flex items-center justify-center"
            >
              {item.date}
            </span>
          )}
        </div>
      );
    } else if (field === 'productName') {
      return (
        <div className="flex items-center justify-center h-full w-full relative">
          {renderFeedbackIcon()}
          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
              className="w-[84%] h-11 border-1 p-1 rounded-xl text-center text-base"
              autoFocus
            />
          ) : (
            <span
              onClick={() => startEdit(item, 'productName')}
              className="cursor-pointer hover:bg-white/70 rounded-xl text-base w-[84%] h-11 flex items-center justify-center"
            >
              {item.productName}
            </span>
          )}
        </div>
      );
    } else if (field === 'supplier') {
      return (
        <div className="flex items-center justify-center h-full w-full relative">
          {renderFeedbackIcon()}
          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
              className="w-[84%] h-11 border-1 p-1 rounded-xl text-center text-base"
              autoFocus
            />
          ) : (
            <span
              onClick={() => startEdit(item, 'supplier')}
              className="cursor-pointer hover:bg-white/70 rounded-xl text-base w-[84%] h-11 flex items-center justify-center"
            >
              {item.supplier}
            </span>
          )}
        </div>
      );
    } else if (field === 'price') {
      return (
        <div className="flex items-center justify-center h-full w-full relative">
          {renderFeedbackIcon()}
          {isEditing ? (
            <div className="flex items-center justify-center w-full">
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                className="w-[84%] h-11 border-1 p-1 rounded-xl text-center text-base"
                autoFocus
              />
              <span className="ml-1 text-base">원</span>
            </div>
          ) : (
            <span
              onClick={() => startEdit(item, 'price')}
              className="cursor-pointer hover:bg-white/70 rounded-xl text-base w-[84%] h-11 flex items-center justify-center"
            >
              {item.price.toLocaleString()}원
            </span>
          )}
        </div>
      );
    } else if (field === 'orderedQuantity') {
      return (
        <div className="flex items-center justify-center h-full w-full relative">
          {renderFeedbackIcon()}
          {isEditing ? (
            <div className="flex w-[84%] h-11 rounded-xl bg-white/70 hover:bg-white overflow-hidden text-sm">
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                className="w-full p-2.5 text-left border-none bg-transparent outline-none pl-4"
                autoFocus
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-full min-h-[20px] h-full">
              <span
                onClick={() => startEdit(item, 'orderedQuantity')}
                className="cursor-pointer hover:bg-white/70 rounded-xl text-base w-[84%] h-11 flex items-center justify-center"
              >
                {item.orderedQuantity}
              </span>
            </div>
          )}
        </div>
      );
    } else if (field === 'usedQuantity') {
      return (
        <div className="flex items-center justify-center h-full w-full relative">
          {renderFeedbackIcon()}
          {isEditing ? (
            <div className="flex w-[84%] h-11 rounded-xl bg-white/70 hover:bg-white overflow-hidden text-sm">
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                className="w-full p-2.5 text-left border-none bg-transparent outline-none pl-4"
                autoFocus
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-full min-h-[20px] h-full">
              <span
                onClick={() => startEdit(item, 'usedQuantity')}
                className="cursor-pointer hover:bg-white/70 rounded-xl text-base w-[84%] h-11 flex items-center justify-center"
              >
                {item.usedQuantity}
              </span>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // 테이블 행 렌더링 함수
  const renderTableRow = (item: InventoryItem) => {
    const diff = calculateDiff(item.orderedQuantity, item.usedQuantity);
    return (
      <tr key={item.id} className="hover:bg-[#E7E3DE]">
        {isEditMode && (
          <td className="w-15 text-center border-b border-r border-gray-300">
            <button
              onClick={() => confirmDelete(item.id)}
              className="text-red-500 hover:text-red-700"
            >
              <FiMinus size={18} />
            </button>
          </td>
        )}
        <td className={STYLES.dataCell}>{renderEditableCell(item, 'date')}</td>
        <td className={STYLES.dataCell}>{renderEditableCell(item, 'productName')}</td>
        <td className={STYLES.dataCell}>{renderEditableCell(item, 'supplier')}</td>
        <td className={STYLES.dataCell}>{renderEditableCell(item, 'price')}</td>
        <td className={STYLES.dataCell}>{renderEditableCell(item, 'orderedQuantity')}</td>
        <td className={STYLES.dataCellFixed}>{renderEditableCell(item, 'usedQuantity')}</td>
        <td className={`${STYLES.dataCellLast} font-medium ${diff.color}`}>{diff.value}</td>
      </tr>
    );
  };

  // 편집 모드 토글 함수
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  // 새 행 추가 관련 함수

  // 새 행 추가 시작
  const startAddingNewRow = () => {
    setNewItem({
      date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
      productName: '',
      supplier: '',
      price: 0,
      orderedQuantity: 0,
      usedQuantity: 0,
      unit: 'kg',
      orderUnit: 'kg',
      useUnit: 'kg',
    });
    setIsAddingNewRow(true);
  };

  // 새 행 추가 취소
  const cancelAddingNewRow = () => {
    setIsAddingNewRow(false);
  };

  // 새 행 추가 저장
  const saveNewRow = async () => {
    // 유효성 검사
    if (
      !newItem.productName &&
      !newItem.supplier &&
      (newItem.price === undefined || newItem.price === 0) &&
      (newItem.orderedQuantity === undefined || newItem.orderedQuantity === 0)
    ) {
      // 모든 필드가 비어있는 경우 더 강조된 오류 메시지
      showErrorAlert('입력 오류', '모든 필드를 입력해주세요.');
      return;
    } else if (
      !newItem.productName ||
      !newItem.supplier ||
      newItem.price === undefined ||
      newItem.orderedQuantity === undefined
    ) {
      // 일부 필드만 비어있는 경우 피드백 표시
      showFeedback(null, null, '모든 필드를 입력해주세요', 'error');
      return;
    }

    try {
      // API 요청 데이터 준비
      const requestData = {
        inventoryDate: formatDateForApi(newItem.date || ''),
        productName: newItem.productName,
        vendor: newItem.supplier,
        price: newItem.price,
        orderQuantity: newItem.orderedQuantity,
        useQuantity: newItem.usedQuantity || 0,
        orderUnit: newItem.orderUnit || newItem.unit,
        useUnit: newItem.useUnit || newItem.unit,
      };

      // 토큰 확인
      if (!accessToken) {
        showErrorAlert('인증 오류', '로그인이 필요합니다.');
        return;
      }

      const authHeaderValue = accessToken?.startsWith('Bearer ')
        ? accessToken
        : `Bearer ${accessToken}`;

      // API 호출로 새 항목 추가
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.INVENTORY.CREATE}`,
        requestData,
        {
          headers: {
            Authorization: authHeaderValue,
            'Content-Type': 'application/json',
          },
        }
      );

      // API 응답에서 ID를 가져오거나, 없으면 임시 ID 생성
      const newItemId = response.data?.id || Math.max(...inventory.map((item) => item.id), 0) + 1;

      // 새 항목 생성
      const newItemWithId: InventoryItem = {
        id: newItemId,
        date: newItem.date || '',
        productName: newItem.productName || '',
        supplier: newItem.supplier || '',
        price: newItem.price || 0,
        orderedQuantity: newItem.orderedQuantity || 0,
        usedQuantity: newItem.usedQuantity || 0,
        unit: newItem.unit || 'kg',
        orderUnit: newItem.orderUnit || newItem.unit || 'kg',
        useUnit: newItem.useUnit || newItem.unit || 'kg',
      };

      // 인벤토리에 추가
      const updatedInventory = [...inventory, newItemWithId];
      setInventory(updatedInventory);
      setFilteredData(updatedInventory);

      // 토스트 대신 피드백 표시
      showFeedback(newItemId, null, '항목이 추가되었습니다', 'success');

      // 새 행 추가 모드 종료
      setIsAddingNewRow(false);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        showErrorAlert('인증 오류', '인증에 실패했습니다. 다시 로그인해주세요.');
      } else {
        showErrorAlert('추가 실패', '재고 항목을 추가하는 중 오류가 발생했습니다.');
      }
    }
  };

  // 정렬 아이콘 렌더링 함수
  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      // 정렬되지 않은 컬럼은 흐린 아이콘 표시
      return <FiArrowUp size={14} className="text-gray-300" />;
    }
    return sortDirection === 'asc' ? (
      <FiArrowUp size={14} className="text-gray-800" />
    ) : (
      <FiArrowDown size={14} className="text-gray-800" />
    );
  };

  // 전역 피드백 메시지 컴포넌트
  const renderGlobalFeedback = () => {
    if (!feedback.id && !feedback.field && feedback.message) {
      return (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg p-3 ${
            feedback.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white shadow-lg flex items-center space-x-2`}
        >
          <div>{feedback.type === 'success' ? <FiCheck size={18} /> : <FiMinus size={18} />}</div>
          <div>{feedback.message}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen w-full overflow-hidden relative">
      {/* 배경 이미지 */}
      <div className="absolute inset-0 z-0 bg-main bg-cover bg-center"></div>

      {/* 전역 피드백 메시지 */}
      {renderGlobalFeedback()}

      {/* 메인 컨텐츠 */}
      <div
        className="relative z-10 flex items-center justify-center"
        style={{ height: 'calc(100vh - 80px)', marginTop: '75px' }}
      >
        <div className="w-[90%] h-[73vh] mx-auto flex flex-col">
          <div className="bg-[#F8F1E7] rounded-3xl shadow-lg p-0 flex flex-col flex-grow overflow-hidden">
            {/* 헤더 */}
            <div className="grid grid-cols-3 items-center p-4">
              {/* 왼쪽 - 항목 추가 버튼과 편집 버튼 */}
              <div className="flex items-center justify-start space-x-6">
                <button
                  onClick={startAddingNewRow}
                  className="flex items-center space-x-1 text-blue-500 hover:text-blue-700 ml-6"
                >
                  <FiPlus size={20} />
                  <span>항목 추가</span>
                </button>
                <button
                  onClick={toggleEditMode}
                  className={`flex items-center space-x-2 ${
                    isEditMode
                      ? 'text-red-600 hover:text-red-800'
                      : 'text-red-600 hover:text-red-800'
                  }`}
                >
                  {isEditMode ? (
                    <>
                      <FiCheck size={20} />
                      <span>삭제 완료</span>
                    </>
                  ) : (
                    <>
                      <FiEdit size={18} />
                      <span>항목 삭제</span>
                    </>
                  )}
                </button>
              </div>

              {/* 중앙 - 이전/다음 버튼과 제목 */}
              <div className="flex items-center justify-center">
                <button
                  onClick={prevMonth}
                  className="text-gray-600 hover:text-gray-900 focus:outline-none"
                >
                  <FiChevronLeft size={30} />
                </button>
                <h1 className="text-xl font-bold text-center w-[50%]">{currentMonth}월 재고관리</h1>
                <button
                  onClick={nextMonth}
                  className="text-gray-600 hover:text-gray-900 focus:outline-none"
                >
                  <FiChevronRight size={30} />
                </button>
              </div>

              {/* 오른쪽 - Excel 버튼 */}
              <div className="flex justify-end">
                <button
                  onClick={() =>
                    exportInventoryToExcel(filteredData, `재고관리_${currentMonth}월.xlsx`)
                  }
                  className="flex items-center space-x-2 text-green-600 hover:text-green-800 mr-6"
                >
                  <FiDownload size={20} />
                  <span>엑셀로 다운받기</span>
                </button>
              </div>
            </div>

            {/* 테이블 */}
            <div className="flex-grow flex flex-col overflow-hidden w-full h-full">
              <div className="flex-grow overflow-auto flex flex-col h-full relative">
                <div className="absolute inset-0 overflow-auto">
                  {loading ? (
                    <div className="flex justify-center items-center h-full">
                      <p className="text-lg">로딩 중...</p>
                    </div>
                  ) : error ? (
                    <div className="flex justify-center items-center h-full">
                      <p className="text-lg text-red-500">{error}</p>
                    </div>
                  ) : (
                    <table className="w-full bg-[#FCF8F3] border-t border-b border-gray-300 border-collapse table-fixed mb-0">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-[#FCF8F3]">
                          {isEditMode && (
                            <th className="w-10 pl-2 py-[1%] text-center border-t border-b border-r border-gray-300 font-semibold">
                              <FiMinus size={18} className="opacity-0" />
                            </th>
                          )}
                          <th
                            className={`${STYLES.headerCell} cursor-pointer hover:bg-gray-100`}
                            onClick={() => toggleSort('date')}
                          >
                            <div className="flex items-center justify-center space-x-1">
                              <span>날짜</span>
                              {renderSortIcon('date')}
                            </div>
                          </th>
                          <th className={STYLES.headerCell}>상품명</th>
                          <th className={STYLES.headerCell}>거래처</th>
                          <th className={STYLES.headerCell}>가격</th>
                          <th className={STYLES.headerCell}>
                            <div className="flex items-center justify-center">
                              <span>주문수량</span>
                              <span className="text-xs ml-1 text-gray-500">(kg)</span>
                            </div>
                          </th>
                          <th className={STYLES.headerCell}>
                            <div className="flex items-center justify-center">
                              <span>실제사용수량</span>
                              <span className="text-xs ml-1 text-gray-500">(kg)</span>
                            </div>
                          </th>
                          <th
                            className={`${STYLES.headerCellLast} cursor-pointer hover:bg-gray-100`}
                            onClick={() => toggleSort('diff')}
                          >
                            <div className="flex items-center justify-center space-x-1">
                              <span>diff</span>
                              <span className="text-xs ml-1 text-gray-500">(kg)</span>
                              {renderSortIcon('diff')}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* 새 행 추가 행 */}
                        {isAddingNewRow && (
                          <tr className="hover:bg-[#E7E3DE] bg-white/10">
                            {isEditMode && (
                              <td className="w-10 pl-2 text-center border-b border-r border-l border-gray-300 p-[1%]">
                                <button className="text-red-500 opacity-0">
                                  <FiMinus size={18} />
                                </button>
                              </td>
                            )}
                            <td className="text-center border-b border-r border-gray-300 p-[0.68%]">
                              <input
                                type="date"
                                value={
                                  newItem.date
                                    ? (() => {
                                        try {
                                          const parts = newItem.date.split('.');
                                          if (parts.length === 3) {
                                            return `${parts[0]}-${parts[1].padStart(
                                              2,
                                              '0'
                                            )}-${parts[2].padStart(2, '0')}`;
                                          }
                                          return '';
                                        } catch {
                                          return '';
                                        }
                                      })()
                                    : ''
                                }
                                onChange={(e) => {
                                  const dateValue = e.target.value;
                                  if (dateValue) {
                                    const [year, month, day] = dateValue.split('-');
                                    setNewItem({
                                      ...newItem,
                                      date: `${year}.${month}.${day}`,
                                    });
                                  }
                                }}
                                className="w-[90%] bg-white/70 p-2 rounded-xl h-[40px] text-center hover:bg-white"
                              />
                            </td>
                            <td className="text-center border-b border-r border-gray-300 p-[0.68%]">
                              <input
                                type="text"
                                value={newItem.productName || ''}
                                onChange={(e) =>
                                  setNewItem({ ...newItem, productName: e.target.value })
                                }
                                placeholder="상품명"
                                className="w-[90%] bg-white/70 p-2 rounded-xl h-[40px] hover:bg-white"
                              />
                            </td>
                            <td className="text-center border-b border-r border-gray-300 p-[0.68%] ">
                              <input
                                type="text"
                                value={newItem.supplier || ''}
                                onChange={(e) =>
                                  setNewItem({ ...newItem, supplier: e.target.value })
                                }
                                placeholder="거래처"
                                className="w-[90%] bg-white/70 p-2 rounded-xl h-[40px] hover:bg-white"
                              />
                            </td>
                            <td className="text-center border-b border-r border-gray-300 p-[0.68%]">
                              <div className="relative">
                                <input
                                  type="text"
                                  value={newItem.price || 0}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    setNewItem({ ...newItem, price: value ? parseInt(value) : 0 });
                                  }}
                                  className="w-[90%] bg-white/70 p-2 rounded-xl h-[40px] pr-8 hover:bg-white"
                                />
                                <span className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-500">
                                  원
                                </span>
                              </div>
                            </td>
                            <td className="text-center border-b border-r border-gray-300 p-[0.68%]">
                              <div className="flex items-center justify-center">
                                <div className="flex w-[90%] rounded-xl bg-white/70 hover:bg-white overflow-hidden">
                                  <input
                                    type="number"
                                    value={newItem.orderedQuantity || 0}
                                    onChange={(e) =>
                                      setNewItem({
                                        ...newItem,
                                        orderedQuantity: parseInt(e.target.value) || 0,
                                      })
                                    }
                                    className="w-full p-2.5 text-left border-none bg-transparent outline-none pl-4"
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="text-center border-b border-r border-gray-300 p-[0.68%]">
                              <div className="flex items-center justify-center">
                                <div className="flex w-[90%] rounded-xl bg-white/70 hover:bg-white overflow-hidden">
                                  <input
                                    type="number"
                                    value={newItem.usedQuantity || 0}
                                    onChange={(e) =>
                                      setNewItem({
                                        ...newItem,
                                        usedQuantity: parseInt(e.target.value) || 0,
                                      })
                                    }
                                    className="w-full p-2.5 text-left border-none bg-transparent outline-none pl-4"
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="text-center border-b border-gray-300 font-medium p-[0.68%]">
                              <div className="flex justify-center space-x-2">
                                <button
                                  onClick={saveNewRow}
                                  className="bg-green-500 text-white px-4 py-2 text-sm rounded-lg hover:bg-green-600"
                                >
                                  저장
                                </button>
                                <button
                                  onClick={cancelAddingNewRow}
                                  className="bg-red-500 text-white px-4 py-2 text-sm rounded-lg hover:bg-red-600"
                                >
                                  취소
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                        {currentData.length > 0 ? (
                          currentData.map(renderTableRow)
                        ) : (
                          <tr>
                            <td
                              colSpan={isEditMode ? 8 : 7}
                              className="text-center py-4 border-b border-gray-300"
                            >
                              데이터가 없습니다.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* 페이지네이션 */}
              <div className="flex justify-center items-center h-[7vh] min-h-[60px] mt-0">
                {totalPages > 1 && (
                  <div className="flex justify-center space-x-2 md:space-x-4">
                    {/* 첫 페이지 버튼 */}
                    {currentPage > 1 ? (
                      <button
                        onClick={() => goToPage(1)}
                        className="mx-3 px-3 py-2 font-semibold text-gray-700 flex items-center justify-center w-10 h-10"
                      >
                        <FiChevronsLeft size={20} />
                      </button>
                    ) : (
                      <div className="mx-3 px-3 py-2 w-10 h-10"></div>
                    )}

                    {/* 이전 페이지 버튼 또는 빈 공간 */}
                    {currentPage > 1 ? (
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        className="mx-3 px-3 py-2 font-semibold text-gray-700 flex items-center justify-center w-10 h-10"
                      >
                        <FiChevronLeft size={20} />
                      </button>
                    ) : (
                      <div className="mx-3 px-3 py-2 w-10 h-10"></div>
                    )}

                    {/* 5개 페이지만 표시 */}
                    {(() => {
                      let startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                      const endPage = Math.min(startPage + 4, totalPages);

                      if (endPage - startPage < 4) {
                        startPage = Math.max(1, endPage - 4);
                      }

                      return Array.from(
                        { length: endPage - startPage + 1 },
                        (_, i) => startPage + i
                      ).map((page) => (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`mx-3 px-3 py-2 font-semibold flex items-center justify-center w-10 h-10 rounded-lg ${
                            currentPage === page ? 'text-orange-500' : 'text-gray-700'
                          }`}
                        >
                          {page}
                        </button>
                      ));
                    })()}

                    {/* 다음 페이지 버튼 또는 빈 공간 */}
                    {currentPage < totalPages ? (
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        className="mx-3 px-3 py-2 font-semibold text-gray-700 flex items-center justify-center w-10 h-10"
                      >
                        <FiChevronRight size={20} />
                      </button>
                    ) : (
                      <div className="mx-3 px-3 py-2 w-10 h-10"></div>
                    )}

                    {/* 마지막 페이지 버튼 */}
                    {currentPage < totalPages ? (
                      <button
                        onClick={() => goToPage(totalPages)}
                        className="mx-3 px-3 py-2 font-semibold text-gray-700 flex items-center justify-center w-10 h-10"
                      >
                        <FiChevronsRight size={20} />
                      </button>
                    ) : (
                      <div className="mx-3 px-3 py-2 w-10 h-10"></div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;
