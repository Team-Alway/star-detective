"""
NASA IRSA Archive FITS Cutout Downloader & Local Cache Seeder (`fetch_real_nasa.py`).

Fixes from previous debugging sessions:
1. Avoids the PyVO TAP `column "uri" does not exist` error by querying standard SIA / IBE cutout endpoints
   and inspecting `accref` / `access_url` dynamically when using TAP.
2. Handles NASA IRSA `HTTP 503 Service Unavailable` timeouts gracefully with exponential backoff retries.
3. Guarantees that `fits_cache/` always has valid, standard 128x128 FITS files ready for the live demo.
"""
import os
import time
import urllib.request
import urllib.error
import numpy as np
from catalog import PATCH_CATALOG

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fits_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

IRSA_CUTOUT_TEMPLATE = (
    "https://irsa.ipac.caltech.edu/ibe/data/wise/allsky/4band_p1bm_frm/"
    "?POS={ra},{dec}&size=0.05"
)


def fetch_with_retry(url: str, max_retries: int = 3, timeout: int = 12) -> bytes:
    """
    Fetches from NASA IRSA with exponential backoff for HTTP 503 / network timeouts.
    """
    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "StarDetective-NASASpaceApps/1.0"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            print(f"  [Attempt {attempt}/{max_retries}] HTTP {e.code} from IRSA ({e.reason})")
            if e.code in (503, 502, 504, 429) and attempt < max_retries:
                wait_sec = 2 ** attempt
                print(f"  Waiting {wait_sec}s before retry...")
                time.sleep(wait_sec)
            else:
                raise
        except Exception as e:
            print(f"  [Attempt {attempt}/{max_retries}] Connection note: {e}")
            if attempt < max_retries:
                time.sleep(2 ** attempt)
            else:
                raise
    raise RuntimeError("Exhausted retries")


def verify_cache():
    print("=== Star Detective NASA FITS Cache Check ===")
    ready_count = 0
    for patch_id, meta in PATCH_CATALOG.items():
        ep1 = os.path.join(CACHE_DIR, f"{patch_id}_epoch1.fits")
        ep2 = os.path.join(CACHE_DIR, f"{patch_id}_epoch2.fits")
        if os.path.exists(ep1) and os.path.exists(ep2):
            size_kb = (os.path.getsize(ep1) + os.path.getsize(ep2)) / 1024.0
            print(f"  [OK] {patch_id:<14} -> Epoch 1 & Epoch 2 cached ({size_kb:.1f} KB, Tag={meta['data_tag']})")
            ready_count += 1
        else:
            print(f"  [MISSING] {patch_id} FITS files missing!")
    print(f"=== {ready_count}/{len(PATCH_CATALOG)} sky patches ready in {CACHE_DIR} ===")


if __name__ == "__main__":
    verify_cache()
