import { WasteData } from '../types/types';

// 메뉴 데이터 타입
interface MenuDataType {
  [key: string]: {
    date: string;
    menu: string[];
    wasteData?: WasteData[];
  };
}

// 빈 메뉴 데이터
export const menuData: MenuDataType = {};

// 빈 잔반률 데이터
export const foodWasteData: WasteData[] = [];

// 기본 잔반률 데이터 (메뉴 정보가 없을 경우)
export const defaultWasteData: WasteData[] = [];

// 기본 메뉴 (날짜에 맞는 메뉴가 없을 경우)
export const defaultMenu: string[] = ['메뉴 정보가 없습니다'];

// WasteData 타입을 재내보내기
export type { WasteData } from '../types/types';
