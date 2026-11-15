"""
FITS Data Parser & Dual-Vision Image Renderer for Star Detective Academy.
Uses Astropy (astropy.io.fits) as primary engine with a built-in pure-NumPy FITS reader fallback.
Properly accesses `hdul[0].data` and `hdul[0].header.get()` (preventing HDUList.get AttributeError).
"""
import io
import os
from typing import Tuple, Dict, Any, Optional
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

try:
    from astropy.io import fits as astropy_fits
    HAS_ASTROPY = True
except ImportError:
    HAS_ASTROPY = False

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fits_cache")


def read_fits_file(filepath: str) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Loads 2D pixel array and header dictionary from a standard NASA FITS file.
    """
    if HAS_ASTROPY:
        with astropy_fits.open(filepath) as hdul:
            # Always access the primary HDU (hdul[0]) or first image HDU — never call hdul.get()!
            hdu = hdul[0] if hdul[0].data is not None else hdul[1]
            data = np.nan_to_num(np.asarray(hdu.data, dtype=np.float32), nan=0.0)
            hdr = {k: hdu.header.get(k) for k in hdu.header.keys() if k}
            return data, hdr

    # Pure-NumPy standard 2880-byte FITS parser fallback
    hdr: Dict[str, Any] = {}
    with open(filepath, "rb") as f:
        header_bytes = b""
        while True:
            block = f.read(2880)
            if not block:
                break
            header_bytes += block
            if b"END     " in block:
                break

        header_str = header_bytes.decode("ascii", errors="ignore")
        for i in range(0, len(header_str), 80):
            card = header_str[i:i + 80]
            if card.startswith("END     "):
                break
            if "=" in card[:10]:
                key = card[:8].strip()
                val_part = card[10:].split("/")[0].strip()
                if val_part.startswith("'") and val_part.endswith("'"):
                    val: Any = val_part[1:-1].strip()
                elif val_part in ("T", "F"):
                    val = (val_part == "T")
                else:
                    try:
                        val = int(val_part)
                    except ValueError:
                        try:
                            val = float(val_part)
                        except ValueError:
                            val = val_part
                hdr[key] = val

        nx = int(hdr.get("NAXIS1", 128))
        ny = int(hdr.get("NAXIS2", 128))
        bitpix = int(hdr.get("BITPIX", -32))
        dtype = ">f4" if bitpix == -32 else (">f8" if bitpix == -64 else ">i2")
        count = nx * ny
        raw_data = f.read(count * np.dtype(dtype).itemsize)
        arr = np.frombuffer(raw_data, dtype=dtype).reshape((ny, nx)).astype(np.float32)
        return np.nan_to_num(arr, nan=0.0), hdr


def load_patch_epochs(patch_id: str) -> Tuple[np.ndarray, Dict[str, Any], np.ndarray, Dict[str, Any]]:
    ep1_path = os.path.join(CACHE_DIR, f"{patch_id}_epoch1.fits")
    ep2_path = os.path.join(CACHE_DIR, f"{patch_id}_epoch2.fits")
    if not (os.path.exists(ep1_path) and os.path.exists(ep2_path)):
        raise FileNotFoundError(f"FITS files for patch '{patch_id}' not found in {CACHE_DIR}")
    d1, h1 = read_fits_file(ep1_path)
    d2, h2 = read_fits_file(ep2_path)
    return d1, h1, d2, h2


def render_dual_vision_png(
    data: np.ndarray,
    vision_mode: str = "gamified",
    cmap_override: Optional[str] = None,
    true_pixels: bool = False,
    is_difference: bool = False,
) -> bytes:
    """
    Renders a 2D FITS array into a PNG byte stream supporting Dual-Vision Mode:
      - vision_mode="gamified": Vibrant false-color ('inferno' or 'coolwarm' for difference) with adaptive stretch
      - vision_mode="raw": Authentic monochrome telescope view ('gray') with astronomical asinh stretch
    """
    arr = np.asarray(data, dtype=np.float32)

    if is_difference:
        # Symmetric percentile clipping around zero so moving objects show clear dark->bright dipoles
        vmax = float(np.percentile(np.abs(arr), 99.4)) or 1.0
        vmin = -vmax
        norm_arr = np.clip((arr - vmin) / (vmax - vmin), 0.0, 1.0)
        default_cmap = "coolwarm" if vision_mode == "gamified" else "gray"
    else:
        p_low = float(np.percentile(arr, 1.5))
        p_high = float(np.percentile(arr, 99.6))
        if p_high <= p_low:
            p_high = p_low + 1.0
        clipped = np.clip((arr - p_low) / (p_high - p_low), 0.0, 1.0)
        if vision_mode == "gamified":
            # Enhanced scanner non-linear contrast stretch to make faint brown dwarfs pop
            norm_arr = np.arcsinh(clipped * 4.5) / np.arcsinh(4.5)
            default_cmap = "inferno"
        else:
            # Authentic raw monochrome infrared detector stretch
            norm_arr = np.sqrt(clipped)
            default_cmap = "gray"

    cmap_map = {
        "grayscale": "gray",
        "gray": "gray",
        "inferno": "inferno",
        "plasma": "plasma",
        "viridis": "viridis",
        "magma": "magma",
        "cool": "cool",
        "coolwarm": "coolwarm",
    }
    chosen_cmap = cmap_map.get((cmap_override or "").lower(), default_cmap)
    interp = "nearest" if true_pixels else "bicubic"

    fig = plt.figure(figsize=(4, 4), dpi=128)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.axis("off")
    ax.imshow(norm_arr, cmap=chosen_cmap, interpolation=interp, origin="upper", vmin=0.0, vmax=1.0)

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=128, bbox_inches="tight", pad_inches=0)
    plt.close(fig)
    buf.seek(0)
    return buf.read()
