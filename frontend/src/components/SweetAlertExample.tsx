import React from 'react';
import {
  showSuccessAlert,
  showErrorAlert,
  showWarningAlert,
  showInfoAlert,
  showConfirmAlert,
  showPromptAlert,
  showToast,
} from '../utils/sweetalert';

const SweetAlertExample: React.FC = () => {
  // 성공 알림 보여주기
  const handleShowSuccess = () => {
    showSuccessAlert('성공!', '작업이 성공적으로 완료되었습니다.');
  };

  // 오류 알림 보여주기
  const handleShowError = () => {
    showErrorAlert('오류 발생!', '작업 중 오류가 발생했습니다.');
  };

  // 경고 알림 보여주기
  const handleShowWarning = () => {
    showWarningAlert('주의!', '이 작업은 되돌릴 수 없습니다.');
  };

  // 정보 알림 보여주기
  const handleShowInfo = () => {
    showInfoAlert('알림', '새로운 메시지가 도착했습니다.');
  };

  // 확인 대화상자 보여주기
  const handleShowConfirm = async () => {
    const result = await showConfirmAlert(
      '정말 삭제하시겠습니까?',
      '이 작업은 되돌릴 수 없습니다.',
      '네, 삭제합니다',
      '아니오'
    );

    if (result.isConfirmed) {
      showSuccessAlert('삭제 완료', '항목이 성공적으로 삭제되었습니다.');
    }
  };

  // 입력 대화상자 보여주기
  const handleShowPrompt = async () => {
    const result = await showPromptAlert('이름을 입력하세요', '홍길동', (value) => {
      if (!value) {
        return '이름을 입력해주세요';
      }
      return null;
    });

    if (result.isConfirmed) {
      showSuccessAlert('환영합니다!', `안녕하세요, ${result.value}님!`);
    }
  };

  // 토스트 알림 보여주기
  const handleShowToast = () => {
    showToast('설정이 저장되었습니다');
  };

  // 커스텀 알림 보여주기 (직접 Swal 사용)
  const handleShowCustom = () => {
    import('sweetalert2').then(({ default: Swal }) => {
      Swal.fire({
        title: '커스텀 알림',
        html: '<div style="color: blue;">HTML 콘텐츠도 지원합니다</div>',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: '좋아요!',
        cancelButtonText: '닫기',
        footer:
          '<a href="https://sweetalert2.github.io/" target="_blank">SweetAlert2 문서 보기</a>',
      });
    });
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-4">SweetAlert2 예제</h2>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleShowSuccess}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          성공 알림
        </button>
        <button
          onClick={handleShowError}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          오류 알림
        </button>
        <button
          onClick={handleShowWarning}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          경고 알림
        </button>
        <button
          onClick={handleShowInfo}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          정보 알림
        </button>
        <button
          onClick={handleShowConfirm}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          확인 대화상자
        </button>
        <button
          onClick={handleShowPrompt}
          className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
        >
          입력 대화상자
        </button>
        <button
          onClick={handleShowToast}
          className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600"
        >
          토스트 알림
        </button>
        <button
          onClick={handleShowCustom}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          커스텀 알림
        </button>
      </div>
    </div>
  );
};

export default SweetAlertExample;
