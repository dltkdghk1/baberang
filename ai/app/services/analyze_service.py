import time
from typing import Dict, Any, List
import aiohttp
import random
import boto3
import os
import asyncio
from concurrent.futures import ProcessPoolExecutor
from ..config import settings
import requests
import cv2
import numpy as np
from .custom_model import analyze_food_image_custom, load_resnet_model, load_midas_model, preprocess_image_for_midas
import torch
import onnx
import onnxruntime as ort
from torch.onnx import export

# RNG 시드 고정
SEED = 42
random.seed(SEED)         # 파이썬 표준 RNG
np.random.seed(SEED)      # NumPy RNG
torch.manual_seed(SEED)   # PyTorch
cv2.setRNGSeed(SEED)      # OpenCV RNG

# 전역 모델 레퍼런스
_WORKER_RESNET = None
_WORKER_MIDAS = None
_WORKER_TRANSFORM = None
_WORKER_RESNET_SESSION = None
_WORKER_MIDAS_SESSION = None

def convert_to_onnx(model, dummy_input, output_path):
    """PyTorch 모델을 ONNX 형식으로 변환"""
    try:
        export(
            model,
            dummy_input,
            output_path,
            export_params=True,
            opset_version=12,
            do_constant_folding=True,
            input_names=['input'],
            output_names=['output'],
            dynamic_axes={'input': {0: 'batch_size'},
                         'output': {0: 'batch_size'}}
        )
        return True
    except Exception as e:
        print(f"ONNX 변환 실패: {e}")
        return False

def _init_worker(models_path: str):
    """
    프로세스 풀 워커가 처음 기동될 때 한 번만 호출됩니다.
    여기서 모델을 로드해 이후 분석 호출 지연을 제거합니다.
    """
    global _WORKER_RESNET, _WORKER_MIDAS, _WORKER_TRANSFORM
    global _WORKER_RESNET_SESSION, _WORKER_MIDAS_SESSION

    # OpenBLAS/MKL, PyTorch 스레드 제한
    os.environ["OMP_NUM_THREADS"] = "1"
    os.environ["MKL_NUM_THREADS"] = "1"
    torch.set_num_threads(1)

    # ONNX 모델 경로
    onnx_dir = os.path.join(os.path.dirname(models_path), 'onnx')
    os.makedirs(onnx_dir, exist_ok=True)
    resnet_onnx_path = os.path.join(onnx_dir, 'resnet.onnx')

    # ResNet 모델 로드 및 ONNX 변환
    resnet_model = load_resnet_model(models_path, device="cpu")
    if not os.path.exists(resnet_onnx_path):
        dummy_input = torch.randn(1, 3, 224, 224)
        if convert_to_onnx(resnet_model, dummy_input, resnet_onnx_path):
            print("ResNet ONNX 변환 성공")
    
    # MiDaS 모델 로드 (ONNX 변환 없이)
    midas_model, midas_transform = load_midas_model(device="cpu")

    # ONNX Runtime 세션 생성 (ResNet만)
    if os.path.exists(resnet_onnx_path):
        _WORKER_RESNET_SESSION = ort.InferenceSession(
            resnet_onnx_path,
            providers=['CPUExecutionProvider']
        )
    else:
        _WORKER_RESNET = resnet_model

    # MiDaS는 PyTorch 모델 그대로 사용
    _WORKER_MIDAS = midas_model
    _WORKER_TRANSFORM = midas_transform

def _analyze_worker(target_img, reference_img, image_name: str):
    """워커 프로세스에서 이미지 분석을 수행"""
    # ONNX Runtime 세션이 있는 경우 해당 세션 사용
    resnet_model = _WORKER_RESNET_SESSION if _WORKER_RESNET_SESSION else _WORKER_RESNET
    midas_model = _WORKER_MIDAS_SESSION if _WORKER_MIDAS_SESSION else _WORKER_MIDAS
    
    return analyze_food_image_custom(
        target_image_path=target_img,
        reference_image_path=reference_img,
        resnet_model=resnet_model,
        midas_model=midas_model,
        midas_transform=_WORKER_TRANSFORM,
        image_name=image_name,
    )

# 메모리 캐시를 위한 딕셔너리
reference_cache = {}

async def download_image_async(url: str, session: aiohttp.ClientSession) -> np.ndarray:
    """비동기로 이미지 다운로드"""
    start = time.time()
    try:
        async with session.get(url) as response:
            if response.status != 200:
                raise Exception(f"이미지 다운로드 실패: HTTP {response.status}")
            
            # 바이너리 데이터 읽기
            content = await response.read()
            
            # numpy 배열로 변환
            img_arr = np.frombuffer(content, dtype=np.uint8)
            
            # 이미지 디코딩
            img = cv2.imdecode(img_arr, cv2.IMREAD_COLOR)
            
            if img is None:
                raise Exception("이미지 디코딩 실패")
            
            elapsed = time.time() - start
            if settings.DEBUG:
                print(f"[TIMING] download_image_async: {elapsed:.3f}s for {url}")
            return img
            
    except Exception as e:
        if settings.DEBUG:
            print(f"[ERROR] download_image_async failed for {url}: {str(e)}")
        raise Exception(f"이미지 다운로드 실패: {str(e)}")

def crop_center(img, crop_ratio=0.2, cache_key=None):
    start = time.time()
    h, w = img.shape[:2]
    ch, cw = int(h * crop_ratio), int(w * crop_ratio)
    startx = w//2 - cw//2
    starty = h//2 - ch//2
    cropped = img[starty:starty+ch, startx:startx+cw]
    
    if cache_key is not None:
        reference_cache[cache_key] = cropped
        
    elapsed = time.time() - start
    if settings.DEBUG:
        print(f"[TIMING] crop_center: {elapsed:.3f}s")
    return cropped

def preprocess_image_for_midas(img: np.ndarray) -> np.ndarray:
    """MiDaS 모델을 위한 이미지 전처리"""
    # 원본 이미지의 비율 유지하면서 크기 조정
    h, w = img.shape[:2]
    target_size = 384
    
    # 비율 계산
    ratio = target_size / max(h, w)
    new_h, new_w = int(h * ratio), int(w * ratio)
    
    # 이미지 리사이즈
    img = cv2.resize(img, (new_w, new_h))
    
    # 패딩 추가하여 정사각형으로 만들기
    square_img = np.zeros((target_size, target_size, 3), dtype=np.uint8)
    y_offset = (target_size - new_h) // 2
    x_offset = (target_size - new_w) // 2
    square_img[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = img
    
    return square_img

def _analyze_with_reseed(*args, **kwargs):
    """RNG 시드를 다시 고정하고 이미지 분석 수행"""
    reseed_every_thread()
    return analyze_food_image_custom(*args, **kwargs)

async def analyze_image_parallel(
    image: np.ndarray,
    reference: np.ndarray,
    image_name: str,
    executor: ProcessPoolExecutor
) -> Dict[str, Any]:
    """단일 이미지 분석을 비동기로 실행"""
    start = time.time()
    
    # CPU 바운드 작업을 워커 프로세스에서 실행
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        executor,
        _analyze_worker,
        image, reference, image_name
    )
    
    elapsed = time.time() - start
    if settings.DEBUG:
        print(f"[TIMING] analyze_image_parallel for {image_name}: {elapsed:.3f}s")
    return result

async def process_before_images_parallel(
    before_images: Dict[str, str],
    executor: ProcessPoolExecutor
) -> Dict[str, Dict[str, Any]]:
    """식전 이미지들을 병렬로 처리"""
    async def download_and_crop(category: str, url: str) -> tuple[str, np.ndarray, np.ndarray]:
        # 이미지 다운로드
        img = await download_image_async(url, session)
        # 중앙 crop
        reference = crop_center(img, cache_key=f"reference_{category}")
        return category, img, reference

    # aiohttp 세션 생성
    async with aiohttp.ClientSession() as session:
        # 모든 이미지 다운로드 및 크롭을 병렬로 실행
        download_tasks = [download_and_crop(category, url) for category, url in before_images.items()]
        download_results = await asyncio.gather(*download_tasks)
        
        # 분석 태스크 생성 및 실행
        analysis_tasks = []
        for category, img, reference in download_results:
            task = analyze_image_parallel(img, reference, before_images[category], executor)
            analysis_tasks.append((category, task))
        
        # 분석 태스크를 병렬로 실행 (최대 3개씩)
        results = {}
        for i in range(0, len(analysis_tasks), 3):
            batch = analysis_tasks[i:i+3]
            batch_results = await asyncio.gather(*[task for _, task in batch])
            for (category, _), result in zip(batch, batch_results):
                results[category] = result
        
        return results

async def process_after_images_parallel(
    after_images: Dict[str, str],
    before_results: Dict[str, Dict[str, Any]],
    executor: ProcessPoolExecutor
) -> Dict[str, Dict[str, Any]]:
    """식후 이미지들을 병렬로 처리"""
    async def download_and_get_reference(category: str, url: str) -> tuple[str, np.ndarray, np.ndarray]:
        if category not in before_results:
            return category, None, None
            
        # 이미지 다운로드
        img = await download_image_async(url, session)
        # 참조 이미지 가져오기
        reference = reference_cache.get(f"reference_{category}")
        if reference is None:
            reference = crop_center(img, cache_key=f"reference_{category}")
        return category, img, reference

    # aiohttp 세션 생성
    async with aiohttp.ClientSession() as session:
        # 모든 이미지 다운로드 및 참조 이미지 가져오기를 병렬로 실행
        download_tasks = [download_and_get_reference(category, url) for category, url in after_images.items()]
        download_results = await asyncio.gather(*download_tasks)
        
        # 분석 태스크 생성 및 실행
        analysis_tasks = []
        for category, img, reference in download_results:
            if img is not None and reference is not None:
                task = analyze_image_parallel(img, reference, after_images[category], executor)
                analysis_tasks.append((category, task))
            else:
                analysis_tasks.append((category, None))
        
        # 분석 태스크를 병렬로 실행 (최대 3개씩)
        results = {}
        for i in range(0, len(analysis_tasks), 3):
            batch = analysis_tasks[i:i+3]
            batch_results = await asyncio.gather(*[task if task is not None else None for _, task in batch])
            for (category, _), result in zip(batch, batch_results):
                results[category] = result
        
        return results

class AnalyzeService:
    """잔반 분석 서비스"""
    
    def __init__(self):
        if settings.DEBUG:
            print("[ANALYZE] Initializing analyze service and loading models...")
        
        # 모델 가중치 경로
        weights_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'weights', 'new_opencv_ckpt_b84_e200.pth')
        
        # 워커 풀 생성 (3 프로세스)
        self._executor = ProcessPoolExecutor(
            max_workers=3,
            initializer=_init_worker,
            initargs=(weights_path,),
        )
        
        if settings.DEBUG:
            print("[ANALYZE] Process pool initialized with 3 workers")

    async def analyze_leftover_images(
        self,
        before_images: Dict[str, str],
        after_images: Dict[str, str],
        student_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        total_start = time.time()
        
        # 식전 이미지 병렬 처리
        before_start = time.time()
        before_results = await process_before_images_parallel(
            before_images, self._executor
        )
        before_elapsed = time.time() - before_start
        if settings.DEBUG:
            print(f"[TIMING] Process before images: {before_elapsed:.3f}s")

        # 식후 이미지 병렬 처리
        after_start = time.time()
        after_results = await process_after_images_parallel(
            after_images, before_results, self._executor
        )
        after_elapsed = time.time() - after_start
        if settings.DEBUG:
            print(f"[TIMING] Process after images: {after_elapsed:.3f}s")

        # 결과 처리
        before_amounts = {}
        after_amounts = {}
        leftover_rates = {}

        for category in before_results.keys():
            if category in after_results:
                before_result = before_results[category]
                after_result = after_results[category]

                # 각 모델별 결과 추출
                before_backproj = before_result['backproj_percentage'] if before_result else 0.0
                after_backproj = after_result['backproj_percentage'] if after_result else 0.0
                before_volume = before_result['food_volume_cm3'] if before_result else 0.0
                after_volume = after_result['food_volume_cm3'] if after_result else 0.0
                before_resnet = before_result['resnet_result'][2] if before_result else 0.0
                after_resnet = after_result['resnet_result'][2] if after_result else 0.0

                # before/after 딕셔너리 저장
                before_amounts[category] = {
                    'backproj': float(round(before_backproj, 1)),
                    'food_volume_cm3': float(round(before_volume, 2)),
                    'resnet': float(round(before_resnet, 1))
                }
                after_amounts[category] = {
                    'backproj': float(round(after_backproj, 1)),
                    'food_volume_cm3': float(round(after_volume, 2)),
                    'resnet': float(round(after_resnet, 1))
                }

                # leftover 계산
                if before_backproj > 0:
                    leftover_backproj = max(0, (before_backproj - after_backproj) / before_backproj * 100)
                else:
                    leftover_backproj = 0.0
                if before_resnet > 0:
                    leftover_resnet = max(0, (before_resnet - after_resnet) / before_resnet * 100)
                else:
                    leftover_resnet = 0.0
                if before_volume > 0:
                    leftover_volume_pct = max(0, (before_volume - after_volume) / before_volume * 100)
                else:
                    leftover_volume_pct = 0.0

                # 가중치 적용
                if after_backproj <= 20:
                    w_backproj, w_volume, w_resnet = 1.0, 0.0, 0.0
                elif leftover_resnet == 0.0:
                    w_backproj, w_volume, w_resnet = 0.5, 0.5, 0.0
                else:
                    w_backproj, w_volume, w_resnet = 0.4, 0.3, 0.3

                final_leftover = (
                    w_backproj * leftover_backproj +
                    w_volume * leftover_volume_pct +
                    w_resnet * leftover_resnet
                )

                leftover_rates[category] = {
                    'backproj': float(round(leftover_backproj, 1)),
                    'food_volume_pct': float(round(leftover_volume_pct, 1)),
                    'resnet': float(round(leftover_resnet, 1)),
                    'final': float(round(final_leftover, 1))
                }

        total_elapsed = time.time() - total_start
        if settings.DEBUG:
            print(f"[TIMING] Total analyze_leftover_images: {total_elapsed:.3f}s")
            print(f"[ANALYZE] Processed images for {student_info.get('name')}")
            print(f"[ANALYZE] Before: {before_amounts}")
            print(f"[ANALYZE] After: {after_amounts}")
            print(f"[ANALYZE] Leftover: {leftover_rates}")

        leftoverRate_final = {k: round(100 - v['final'], 2) for k, v in leftover_rates.items()}
        return {
            "leftoverRate": leftoverRate_final,
            "studentInfo": student_info
        }

    async def _calculate_leftover(self, before_url: str, after_url: str) -> float:
        # 더미 구현
        return round(random.uniform(1.0, 35.0), 1)


def analyze_leftover(before_images, after_images, resnet_model, midas_model, midas_transform):
    start = time.time()
    result = {}
    for key in before_images:
        # 이미지 다운로드
        dl_start = time.time()
        before_img = download_image(before_images[key])
        after_img = download_image(after_images[key])
        dl_elapsed = time.time() - dl_start
        if settings.DEBUG:
            print(f"[TIMING] analyze_leftover download images for {key}: {dl_elapsed:.3f}s")

        # 중앙 crop - 메모리에 캐싱
        crop_start = time.time()
        cache_key = f"reference_{key}_{int(time.time()*1000)}"
        reference = crop_center(before_img, cache_key=cache_key)
        crop_elapsed = time.time() - crop_start
        if settings.DEBUG:
            print(f"[TIMING] analyze_leftover crop_center for {key}: {crop_elapsed:.3f}s")

        # 분석
        proc_start = time.time()
        res = analyze_food_image_custom(
            target_image_path=after_img,
            reference_image_path=reference,
            resnet_model=resnet_model,
            midas_model=midas_model,
            midas_transform=midas_transform
        )
        proc_elapsed = time.time() - proc_start
        if settings.DEBUG:
            print(f"[TIMING] analyze_food_image_custom for {key}: {proc_elapsed:.3f}s")

        result[key] = res['final_percentage'] if res else 0.0

    elapsed = time.time() - start
    if settings.DEBUG:
        print(f"[TIMING] Total analyze_leftover: {elapsed:.3f}s")
    return result
