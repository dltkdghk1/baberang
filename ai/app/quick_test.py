# quick_test.py – lightweight batch tester for the food‑quantity pipeline
# ---------------------------------------------------------------
# Usage example (Linux/macOS)
#   python quick_test.py \
#       --crop-dir ./crops \
#       --ref-dir  ./refs \
#       --mask-dir ./masks \
#       --weights  ./weights/food_resnet.pth
# ---------------------------------------------------------------

import argparse
import glob
import os
import time
from datetime import datetime

import torch

# local modules
from services.custom_model import (
    analyze_food_image_custom,
    load_resnet_model,
    load_midas_model,
)


def main():
    parser = argparse.ArgumentParser(
        description="Run the three‑branch food‑quantity estimation on a batch of crop images.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--crop-dir", type=str, required=True, help="Folder containing crop images (e.g., A_0001.jpg …)")
    parser.add_argument("--ref-dir", type=str, required=True, help="Folder with clean reference images (A_clean.jpg …)")
    parser.add_argument("--mask-dir", type=str, required=True, help="Folder with template masks (mask_A.png …)")
    parser.add_argument(
        "--weights", type=str, default="./weights/food_resnet.pth", help="Path to ResNet weights file"
    )
    parser.add_argument("--no-midas", action="store_true", help="Disable MiDaS depth estimation for speed")

    args = parser.parse_args()

    # ------------------------------------------------------------------
    # model loading (one‑time)
    # ------------------------------------------------------------------
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[INFO] Device  : {device}")
    print("[INFO] Loading ResNet model …")
    resnet_model = load_resnet_model(args.weights, device)

    if args.no_midas:
        midas_model, midas_transform = None, None
        print("[INFO] MiDaS DISABLED ( --no-midas flag )")
    else:
        print("[INFO] Loading MiDaS model …")
        midas_model, midas_transform = load_midas_model(device)

    # ------------------------------------------------------------------
    # gather crop list
    # ------------------------------------------------------------------
    crop_paths = sorted(
        glob.glob(os.path.join(args.crop_dir, "*.jpg")) +
        glob.glob(os.path.join(args.crop_dir, "*.png"))
    )
    if not crop_paths:
        print("[WARN] No crop images found – check the --crop-dir path.")
        return

    print(f"[INFO] {len(crop_paths)} crop images detected. Starting analysis …\n")

    start = time.time()
    for img_path in crop_paths:
        crop_id = os.path.basename(img_path)[0].upper()  # first char A~E
        ref_path = os.path.join(args.ref_dir, f"{crop_id}_clean.jpg")
        if not os.path.exists(ref_path):
            print(f"[SKIP] reference missing for {img_path} → {ref_path}")
            continue

        result = analyze_food_image_custom(
            img_path,
            ref_path,
            resnet_model,
            midas_model,
            midas_transform,
            output_dir="./results",
            image_name=img_path
        )

        if result is None:
            print(f"[FAIL] analysis failed for {img_path}")
            continue

        fp = result["final_percentage"]
        conf = result["confidence"] * 100
        print(
            f"{os.path.basename(img_path):<20}  »  {fp:6.1f}%   (conf: {conf:5.1f}%)"
        )

    elapsed = time.time() - start
    print("\n[DONE] batch finished – elapsed {:.1f} s".format(elapsed))


if __name__ == "__main__":
    main()
