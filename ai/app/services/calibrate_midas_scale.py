import numpy as np
import cv2
import torch
from app.services.custom_model import load_midas_model

# 실제 식판 깊이(cm)
H_CM = 3.0
# 빈 식판 이미지 경로
empty_img_path = 'app/refs/tray_empty.jpg'

# MiDaS 모델 로드 (CPU 사용)
midas_model, midas_transform = load_midas_model(device='cpu')
img = cv2.imread(empty_img_path)
input_batch = midas_transform(img).to('cpu')

with torch.no_grad():
    prediction = midas_model(input_batch)
    prediction = torch.nn.functional.interpolate(
        prediction.unsqueeze(1),
        size=img.shape[:2],
        mode="bicubic",
        align_corners=False,
    ).squeeze()

depth_map = prediction.cpu().numpy()  # 정규화 전 원본
np.save('depth_map_empty.npy', depth_map)
print('빈 식판 depth_map 저장 완료!')

# --- 스케일 캘리브레이션 ---
d = depth_map
d_wall = np.percentile(d, 95)   # 벽면(가장 얕은 곳)
d_floor = np.percentile(d, 5)   # 바닥(가장 깊은 곳)
scale_cm_per_unit = H_CM / (d_wall - d_floor)
np.save('midas_scale.npy', scale_cm_per_unit)
print(f"스케일 계수: {scale_cm_per_unit:.4f} cm/ΔZ (midas_scale.npy 저장)")