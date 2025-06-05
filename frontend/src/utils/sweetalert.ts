import Swal from 'sweetalert2';

// 모든 SweetAlert 팝업에 적용할 공통 스타일 설정
const commonCustomClasses = {
  container: '', // 배경 오버레이
  popup: 'rounded-3xl', // 팝업 컨테이너
  header: '',
  title: '',
  closeButton: '',
  icon: '',
  image: '',
  content: '',
  htmlContainer: '',
  input: '',
  inputLabel: '',
  validationMessage: '',
  actions: '',
  confirmButton: '',
  denyButton: '',
  cancelButton: '',
  loader: '',
  footer: '',
};

// 성공 알림
export const showSuccessAlert = (title: string, text?: string) => {
  return Swal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonText: '확인',
    confirmButtonColor: '#3085d6',
    customClass: commonCustomClasses,
  });
};

// 에러 알림
export const showErrorAlert = (title: string, text?: string) => {
  return Swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonText: '확인',
    confirmButtonColor: '#d33',
    customClass: commonCustomClasses,
  });
};

// 경고 알림
export const showWarningAlert = (title: string, text?: string) => {
  return Swal.fire({
    title,
    text,
    icon: 'warning',
    confirmButtonText: '확인',
    confirmButtonColor: '#f8bb86',
    customClass: commonCustomClasses,
  });
};

// 정보 알림
export const showInfoAlert = (title: string, text?: string) => {
  return Swal.fire({
    title,
    text,
    icon: 'info',
    confirmButtonText: '확인',
    confirmButtonColor: '#3fc3ee',
    customClass: commonCustomClasses,
  });
};

// 확인 대화상자
export const showConfirmAlert = (
  title: string,
  text: string,
  confirmButtonText = '확인',
  cancelButtonText = '취소'
) => {
  return Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText,
    cancelButtonText,
    customClass: commonCustomClasses,
  });
};

// 입력 대화상자
export const showPromptAlert = (
  title: string,
  inputPlaceholder: string,
  inputValidator?: (value: string) => string | null
) => {
  return Swal.fire({
    title,
    input: 'text',
    inputPlaceholder,
    showCancelButton: true,
    confirmButtonText: '확인',
    cancelButtonText: '취소',
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    inputValidator,
    customClass: commonCustomClasses,
  });
};

// 토스트 알림 (짧은 알림)
export const showToast = (
  title: string,
  icon: 'success' | 'error' | 'warning' | 'info' = 'success'
) => {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
    customClass: commonCustomClasses,
  });

  return Toast.fire({
    icon,
    title,
  });
};
