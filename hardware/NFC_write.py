import smartcard.System
from smartcard.util import toHexString

def write_ndef_text(student_pk):
    """텍스트 데이터를 기록"""
    readers = smartcard.System.readers()
    if not readers:
        print("NFC 리더기를 찾을 수 없습니다.")
        return

    reader = readers[0]
    connection = reader.createConnection()
    connection.connect()

    new_text = student_pk  # 저장할 텍스트 데이터
    print(f"NFC 태그에 새로운 데이터 '{new_text}' 쓰기 시작...")

    # NDEF 메시지 생성 (UTF-8 텍스트 레코드)
    text_bytes = new_text.encode("utf-8")
    lang_bytes = "en".encode("utf-8")  # 언어 코드 (영어)
    text_length = len(text_bytes)
    lang_length = len(lang_bytes)

    # NDEF 텍스트 레코드 포맷 (4바이트 패딩 추가)
    ndef_message = [0xD1, 0x01, text_length + lang_length + 1, 0x54, lang_length] + list(lang_bytes) + list(text_bytes) + [0xFE]

    # 4바이트 단위로 정렬 (패딩 추가)
    while len(ndef_message) % 4 != 0:
        ndef_message.append(0x00)  # 빈 데이터 추가하여 정렬

    print("작성할 NDEF 데이터 (HEX 출력):")
    print(toHexString(ndef_message))

    # APDU 명령을 사용하여 블록 단위로 쓰기
    for i in range(0, len(ndef_message), 4):
        block = [0xFF, 0xD6, 0x00, 4 + i // 4, len(ndef_message[i:i+4])] + ndef_message[i:i+4]
        response, sw1, sw2 = connection.transmit(block)
        if sw1 != 0x90:
            print(f"쓰기 실패 (블록 {4 + i // 4}): {sw1:02X} {sw2:02X}")
            return

    print("NFC 태그에 학생번호가 성공적으로 저장되었습니다!")

if __name__ == "__main__":
    name = '1 2 6 8 이도윤 남자 식전'
    write_ndef_text(name)