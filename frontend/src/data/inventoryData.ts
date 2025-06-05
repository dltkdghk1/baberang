import { InventoryItem } from '../types/types'; // 재고 목록에 사용할 상품 목록
const products = [
  { name: '쌀', supplier: '곰곰', unit: 'kg', priceRange: [1200000, 2000000] },
  { name: '닭', supplier: '하림', unit: '마리', priceRange: [800000, 1200000] },
  { name: '돼지고기', supplier: '마산청육점', unit: 'kg', priceRange: [900000, 1500000] },
  { name: '소고기', supplier: '한우직판장', unit: 'kg', priceRange: [1800000, 2500000] },
  { name: '두부', supplier: '풀무원', unit: 'kg', priceRange: [500000, 700000] },
  { name: '당근', supplier: '새벽농장', unit: 'kg', priceRange: [200000, 350000] },
  { name: '양파', supplier: '청정원', unit: 'kg', priceRange: [150000, 300000] },
  { name: '감자', supplier: '강원농협', unit: 'kg', priceRange: [300000, 500000] },
  { name: '소금', supplier: '백설', unit: 'kg', priceRange: [100000, 200000] },
  { name: '설탕', supplier: '백설', unit: 'kg', priceRange: [150000, 250000] },
  { name: '고춧가루', supplier: '영양농협', unit: 'kg', priceRange: [500000, 800000] },
  { name: '간장', supplier: '샘표', unit: 'L', priceRange: [300000, 450000] },
  { name: '된장', supplier: '청정원', unit: 'kg', priceRange: [250000, 350000] },
  { name: '고추장', supplier: '순창전통', unit: 'kg', priceRange: [300000, 400000] },
  { name: '식용유', supplier: '오뚜기', unit: 'L', priceRange: [350000, 450000] },
  { name: '참기름', supplier: '오뚜기', unit: 'L', priceRange: [500000, 700000] },
  { name: '깨', supplier: '농심', unit: 'kg', priceRange: [400000, 600000] },
  { name: '김치', supplier: '종가집', unit: 'kg', priceRange: [500000, 800000] },
  { name: '배추', supplier: '해남농협', unit: 'kg', priceRange: [200000, 400000] },
  { name: '무', supplier: '천안농협', unit: 'kg', priceRange: [100000, 200000] },
  { name: '달걀', supplier: '자연방목', unit: '판', priceRange: [150000, 250000] },
  { name: '두유', supplier: '베지밀', unit: 'L', priceRange: [300000, 400000] },
  { name: '우유', supplier: '서울우유', unit: 'L', priceRange: [350000, 450000] },
];

// 목데이터 생성
export const generateMockInventoryData = (): InventoryItem[] => {
  const data: InventoryItem[] = [];

  // 2025년 4월, 5월 데이터 생성
  for (let month = 4; month <= 5; month++) {
    // 각 월 1일부터 30일까지
    for (let day = 1; day <= 30; day++) {
      // 각 날짜마다 1~2개의 아이템 생성
      const itemCount = Math.floor(Math.random() * 2) + 1;

      for (let i = 0; i < itemCount; i++) {
        // 랜덤 상품 선택
        const product = products[Math.floor(Math.random() * products.length)];

        // 날짜 포맷팅 (2025.03.01 형식)
        const dateStr = `2025.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;

        // 주문 수량 (10~100 사이 10 단위)
        const quantity = (Math.floor(Math.random() * 10) + 1) * 10;

        // 사용 수량 (주문 수량의 80~100%)
        const usedQuantity = Math.floor(quantity * (0.8 + Math.random() * 0.2));

        // 가격 범위 내에서 랜덤 가격 설정
        const price = Math.floor(
          product.priceRange[0] + Math.random() * (product.priceRange[1] - product.priceRange[0])
        );

        data.push({
          id: data.length + 1,
          date: dateStr,
          productName: product.name,
          supplier: product.supplier,
          price: price,
          orderedQuantity: quantity,
          usedQuantity: usedQuantity,
          unit: product.unit,
        });
      }
    }
  }

  return data;
};

// 목데이터 생성 및 내보내기
export const inventoryData = generateMockInventoryData();

// InventoryItem 타입을 재내보내기
export type { InventoryItem } from '../types/types';
