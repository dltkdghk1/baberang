import random
import numpy as np
import cv2
import torch
import os

SEED = 42

def reseed_every_thread():
    """각 스레드에서 RNG 시드를 다시 고정"""
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)
    cv2.setRNGSeed(SEED)
    # OpenBLAS / MKL 내부 쓰레드까지 확실히 고정
    os.environ["MKL_NUM_THREADS"] = "1"
    os.environ["OPENBLAS_NUM_THREADS"] = "1" 