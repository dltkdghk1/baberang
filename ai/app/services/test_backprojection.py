import cv2
import numpy as np
import matplotlib.pyplot as plt
from custom_model import back_projection
import os

def test_backprojection(target_path, reference_path, 
                       use_channels=(0,1),        # (H,S) 채널 선택
                       hist_bins=(180,256),       # 히스토그램 bin 수
                       blur_kernel=5,             # 디스크 지름
                       thresh=50,                 # 임계값
                       morph_op=None,             # 모폴로지 연산 종류
                       morph_kernel=5,            # 모폴로지 커널 크기
                       morph_iter=1,              # 모폴로지 반복 횟수
                       min_size=500,              # 작은 객체 최소 크기
                       use_specular_mask=False,   # 반사광 마스크 사용 여부
                       specular_v_thresh=220,     # V 임계값
                       specular_s_thresh=40,      # S 임계값
                       use_percentile=False,      # percentile 방식 사용 여부
                       food_percent=70,           # 음식 상위 퍼센트
                       use_otsu=False,            # Otsu 방식 사용 여부
                       use_triangle=False,        # Triangle 방식 사용 여부
                       save_path=None):           # 저장 경로
    """역투영 알고리즘 테스트"""
    
    # 이미지 로드
    target_img = cv2.imread(target_path)
    reference_img = cv2.imread(reference_path)
    
    if target_img is None or reference_img is None:
        print(f"이미지를 로드할 수 없습니다.")
        print(f"target_path: {target_path}")
        print(f"reference_path: {reference_path}")
        return
    
    # 역투영 수행
    proportion, result_img, food_mask = back_projection(
        target_img, reference_img,
        use_channels=use_channels,
        hist_bins=hist_bins,
        blur_kernel=blur_kernel,
        thresh=thresh,
        morph_op=morph_op,
        morph_kernel=morph_kernel,
        morph_iter=morph_iter,
        min_size=min_size,
        use_specular_mask=use_specular_mask,
        specular_v_thresh=specular_v_thresh,
        specular_s_thresh=specular_s_thresh,
        use_percentile=use_percentile,
        food_percent=food_percent,
        use_otsu=use_otsu,
        use_triangle=use_triangle
    )
    
    # 결과 시각화
    plt.figure(figsize=(15, 5))
    
    # 원본 이미지
    plt.subplot(131)
    plt.imshow(cv2.cvtColor(target_img, cv2.COLOR_BGR2RGB))
    plt.title('원본 이미지')
    plt.axis('off')
    
    # 참조 이미지
    plt.subplot(132)
    plt.imshow(cv2.cvtColor(reference_img, cv2.COLOR_BGR2RGB))
    plt.title('참조 이미지')
    plt.axis('off')
    
    # 역투영 결과
    plt.subplot(133)
    plt.imshow(cv2.cvtColor(result_img, cv2.COLOR_BGR2RGB))
    plt.title(f'역투영 결과 (음식량: {100-proportion:.1f}%)')
    plt.axis('off')
    
    # 파라미터 정보 표시
    param_text = f'파라미터:\n'
    param_text += f'채널: {use_channels}\n'
    param_text += f'히스토그램 bin: {hist_bins}\n'
    param_text += f'블러 커널: {blur_kernel}x{blur_kernel}\n'
    param_text += f'임계값: {thresh}\n'
    param_text += f'모폴로지: {morph_op}, {morph_kernel}x{morph_kernel}, {morph_iter}회\n'
    param_text += f'반사광 마스크: {"사용" if use_specular_mask else "미사용"}\n'
    param_text += f'V 임계값: {specular_v_thresh}\n'
    param_text += f'S 임계값: {specular_s_thresh}\n'
    param_text += f'Percentile 방식: {"사용" if use_percentile else "미사용"}\n'
    param_text += f'음식 상위 퍼센트: {food_percent}%'
    plt.figtext(0.5, 0.01, param_text, ha='center')
    
    plt.tight_layout()
    if save_path:
        plt.savefig(save_path)
        print(f"결과 이미지 저장: {save_path}")
        plt.close()
    else:
        plt.show()

if __name__ == '__main__':
    # 테스트할 이미지 경로 (절대 경로 사용)
    base_dir = r'C:\Users\lsh95\Desktop\S12P31E102\ai\app\test_images'
    target_path = os.path.join(base_dir, 'target5.jpg')
    reference_path = os.path.join(base_dir, 'tray_empty.jpg')
    
    # 저장 폴더 생성
    save_dir = os.path.join(base_dir, 'results')
    os.makedirs(save_dir, exist_ok=True)

    # # thresh 0~100 (10단위)
    # for thresh in range(0, 101, 10):
    #     save_path = os.path.join(save_dir, f'result_thresh{thresh}.png')
    #     test_backprojection(target_path, reference_path, thresh=thresh, save_path=save_path)

    # # blur_kernel 다양하게 (5, 7, 9)
    # for blur_kernel in [5, 7, 9]:
    #     save_path = os.path.join(save_dir, f'result_blur{blur_kernel}.png')
    #     test_backprojection(target_path, reference_path, blur_kernel=blur_kernel, save_path=save_path)

    # # 모폴로지 연산 다양하게
    # morph_ops = [None, 'close', 'open']
    # morph_iters = [1, 3]
    # for morph_op in morph_ops:
    #     for morph_iter in morph_iters:
    #         op_name = 'none' if morph_op is None else morph_op
    #         save_path = os.path.join(save_dir, f'result_morph_{op_name}{morph_iter}.png')
    #         test_backprojection(target_path, reference_path, morph_op=morph_op, morph_iter=morph_iter, save_path=save_path)

    # # morph_kernel(3, 5, 7, 9)와 morph_iter(1, 3) 조합별로 테스트
    # for morph_kernel in [3, 5, 7, 9]:
    #     for morph_iter in [1, 3]:
    #         save_path = os.path.join(save_dir, f'result_morphkernel{morph_kernel}_iter{morph_iter}.png')
    #         test_backprojection(
    #             target_path, reference_path,
    #             morph_kernel=morph_kernel,
    #             morph_iter=morph_iter,
    #             save_path=save_path
    #         )

    # 채널/히스토그램 bin 조합별로 저장 (thresh=95, morph_op='open')
    channel_combos = [
        ((0, 1), (180, 256)),   # H+S, 기본 bin
        ((0, 2), (180, 256)),   # H+V, 기본 bin
        ((1, 2), (180, 256)),   # S+V, 기본 bin
        ((0, 1), (90, 64)),     # H+S, bin 축소
        ((0, 2), (90, 64)),     # H+V, bin 축소
        ((1, 2), (90, 64)),     # S+V, bin 축소
    ]
    # for ch, bins in channel_combos:
    #     ch_name = ''.join(['HSV'[i] for i in ch])
    #     bin_name = f"{bins[0]}x{bins[1]}"
    #     save_path = os.path.join(save_dir, f'result_channel_{ch_name}_bin_{bin_name}_thresh95_open.png')
    #     test_backprojection(
    #         target_path, reference_path,
    #         use_channels=ch,
    #         hist_bins=bins,
    #         thresh=95,
    #         morph_op='open',
    #         save_path=save_path
    #     )

    # # 다양한 min_size 값 실험 (더 큰 값 포함)
    # for min_size in [100, 300, 500, 800, 1200, 1500, 2000, 3000, 5000, 10000]:
    #     save_path = os.path.join(save_dir, f'result_minsize{min_size}.png')
    #     test_backprojection(
    #         target_path, reference_path,
    #         min_size=min_size,
    #         save_path=save_path
    #     )

    # # 다양한 specular 마스크 조건 실험 (실제 데이터 기반)
    # v_thresh_list = [70, 90, 110, 130, 150, 170, 190]
    # s_thresh_list = [60, 80, 100, 120, 140, 160, 180]

    # for v_thresh in v_thresh_list:
    #     for s_thresh in s_thresh_list:
    #         save_path = os.path.join(save_dir, f'result_specular_V{v_thresh}_S{s_thresh}.png')
    #         test_backprojection(
    #             target_path, reference_path,
    #             use_specular_mask=True,
    #             specular_v_thresh=v_thresh,
    #             specular_s_thresh=s_thresh,
    #             save_path=save_path
    #         )

    # # specular 마스크만 바꿔가며 테스트 (채널 H+S, morph_open3, thresh 98 고정, V/S 임계값 낮춤)
    # v_thresh_list = [90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220]
    # s_thresh_list = [70, 90, 110, 130, 150, 170]

    # for v_thresh in v_thresh_list:
    #     for s_thresh in s_thresh_list:
    #         save_path = os.path.join(
    #             save_dir, f'result_HS_open3_thresh98_specular_V{v_thresh}_S{s_thresh}.png'
    #         )
    #         test_backprojection(
    #             target_path, reference_path,
    #             use_channels=(0,1),
    #             morph_op='open',
    #             morph_iter=3,
    #             thresh=98,
    #             use_specular_mask=True,
    #             specular_v_thresh=v_thresh,
    #             specular_s_thresh=s_thresh,
    #             save_path=save_path
    #         )

    # percentile 방식 food_percent 0~100까지 실험
    for food_percent in range(20, 101, 5):
        save_path = os.path.join(save_dir, f'result_percentile_{food_percent}.png')
        test_backprojection(
            target_path, reference_path,
            use_percentile=True,
            food_percent=food_percent,
            save_path=save_path
        )

    # Otsu 방식 결과 저장
    save_path = os.path.join(save_dir, 'result_otsu.png')
    test_backprojection(
        target_path, reference_path,
        use_otsu=True,
        save_path=save_path
    )

    # Triangle 방식 결과 저장
    save_path = os.path.join(save_dir, 'result_triangle.png')
    test_backprojection(
        target_path, reference_path,
        use_triangle=True,
        save_path=save_path
    )

