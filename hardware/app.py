from flask import Flask, render_template, Response, jsonify
import cv2, os, boto3, logging, queue, time, requests, io
from smartcard.CardMonitoring import CardMonitor,CardObserver
from smartcard.Exceptions import NoCardException
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
fourcc = cv2.VideoWriter_fourcc(*'MJPG')
cap.set(cv2.CAP_PROP_FOURCC, fourcc)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 960)
pk_queue = queue.Queue()

global is_detected, cnt_record, detection_flag, processing_flag, curremt_student_info, status_now
current_student_info = {"isTagged": False}
processing_flag = False
detection_flag = False
is_detected = False
cnt_record = 0
status_now = ""

SERVER_URL=os.environ["SERVER_URL"]
AWS_ACCESS_KEY_ID=os.environ["AWS_ACCESS_KEY_ID"]
AWS_SECRET_ACCESS_KEY=os.environ["AWS_SECRET_ACCESS_KEY"]
AWS_DEFAULT_REGION=os.environ["AWS_DEFAULT_REGION"]
BUCKET=os.environ["BUCKET"]

client = boto3.client('s3',
                      aws_access_key_id=AWS_ACCESS_KEY_ID,
                      aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                       region_name=AWS_DEFAULT_REGION,
                    )

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)

logging.getLogger('werkzeug').setLevel(logging.WARNING)

def extract_ndef_text():
    from smartcard.System import readers
    import logging

    r = readers()
    if not r:
        logging.error("NFC not found.")
        return None

    reader = r[0]
    try:
        conn = reader.createConnection()
        conn.connect()
    except Exception as e:
        logging.error(f"connect failed: {e}")
        return None

    # ---------- 1. 태그 메모리(4~15블록) 읽기 ----------
    ndef_data = []
    for block in range(4, 16):
        #     CLA  INS  P1  P2  Le
        cmd = [0xFF, 0xB0, 0x00, block, 4]   # READ_BINARY 4bytes
        resp, sw1, sw2 = conn.transmit(cmd)
        if sw1 == 0x90:                      # 0x90 0x00 = OK
            ndef_data.extend(resp)
        else:                                # 더는 읽을 데이터 없음
            break

    # ---------- 2. NDEF-T(Text) 파싱 ----------
    try:
        idx = ndef_data.index(0xD1)          # MB|ME|SR=1, TNF=0x01
    except ValueError:
        logging.error("NDEF header 0xD1 not found")
        return None

    type_len    = ndef_data[idx + 1]         # 보통 0x01
    payload_len = ndef_data[idx + 2]         # 전체 payload 길이
    if ndef_data[idx + 3] != 0x54:           # 'T' = 0x54
        logging.error("Not a Text record")
        return None

    status      = ndef_data[idx + 4]         # 상태 바이트
    lang_len    = status & 0x3F              # 하위 6비트 = 언어코드 길이
    utf16       = bool(status & 0x80)        # 0 = UTF-8, 1 = UTF-16

    text_start  = idx + 5 + lang_len
    text_len    = payload_len - 1 - lang_len # (payload 전체) - status - lang
    text_end    = text_start + text_len
    text_bytes  = bytes(ndef_data[text_start:text_end])

    try:
        text = text_bytes.decode('utf-16' if utf16 else 'utf-8')
    except UnicodeDecodeError as e:
        logging.error(f"decode error: {e}")
        return None

    return text

class NFCObserver(CardObserver):
    def update(self, observable, actions):
        added, _ = actions
        for _ in added:
            try:
                text_data = extract_ndef_text()
                if text_data is not None:
                    pk_queue.put(text_data)
                    logging.info(text_data)
                    logging.info("✨ pk save")

            except NoCardException:
                logging.warning("Not card")
            except Exception as e:
                logging.error(f"NFC read error: {e}")


def start_nfc_monitor():
    monitor = CardMonitor()
    observer = NFCObserver()
    monitor.addObserver(observer)
    logging.info("start")

def get_current_student_info():
    global current_student_info, processing_flag, status_now

    if processing_flag and current_student_info["isTagged"]:
        return current_student_info

    try:
        with pk_queue.mutex:
            if pk_queue.queue:
                text_data = pk_queue.queue[0]
                student_pk, grade, class_num, number, student_name, gender, status = text_data.split()

                status_now = status

                current_student_info = {
                    "pk":       student_pk,
                    "grade":    grade,
                    "class":    class_num,
                    "number":   number,
                    "name":     student_name,
                    "gender":   gender,
                    "status":   status,
                    "isTagged": True
                }
                return current_student_info
            
    except Exception as e:
        logging.error(f"get_current_student_info error: {e}")

    if not processing_flag:
        current_student_info = {"isTagged": False}
    return current_student_info

class TrayDetector:
    def __init__(self):
        self.focus_threshold     = 46.0
        self.cooldown_time       = 5
        self.vert_split_ratio = (11, 15)
        self.top_col_ratios = (10, 13.8, 10)
        self.bot_col_ratios = (15, 17)

detector = TrayDetector()

def gen_frames():
    global cnt_record, is_detected
    
    last_capture = 0

    while True:
        ref, frame = cap.read()

        if not ref:
            break


        else:
            frame = cv2.flip(frame, 0)

            now = time.time()

            h, w = frame.shape[:2]

            margin_x = int(w * 0.03)
            margin_y = int(h * 0.03)

            inner_w  = w - 2 * margin_x
            inner_h  = h - 2 * margin_y

            gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            focus = cv2.Laplacian(gray, cv2.CV_64F).var()

            r_top, r_bot = detector.vert_split_ratio
            split_y = margin_y + int(inner_h * r_top / (r_top + r_bot))

            regions = {}

            sum_top = sum(detector.top_col_ratios)
            acc = 0
            for name, ratio in zip(("side_1","main","side_2"),
                                   detector.top_col_ratios):
                x1 = margin_x + int(inner_w * acc / sum_top)
                acc += ratio
                x2 = margin_x + int(inner_w * acc / sum_top)
                regions[name] = (x1, margin_y, x2, split_y)

            sum_bot = sum(detector.bot_col_ratios)
            acc = 0
            for name, ratio in zip(("rice","soup"),
                                   detector.bot_col_ratios):
                x1 = margin_x + int(inner_w * acc / sum_bot)
                acc += ratio
                x2 = margin_x + int(inner_w * acc / sum_bot)
                regions[name] = (x1, split_y, x2, margin_y + inner_h)

            for name,(x1,y1,x2,y2) in regions.items():
                cv2.rectangle(frame,(x1,y1),(x2,y2),(0,255,0),2)

            cv2.rectangle(
                frame,
                (margin_x, margin_y),
                (margin_x + inner_w, margin_y + inner_h),
                (0, 255, 0),
                2
            )

            cv2.putText(frame,f"Focus:{focus:.0f}",
                        (10,30), cv2.FONT_HERSHEY_SIMPLEX,
                        0.8,(0,255,255),2)
            
            # 태깅 후에만 식판 검출 수행
            if (focus >= detector.focus_threshold and not pk_queue.empty()):
                cnt_record += 1
                
                if cnt_record == 10:
                    cnt_record = 0
                    is_detected = True
            
            else:
                cnt_record -= 1
                if cnt_record < 0:
                    cnt_record = 0
                
            if (is_detected and
                now - last_capture > detector.cooldown_time and
                not pk_queue.empty()):

                global detection_flag, processing_flag, current_student_info
                processing_flag = True
                
                is_detected = False

                with pk_queue.mutex:
                    text = pk_queue.queue[0]

                text = pk_queue.get()
                student_pk, grade, class_num, number, name, gender, status = text.split()

                # 서버에 정보 전송
                payload = {
                    'studentPk': int(student_pk),
                    'grade':  int(grade),
                    'classNum': int(class_num),
                    'number': int(number),
                    'studentName': name,
                    'gender': gender,
                    'status': status,
                    's3Url': {}
                }
                    
                for rname,(x1,y1,x2,y2) in regions.items():
                    crop = frame[y1:y2, x1:x2]
                    
                    h, w = crop.shape[:2]
                    
                    scale = 2.0
                    
                    new_w, new_h = int(w * scale), int(h * scale)
                    
                    crop_resized = cv2.resize(
                        crop,
                        (new_w, new_h),
                        interpolation=cv2.INTER_LINEAR
                    )
                    
                    fname = f"{name}_{status}_{rname}.jpg"
                    
                    success, encoded_image = cv2.imencode('.jpg', crop_resized, [cv2.IMWRITE_JPEG_QUALITY, 100])
                    if not success:
                        logging.warning(f'인코딩 실패 {rname}')

                    image_buffer = io.BytesIO(encoded_image.tobytes())
                    image_buffer.seek(0)

                    client.upload_fileobj(
                        Fileobj=image_buffer, Bucket=BUCKET, Key=fname,
                        ExtraArgs={'ACL':'public-read',
                                   'ContentType':'image/jpeg'}
                    )

                    payload['s3Url'][rname] = (
                      f'https://{BUCKET}.s3.{AWS_DEFAULT_REGION}.amazonaws.com/{fname}'
                    )
                    
                logging.info(f"Uploaded success")
                
                try:
                    resp = requests.post(SERVER_URL, json=payload, timeout=1)
                    logging.info(f"POST {resp.status_code}")
                except Exception as e:
                    logging.error(f"POST error: {e}")

                with pk_queue.mutex:
                    if pk_queue.queue and pk_queue.queue == text:
                        pk_queue.get()

                processing_flag = False
                detection_flag = True
                last_capture = now

            ref, buffer = cv2.imencode('.jpg', frame)
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            

@app.route('/')
def index():
    student_info = get_current_student_info()
    return render_template('index.html', studentInfo=student_info)

@app.route('/detection-status')
def detection_status():
    global detection_flag, status_now
    flag = detection_flag
    processing = processing_flag
    detection_flag = False
    return jsonify({'detected': flag, 'processing': processing, 'status': status_now})

@app.route('/video_feed')
def video_feed():
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/nfc-info')
def nfc_info():
    return jsonify(get_current_student_info())


if __name__ == "__main__":
    start_nfc_monitor()
    app.run(host='0.0.0.0', port='8080')

