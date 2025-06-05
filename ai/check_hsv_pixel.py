import cv2

# 이미지 경로 (예: result_specular_V220_S40.png 등)
img_path = 'app/test_images/results/result_specular_V220_S40.png'
img = cv2.imread(img_path)

def mouse_callback(event, x, y, flags, param):
    if event == cv2.EVENT_LBUTTONDOWN:
        hsv = cv2.cvtColor(param, cv2.COLOR_BGR2HSV)
        h, s, v = hsv[y, x]
        print(f'좌표 ({x},{y}) - H: {h}, S: {s}, V: {v}')

cv2.imshow('이미지에서 클릭하세요', img)
cv2.setMouseCallback('이미지에서 클릭하세요', mouse_callback, img)
cv2.waitKey(0)
cv2.destroyAllWindows()