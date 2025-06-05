# 음식양추정/음식양추정/quantity_est/custom_model.py
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import cv2
from PIL import Image
import matplotlib.pyplot as plt
import os
import time
from datetime import datetime
import argparse
import re
from torchvision import transforms
import random
import onnxruntime as ort

# RNG 시드 고정
SEED = 42
random.seed(SEED)         # 파이썬 표준 RNG
np.random.seed(SEED)      # NumPy RNG
torch.manual_seed(SEED)   # PyTorch
cv2.setRNGSeed(SEED)      # OpenCV RNG

# 한글 폰트 설정
plt.rcParams['font.family'] = 'Malgun Gothic'  # 윈도우 기본 한글 폰트
plt.rcParams['axes.unicode_minus'] = False     # 마이너스 기호 깨짐 방지

# 모델 관련 임포트
from torchvision import transforms, models

def remove_small_objects(mask, min_size=500):
    """
    이진 마스크에서 작은 객체(connected component)를 제거
    mask: 2D bool or 0/1 np.ndarray
    min_size: 남길 최소 픽셀 수
    return: 작은 객체가 제거된 마스크
    """
    mask_uint8 = (mask.astype(np.uint8)) * 255
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask_uint8, connectivity=8)
    cleaned_mask = np.zeros_like(mask_uint8)
    for i in range(1, num_labels):  # 0은 배경
        if stats[i, cv2.CC_STAT_AREA] >= min_size:
            cleaned_mask[labels == i] = 255
    return cleaned_mask > 0

# 역투영 알고리즘 함수
def back_projection(
    target_img, reference_img,
    use_channels=(0, 1),        # HSV 채널 선택 (기본값: H+S)
    hist_bins=(180, 256),       # 히스토그램 bin 수 (기본값: 180x256)
    blur_kernel=5,              # 블러 커널 크기 (기본값: 5)
    thresh=50,                  # 임계값 (기본값: 50)
    morph_op=None,              # 모폴로지 연산 (기본값: 없음)
    morph_kernel=5,             # 모폴로지 커널 크기 (기본값: 5)
    morph_iter=1,               # 모폴로지 반복 횟수 (기본값: 1)
    min_size=500,
    use_specular_mask=False,           # 반사광 마스크 사용 여부
    specular_v_thresh=220,             # V 임계값
    specular_s_thresh=40,              # S 임계값
    use_percentile=False,           # percentile 방식 사용 여부
    food_percent=70,                 # 음식으로 인식할 상위 퍼센트(%)
    use_otsu=False,              # Otsu 방식 사용 여부
    use_triangle=False           # Triangle 방식 사용 여부
):
    """역투영 알고리즘 (파라미터 튜닝 지원, 기본값은 기존과 동일)"""
    # 1. HSV 변환
    hsv_t = cv2.cvtColor(target_img, cv2.COLOR_BGR2HSV)
    hsv_r = cv2.cvtColor(reference_img, cv2.COLOR_BGR2HSV)

    # 2. 선택 채널만 추출
    ch_idx = list(use_channels)
    hist_size = [hist_bins[0] if 0 in ch_idx else 1, hist_bins[1] if 1 in ch_idx else 1]
    ranges = [0, 180, 0, 256]
    roi_hist = cv2.calcHist([hsv_r], ch_idx, None, hist_size, ranges)
    cv2.normalize(roi_hist, roi_hist, 0, 255, cv2.NORM_MINMAX)

    # 3. 역투영
    dst = cv2.calcBackProject([hsv_t], ch_idx, roi_hist, ranges, 1)

    # 4. blur
    disc = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (blur_kernel, blur_kernel))
    cv2.filter2D(dst, -1, disc, dst)

    # 5. 임계값 적용
    if use_otsu:
        _, mask = cv2.threshold(dst, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    elif use_percentile:
        percentile = 100 - food_percent
        T = np.percentile(dst, percentile)
        _, mask = cv2.threshold(dst, T, 255, cv2.THRESH_BINARY)
    else:
        _, mask = cv2.threshold(dst, thresh, 255, 0)

    # 6. 모폴로지 연산 (선택적)
    mask = mask
    if morph_op == 'close':
        k = np.ones((morph_kernel, morph_kernel), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k, iterations=morph_iter)
    elif morph_op == 'open':
        k = np.ones((morph_kernel, morph_kernel), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, k, iterations=morph_iter)

    # 7. 음식 마스크 (0이 음식)
    mask_bool = (mask == 0)
    mask_bool = remove_small_objects(mask_bool, min_size=min_size)
    # 반사광 마스크 적용
    if use_specular_mask:
        hsv = cv2.cvtColor(target_img, cv2.COLOR_BGR2HSV)
        specular_mask = (hsv[:,:,2] > specular_v_thresh) & (hsv[:,:,1] < specular_s_thresh)
        mask_bool = mask_bool & (~specular_mask)
    mask_for_bitwise = (~mask_bool).astype(np.uint8) * 255  # 반전
    result_img = cv2.bitwise_and(target_img, target_img, mask=mask_for_bitwise)

    # 8. 잔반 비율 계산 (검은색 픽셀 비율)
    h, w = result_img.shape[:2]
    black_ratio = mask_bool.mean() * 100
    return black_ratio, result_img, ~mask_bool

def preprocess_image_for_midas(img: np.ndarray) -> np.ndarray:
    """MiDaS 모델을 위한 이미지 전처리 (256x256 고정 크기)"""
    h, w = img.shape[:2]
    scale = 256 / max(h, w)  # 384 -> 256으로 변경
    img = cv2.resize(img, (int(w*scale), int(h*scale)))
    # 검정 패딩으로 256×256
    square = np.zeros((256, 256, 3), np.uint8)  # 384 -> 256으로 변경
    y, x = (256-img.shape[0])//2, (256-img.shape[1])//2
    square[y:y+img.shape[0], x:x+img.shape[1]] = img
    return square

def load_midas_model(device='cpu'):
    """MiDaS 깊이 추정 모델 로드"""
    try:
        print("MiDaS DPT_Large 모델 로드 중...")
        midas = torch.hub.load("intel-isl/MiDaS", "DPT_Large")
        midas.to(device)
        midas.eval()
        
        # 새로운 transform 설정 (정규화만 수행)
        midas_transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
        ])
        
        return midas, midas_transform
    except Exception as e:
        print(f"MiDaS 모델 로드 중 오류 발생: {e}")
        return None, None

def predict_depth(image, midas_model, midas_transform, device='cpu', roi_mask=None, slot_name=None):
    """MiDaS로 깊이 맵 생성 및 깊이 가중치 적용"""
    if midas_model is None or midas_transform is None:
        return None, 0, None, 0, None, None
    
    # 이미지 변환
    if isinstance(image, np.ndarray):
        img = image
    else:
        img = np.array(image)
    
    # 이미지가 RGBA인 경우 RGB로 변환
    if len(img.shape) > 2 and img.shape[2] == 4:
        img = cv2.cvtColor(img, cv2.COLOR_RGBA2RGB)
    
    # 원본 이미지 크기 저장
    original_h, original_w = img.shape[:2]
    
    # MiDaS 입력을 위한 전처리
    img_proc = preprocess_image_for_midas(img)
    input_batch = midas_transform(img_proc).unsqueeze(0)
    
    # ONNX Runtime 또는 PyTorch 모델로 예측
    if isinstance(midas_model, ort.InferenceSession):
        # ONNX Runtime 사용
        input_name = midas_model.get_inputs()[0].name
        output_name = midas_model.get_outputs()[0].name
        # 입력 텐서를 numpy 배열로 변환
        input_data = input_batch.numpy()
        prediction = midas_model.run([output_name], {input_name: input_data})[0]
        prediction = torch.from_numpy(prediction)
    else:
        # PyTorch 모델 사용
        input_batch = input_batch.to(device)
        with torch.no_grad():
            prediction = midas_model(input_batch)
    
    # 깊이 맵 크기 조정 (더 빠른 보간법 사용)
    prediction = torch.nn.functional.interpolate(
        prediction.unsqueeze(1),
        size=(original_h, original_w),
        mode="bilinear",  # bicubic -> bilinear로 변경
        align_corners=False,
    ).squeeze()
    
    # CPU로 이동 및 넘파이 배열로 변환
    depth_map = prediction.cpu().numpy()
    
    # 정규화
    depth_min = depth_map.min()
    depth_max = depth_map.max()
    if depth_max - depth_min > 0:
        depth_map = (depth_map - depth_min) / (depth_max - depth_min)
    
    # 깊이 맵에서 음식 부피 추정 및 깊이 가중치 적용 비율 계산
    volume_estimate, food_mask, weighted_ratio, food_volume_cm3, z_plane, z_plane_source = estimate_volume_from_depth_with_weight(depth_map, roi_mask, slot_name)
    
    return depth_map, weighted_ratio, food_mask, food_volume_cm3, z_plane, z_plane_source

# 칸별 실제 크기(cm) 및 해상도
# 배포환경용용
TRAY_SLOTS = {
    "side1": {"w": 9.0, "h": 11.0, "nx": 724, "ny": 730, "z_plane": 0.420},
    "side2": {"w": 9.0, "h": 11.0, "nx": 726, "ny": 730, "z_plane": 0.416},
    "main":  {"w": 15.0, "h": 11.0, "nx": 854, "ny": 730, "z_plane": 0.444},
    "rice":  {"w": 17.2, "h": 15.0, "nx": 1224, "ny": 998, "z_plane": 0.350},
    "soup":  {"w": 15.0, "h": 15.0, "nx": 1080, "ny": 998},
}
# 개발환경용    
# TRAY_SLOTS = {
#     "side1": {"w": 9.0, "h": 11.0, "nx": 1053, "ny": 1282, "z_plane": 0.420},
#     "side2": {"w": 9.0, "h": 11.0, "nx": 1062, "ny": 1247, "z_plane": 0.416},
#     "main":  {"w": 15.0, "h": 11.0, "nx": 1653, "ny": 1265, "z_plane": 0.444},
#     "rice":  {"w": 17.2, "h": 15.0, "nx": 2019, "ny": 1727, "z_plane": 0.350},
#     "soup":  {"w": 15.0, "h": 15.0, "nx": 1777, "ny": 1716},  # 필요시 soup도 추가
# }

def estimate_volume_from_depth_with_weight(depth_map, roi_mask=None, slot_name=None):
    print(f"[DEBUG] estimate_volume_from_depth_with_weight: slot_name={slot_name}")
    if roi_mask is None or roi_mask.mean() < 0.01:
        return estimate_volume_from_depth_with_weight_old(depth_map)

    # 1. food_mask 보강 (팽창)
    food_mask = roi_mask.astype(np.uint8)
    food_mask = food_mask > 0

    # 2. z_plane 계산 안정화 (음식 주변 5px 제외)
    tray_mask = ~food_mask.astype(bool)

    # 음식/트레이 영역별 복사본 생성
    depth_tray = depth_map.copy()
    depth_food = depth_map.copy()
    depth_food[~food_mask] = np.nan  # 음식 마스크가 True인 부분만 남김
    depth_tray[food_mask] = np.nan

    # 트레이 평균 깊이(z_plane) 계산 보강
    if slot_name in TRAY_SLOTS and "z_plane" in TRAY_SLOTS[slot_name]:
        z_plane = TRAY_SLOTS[slot_name]["z_plane"]
        z_plane_source = 'fixed_empty'
    elif np.sum(tray_mask) > 0.05 * tray_mask.size:
        z_plane = np.nanmean(depth_tray[tray_mask])
        z_plane_source = 'tray_mask'
    else:
        try:
            depth_map_empty = np.load('ai/depth_map_empty.npy')
            z_plane = np.nanmean(depth_map_empty)
            z_plane_source = 'empty_plate'
        except Exception:
            z_plane = np.nanmean(depth_tray)
            z_plane_source = 'fallback'

    # ΔZ (음식 높이)
    dz = np.maximum(0, depth_map - z_plane)

    # 3. ΔZ(cm) 컷오프 적용
    try:
        scale_cm_per_unit = np.load('midas_scale.npy')
    except Exception:
        scale_cm_per_unit = 3.0  # fallback: 기존 H_CM
    dz_cm = dz * scale_cm_per_unit * 2 # 음식 깊이 80배로 반영
    dz_cutoff = 0.002  # 0.002cm 이상만 음식으로 인정 (하한)
    dz_upper = 3.0   # 2.0cm 이하만 음식으로 인정 (상한, 필요시 조정)
    # 음식 마스크가 True인 부분만 부피 계산
    food_mask_final = food_mask & ((dz_cm > dz_cutoff) & (dz_cm < dz_upper))

    # 평균 높이 (dz_cm>0 영역)
    valid_h = dz_cm[food_mask_final]
    avg_h_cm = np.nanmean(valid_h) if valid_h.size else 0

    # slot_name에 따라 W_CM, L_CM, NX, NY 적용
    if slot_name in TRAY_SLOTS:
        slot = TRAY_SLOTS[slot_name]
        W_CM, L_CM = slot["w"], slot["h"]
        NX, NY = slot["nx"], slot["ny"]
    else:
        W_CM, L_CM, NX, NY = 37.5, 29.0, 2592, 1944  # 전체 식판 기본값
    H_CM = 3.0
    PIX_AREA = (W_CM / NX) * (L_CM / NY)
    food_pixel_count = np.sum(food_mask_final)
    food_area_cm2 = food_pixel_count * PIX_AREA
    food_volume_cm3 = food_area_cm2 * avg_h_cm * 30

    # 비율(%)도 보정
    volume_pct = min(60, (food_pixel_count / (NX*NY)) * (avg_h_cm / H_CM) * 100)
    return volume_pct, food_mask_final, volume_pct, food_volume_cm3, z_plane, z_plane_source

def estimate_volume_from_depth_with_weight_old(depth_map):
    """기존 K-means 기반 부피 추정 방식 (fallback용)"""
    # 깊이 맵을 1차원 배열로 변환
    depth_flat = depth_map.flatten().reshape(-1, 1).astype(np.float32)
    
    # K-means 클러스터링으로 깊이 값을 2개 그룹으로 분류
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    _, labels, centers = cv2.kmeans(depth_flat, 2, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
    
    # 두 클러스터의 중심값 확인
    center_0 = centers[0][0]
    center_1 = centers[1][0]
    
    # 클러스터 크기 계산
    cluster_0_size = np.sum(labels == 0)
    cluster_1_size = np.sum(labels == 1)
    cluster_0_ratio = cluster_0_size / len(labels)
    cluster_1_ratio = cluster_1_size / len(labels)
    
    # 음식 클러스터 선택
    MIN_CLUSTER_RATIO = 0.05
    if center_0 < center_1:
        if cluster_0_ratio > MIN_CLUSTER_RATIO:
            food_cluster = 0
        else:
            food_cluster = 1
    else:
        if cluster_1_ratio > MIN_CLUSTER_RATIO:
            food_cluster = 1
        else:
            food_cluster = 0
    
    # 마스크 생성
    labels = labels.reshape(depth_map.shape)
    food_mask = labels == food_cluster
    
    # 마스크 정제
    kernel = np.ones((5, 5), np.uint8)
    food_mask = food_mask.astype(np.uint8) * 255
    food_mask = cv2.morphologyEx(food_mask, cv2.MORPH_CLOSE, kernel)
    food_mask = cv2.morphologyEx(food_mask, cv2.MORPH_OPEN, kernel)
    food_mask = food_mask > 0
    
    # 음식 영역의 깊이 통계 계산
    masked_depth = depth_map.copy()
    masked_depth[~food_mask] = np.nan
    
    # 평균 깊이 계산
    avg_depth = np.nanmean(masked_depth) if np.sum(food_mask) > 0 else 0
    
    # 음식 영역 비율
    food_ratio = np.sum(food_mask) / depth_map.size
    
    # 부피 추정
    volume_estimate = min(100, food_ratio * 100)
    
    z_plane = np.nanmean(depth_map)
    z_plane_source = 'fallback'
    return volume_estimate, food_mask, volume_estimate, 0, z_plane, z_plane_source

# ResNet 모델 로드 및 예측 함수
def load_resnet_model(weights_path, device='cpu'):
    """사전 훈련된 ResNet 모델 로드"""
    try:
        # 절대 경로로 변환
        abs_weights_path = os.path.abspath(weights_path)
        if not os.path.exists(abs_weights_path):
            print(f"가중치 파일을 찾을 수 없습니다: {abs_weights_path}")
            raise FileNotFoundError(f"가중치 파일을 찾을 수 없습니다: {abs_weights_path}")
            
        checkpoint = torch.load(abs_weights_path, map_location=device, weights_only=False)
        model = checkpoint['model_ft']
        model.load_state_dict(checkpoint['state_dict'], strict=False)
        
        # 평가 모드로 설정
        model.to(device)
        model.eval()
        
        return model
    except Exception as e:
        print(f"ResNet 모델 로드 중 오류 발생: {e}")
        # 오류 발생 시 응급 처치로 사전 훈련된 모델 사용
        try:
            print("사전 훈련된 ResNet50 모델을 대체로 사용합니다...")
            model = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)
            # 마지막 레이어 수정 (5개 클래스: Q1-Q5)
            num_ftrs = model.fc.in_features
            model.fc = nn.Linear(num_ftrs, 5)
            model.to(device)
            model.eval()
            return model
        except Exception as e2:
            print(f"대체 모델 로드 실패: {e2}")
            return None

def predict_resnet(image, model, device='cpu'):
    """ResNet 모델로 음식량 예측"""
    if model is None:
        return None, None, None
    
    # 이미지 전처리
    preprocess = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    
    # PIL 이미지로 변환
    if isinstance(image, np.ndarray):
        image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    
    # 텐서로 변환
    img_tensor = preprocess(image).unsqueeze(0)
    
    # ONNX Runtime 또는 PyTorch 모델로 예측
    if isinstance(model, ort.InferenceSession):
        # ONNX Runtime 사용
        input_name = model.get_inputs()[0].name
        output_name = model.get_outputs()[0].name
        # 입력 텐서를 numpy 배열로 변환
        input_data = img_tensor.numpy()
        outputs = model.run([output_name], {input_name: input_data})[0]
        probs = F.softmax(torch.from_numpy(outputs), dim=1)
    else:
        # PyTorch 모델 사용
        img_tensor = img_tensor.to(device)
        with torch.no_grad():
            outputs = model(img_tensor)
            probs = F.softmax(outputs, dim=1)
    
    # 결과 추출
    probs = probs.cpu().numpy().squeeze()
    class_idx = np.argmax(probs)
    
    # 클래스 이름과 확률
    class_names = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5']
    class_name = class_names[class_idx]
    
    # 새로운 스케일로 변환 (Q1:10%, Q2:30%, Q3:50%, Q4:70%, Q5:90%)
    resnet_percentage = {
        'Q1': 10.0,
        'Q2': 30.0,
        'Q3': 50.0,
        'Q4': 70.0,
        'Q5': 90.0
    }
    percentage = resnet_percentage[class_name]
    
    return class_name, probs[class_idx], percentage

# 새로운 가중치 조정 함수
def adjust_weights(backproj_result, resnet_result=None):
    """
    역투영 결과와 ResNet 결과에 따라 가중치 조정
    Args:
        backproj_result: 역투영 결과 (검은색 픽셀 비율 %)
        resnet_result: ResNet 결과 (클래스, 확률, 백분율) (옵션)
    Returns:
        weights: 조정된 가중치 (역투영, MiDaS, ResNet)
    """
    backproj_score = 100 - backproj_result

    # 1. 역투영 점수 0~20%면 최우선
    if 0 <= backproj_score <= 20:
        return (1.0, 0.0, 0.0)
    # 2. ResNet 확률이 80% 이상이면
    if resnet_result is not None:
        _, resnet_prob, _ = resnet_result
        if resnet_prob >= 0.8:
            return (0.3, 0.0, 0.7)
    # 3. 기본 가중치
    return (0.5, 0.3, 0.2)

# 새로운 결과 융합 함수
def combine_results_custom(backproj_result, midas_result, resnet_result, weights):
    """
    세 모델의 결과를 가중치에 따라 융합 (사용자 정의 방식)
    
    Args:
        backproj_result: 역투영 결과 (검은색 픽셀 비율 %)
        midas_result: MiDaS 결과 (볼륨 추정값)
        resnet_result: ResNet 결과 (클래스, 확률, 백분율)
        weights: 각 모델의 가중치 (역투영, MiDaS, ResNet)
    
    Returns:
        final_percentage: 최종 음식량 백분율
        confidence: 신뢰도
        details: 상세 정보
    """
    # 가중치 정규화
    w_sum = sum(weights)
    w_backproj, w_midas, w_resnet = [w/w_sum for w in weights]
    
    # ResNet 결과 추출
    resnet_class, resnet_prob, resnet_percentage = resnet_result
    
    # 역투영 결과 정규화 (0-100%)
    backproj_score = 100 - backproj_result
    
    # MiDaS 결과 정규화 (0-100으로 스케일링, 그대로 사용)
    # 과대평가 방지를 위해 스케일링 팩터 조정 (이전: 2.0 -> 현재: 1.0)
    midas_percentage = min(100, midas_result)
    
    # 가중 평균 계산
    weighted_percentage = (w_backproj * backproj_score + 
                         w_midas * midas_percentage + 
                         w_resnet * resnet_percentage)
    
    # 신뢰도 계산 (각 모델의 예측이 얼마나 일치하는지)
    score_diffs = [
        abs(backproj_score - weighted_percentage),
        abs(midas_percentage - weighted_percentage) if w_midas > 0 else 0,
        abs(resnet_percentage - weighted_percentage)
    ]
    score_diffs = [diff for diff in score_diffs if diff != 0]  # 0 가중치 모델은 제외
    avg_diff = sum(score_diffs) / len(score_diffs) if score_diffs else 0
    confidence = max(0, 100 - avg_diff) / 100  # 0-1 범위의 신뢰도
    
    # 상세 정보
    details = {
        'backproj_percentage': backproj_score,
        'midas_percentage': midas_percentage,
        'resnet_percentage': resnet_percentage,
        'weighted_percentage': weighted_percentage,
        'weights': {'backproj': w_backproj, 'midas': w_midas, 'resnet': w_resnet}
    }
    
    return weighted_percentage, confidence, details

# 결과 시각화 함수 (수정됨)
def visualize_results_custom(image, backproj_img, depth_map, depth_mask,
                             backproj_result, midas_result, resnet_result,
                             final_result, weights, output_path=None, food_volume_cm3=None, relative_volume_pct=None,
                             z_plane=None, z_plane_source=None):
    """세 모델의 결과를 새로운 방식으로 시각화"""
    fig, axs = plt.subplots(2, 3, figsize=(15, 10))
    
    # 원본 이미지
    axs[0, 0].imshow(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    axs[0, 0].set_title('원본 이미지')
    axs[0, 0].axis('off')
    
    # 역투영 결과
    axs[0, 1].imshow(cv2.cvtColor(backproj_img, cv2.COLOR_BGR2RGB))
    # 역투영 점수 계산 (0-100%)
    backproj_score = 100 - backproj_result
    axs[0, 1].set_title(f'역투영 결과 (음식량: {backproj_score:.1f}%)')
    axs[0, 1].axis('off')
    
    # 깊이 맵과 마스크
    if depth_map is not None:
        # (추가) 식판 바닥 기준 정규화
        tray_mask = ~depth_mask.astype(bool)
        tray_depth = depth_map[tray_mask].mean() if np.any(tray_mask) else depth_map.mean()
        norm_depth_map = depth_map - tray_depth
        vmin = 0
        vmax = np.percentile(norm_depth_map, 99)

        # 깊이맵을 컬러맵으로 변환 (plasma)
        plasma_cm = plt.cm.plasma
        plasma_norm = plt.Normalize(vmin=vmin, vmax=vmax)
        depth_colored = plasma_cm(plasma_norm(norm_depth_map))[:, :, :3]  # alpha 채널 제거
        depth_colored = (depth_colored * 255).astype(np.uint8)

        # ΔZ(깊이차) 맵 시각화 (viridis 컬러맵)
        try:
            scale_cm_per_unit = np.load('midas_scale.npy')
        except Exception:
            scale_cm_per_unit = 3.0  # fallback, 실제론 np.load('midas_scale.npy') 사용 가능
        dz = norm_depth_map * scale_cm_per_unit
        dz_vis = dz * 10  # 시각화용 10배

        im = axs[1, 2].imshow(dz_vis, cmap='viridis', vmin=0, vmax=2)  # vmax는 데이터 분포에 맞게 조정
        axs[1, 2].set_title('ΔZ(깊이차) 맵 [cm, x10(시각화)]')
        plt.colorbar(im, ax=axs[1, 2], fraction=0.046, pad=0.04)

        # ΔZ 통계 계산 (음식/식판 바닥)
        dz_food = dz[depth_mask]
        dz_tray = dz[tray_mask]
        def stat_str(arr):
            if arr.size == 0:
                return 'N/A'
            return f"평균 {np.nanmean(arr):.3f}, std {np.nanstd(arr):.3f}, min {np.nanmin(arr):.3f}, max {np.nanmax(arr):.3f}"
        dz_food_stat = stat_str(dz_food)
        dz_tray_stat = stat_str(dz_tray)

        # tray_mask(식판 바닥 마스크) 시각화 추가
        if tray_mask is not None:
            axs[1, 0].imshow(tray_mask, cmap='gray')
            axs[1, 0].set_title('식판 바닥 마스크(tray_mask)')
            axs[1, 0].axis('off')
        else:
            axs[1, 0].text(0.5, 0.5, 'tray_mask 없음', ha='center', va='center')
            axs[1, 0].axis('off')
    else:
        axs[0, 2].text(0.5, 0.5, '깊이 맵 없음', ha='center', va='center')
        axs[0, 2].axis('off')
    
    # ResNet 결과
    resnet_class, resnet_prob, resnet_percentage = resnet_result
    axs[1, 0].axis('off')
    axs[1, 0].text(0.5, 0.5, 
                 f'ResNet 예측: {resnet_class}\n'
                 f'확률: {resnet_prob*100:.1f}%\n'
                 f'음식량: {resnet_percentage:.1f}%', 
                 ha='center', va='center', fontsize=12)
    
    # 가중치 시각화
    w_backproj, w_midas, w_resnet = weights
    bars = axs[1, 1].bar(['역투영', 'MiDaS', 'ResNet'], 
                       [w_backproj, w_midas, w_resnet],
                       color=['#3498db', '#2ecc71', '#e74c3c'])
    axs[1, 1].set_title('모델 가중치')
    axs[1, 1].set_ylim(0, 1)
    
    # 가중치 값을 막대 위에 표시
    for bar in bars:
        height = bar.get_height()
        axs[1, 1].text(bar.get_x() + bar.get_width()/2., height + 0.02,
                     f'{height:.1f}', ha='center', va='bottom')
    
    # 최종 결과
    final_percentage, confidence, details = final_result
    axs[1, 2].axis('off')
    result_text = f'최종 음식량: {final_percentage:.1f}%\n'
    result_text += f'신뢰도: {confidence*100:.1f}%\n\n'
    result_text += f'역투영: {details["backproj_percentage"]:.1f}%\n'
    result_text += f'MiDaS: {details["midas_percentage"]:.1f}%\n'
    result_text += f'ResNet({resnet_class}): {details["resnet_percentage"]:.1f}%'
    if food_volume_cm3 is not None:
        result_text += f'\n실제 부피: {food_volume_cm3:.2f} cm³'
    if relative_volume_pct is not None:
        result_text += f'\n상대 부피: {relative_volume_pct:.1f}%'
    # z_plane 정보 추가
    if z_plane is not None and z_plane_source is not None:
        result_text += f'\nz_plane: {z_plane:.3f} ({z_plane_source})'
    result_text += f'\nΔZ(음식): {dz_food_stat}'
    result_text += f'\nΔZ(식판): {dz_tray_stat}'
    axs[1, 2].text(0.5, 0.5, result_text, ha='center', va='center', fontsize=12)
    
    plt.tight_layout()
    
    # 이미지 저장
    if output_path:
        plt.savefig(output_path)
        plt.close()
        return output_path
    else:
        return fig

def extract_slot_name(image_name):
    base = os.path.basename(image_name)
    match = re.search(r'(side_?1|side_?2|main|rice|soup)', base, re.IGNORECASE)
    if match:
        return match.group(1).replace('_', '').lower()
    return None

# 메인 분석 함수
def analyze_food_image_custom(target_image_path, reference_image_path, 
                             resnet_model, midas_model, midas_transform,
                             output_dir='./results', image_name=None):
    """
    세 모델을 사용하여 음식 이미지 분석 (사용자 정의 방식)
    """
    # 결과 디렉토리 생성
    # os.makedirs(output_dir, exist_ok=True)
    
    # 이미지 로드
    if isinstance(target_image_path, str):
        target_img = cv2.imread(target_image_path)
    else:
        target_img = target_image_path
        
    if isinstance(reference_image_path, str):
        reference_img = cv2.imread(reference_image_path)
    else:
        reference_img = reference_image_path
    
    if target_img is None or reference_img is None:
        return None
    
    # 1. 역투영 분석
    backproj_result, backproj_img, food_mask = back_projection(target_img, reference_img)
    # 참조 이미지(가득 찬 상태)에서 음식 마스크 추출
    _, _, ref_food_mask = back_projection(reference_img, reference_img)
    ref_food_pixel_count = np.sum(ref_food_mask)
    cur_food_pixel_count = np.sum(food_mask)
    # 상대 부피(%) 계산
    relative_volume_pct = (cur_food_pixel_count / ref_food_pixel_count) * 100 if ref_food_pixel_count > 0 else 0
    
    # slot_name 추출
    slot_name = extract_slot_name(image_name) if image_name else None
    
    # 2. MiDaS 깊이 분석
    if midas_model is not None and midas_transform is not None:
        depth_map, midas_result, depth_mask, food_volume_cm3, z_plane, z_plane_source = predict_depth(target_img, midas_model, midas_transform, roi_mask=food_mask, slot_name=slot_name)
    else:
        depth_map, midas_result, depth_mask, food_volume_cm3, z_plane, z_plane_source = None, 0, None, 0, None, None
    
    # 3. ResNet 분류
    if resnet_model is not None:
        resnet_result = predict_resnet(target_img, resnet_model)
    else:
        resnet_result = ('Q3', 0.5, 50.0)  # 기본값
    
    # 4. 역투영 결과에 따라 가중치 조정
    weights = adjust_weights(backproj_result, resnet_result)
    
    # 5. 결과 융합
    final_result = combine_results_custom(backproj_result, midas_result, resnet_result, weights)
    
    # 6. 결과 시각화 (주석 처리)
    # try:
    #     if image_name is not None:
    #         img_base = os.path.splitext(os.path.basename(image_name))[0]
    #     elif isinstance(target_image_path, str):
    #         img_name = os.path.basename(target_image_path)
    #         img_base = os.path.splitext(img_name)[0]
    #     else:
    #         img_base = "uploaded_image"
    # except Exception:
    #     img_base = "uploaded_image"
    
    # 시각화 결과 저장 (주석 처리)
    # viz_path = os.path.join(output_dir, f"{img_base}_analysis.png")
    # visualize_results_custom(
    #     target_img, backproj_img, depth_map, depth_mask,
    #     backproj_result, midas_result, resnet_result,
    #     final_result, weights, viz_path, food_volume_cm3, relative_volume_pct,
    #     z_plane=z_plane, z_plane_source=z_plane_source
    # )
    
    # 결과 정리
    final_percentage, confidence, details = final_result
    result_dict = {
        'image_path': target_image_path,
        'backproj_result': backproj_result,
        'backproj_percentage': details['backproj_percentage'],
        'midas_result': midas_result,
        'midas_percentage': details['midas_percentage'],
        'resnet_result': resnet_result,
        'weights': weights,
        'final_percentage': final_percentage,
        'confidence': confidence,
        'details': details,
        'food_volume_cm3': food_volume_cm3,
        'relative_volume_pct': relative_volume_pct
    }
    
    return result_dict

# 메인 함수
def main():
    parser = argparse.ArgumentParser(description='사용자 정의 음식량 추정 시스템')
    parser.add_argument('--target', type=str, required=True, help='분석할 대상 이미지 경로')
    parser.add_argument('--reference', type=str, required=True, help='참조 이미지 경로 (깨끗한 음식)')
    parser.add_argument('--weights', type=str, default='./weights/new_opencv_ckpt_b84_e200.pth', help='ResNet 모델 가중치 경로')
    parser.add_argument('--output', type=str, default='./results', help='결과 저장 디렉토리')
    parser.add_argument('--no-midas', action='store_true', help='MiDaS 모델 사용 안함')
    
    args = parser.parse_args()
    
    # 장치 설정
    device = torch.device("cpu")
    print(f"사용 중인 장치: {device}")
    
    # 모델 로드
    print("ResNet 모델 로드 중...")
    resnet_model = load_resnet_model(args.weights, device)
    
    # MiDaS 모델 로드 (옵션)
    midas_model, midas_transform = None, None
    if not args.no_midas:
        print("MiDaS 모델 로드 중...")
        midas_model, midas_transform = load_midas_model(device)
    
    # 시작 시간
    start_time = time.time()
    print(f"\n분석 시작: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 이미지 분석
    result = analyze_food_image_custom(
        args.target, args.reference,
        resnet_model, midas_model, midas_transform,
        args.output
    )
    
    # 결과 출력
    if result:
        backproj_score = 100 - result['backproj_result']
        resnet_class, resnet_prob, resnet_percentage = result['resnet_result']
        w_backproj, w_midas, w_resnet = result['weights']
        
        print("\n=== 음식량 분석 결과 ===")
        print(f"역투영 음식량: {backproj_score:.1f}% (가중치: {w_backproj:.1f})")
        
        midas_percentage = result['midas_percentage']
        if w_midas > 0:
            print(f"MiDaS 음식량: {midas_percentage:.1f}% (가중치: {w_midas:.1f})")
        else:
            print("MiDaS 모델: 사용 안함 (가중치: 0.0)")
        
        print(f"ResNet 예측: {resnet_class} (확률: {resnet_prob*100:.1f}%, 음식량: {resnet_percentage:.1f}%, 가중치: {w_resnet:.1f})")
        print("-" * 50)
        print(f"최종 음식량: {result['final_percentage']:.1f}% (신뢰도: {result['confidence']*100:.1f}%)")
        print(f"실제 부피: {result['food_volume_cm3']:.2f} cm³")
        print(f"상대 부피: {result['relative_volume_pct']:.1f}%")
        # print(f"시각화 파일: {result['visualization_path']}")
    
    # 종료 시간
    end_time = time.time()
    elapsed_time = end_time - start_time
    print("\n===============================================================")
    print(f"종료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"총 실행 시간: {elapsed_time:.2f}초")

if __name__ == '__main__':
    main() 