import cv2, os
boxes = {           # 라즈베리파이 crop 좌표(px)
    'A':[100,50,380,290],
    'B':[400,50,780,290],
    'C':[800,50,1170,290],
    'D':[50,300,580,780],
    'E':[600,300,1170,780],
}
os.makedirs('masks', exist_ok=True)
mask_full = cv2.imread('tray_empty.jpg', 0)        # 빈 식판 ROI
for k,(x1,y1,x2,y2) in boxes.items():
    sub = mask_full[y1:y2, x1:x2][2:-2, 2:-2]          # 2 px 안쪽으로
    cv2.imwrite(f'masks/mask_{k}.jpg', sub)
print('✔  masks/ 폴더 생성 완료')
