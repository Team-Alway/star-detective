"""Real SPHEREx sky viewer backend (router prefix ``/api/v2``).

The NASA Space Apps challenge asks: "Users enter the coordinates of a patch of
sky (RA/Dec). Your tool displays a series of SPHEREx images of that patch like
a little video, making it easy to spot moving objects." This module does that
with real data from NASA/IPAC IRSA's public SPHEREx archive:

1. Discovery: IVOA SIA v2 at IRSA (``SD_IRSA_SIA_URL``), one query per
   collection in ``SD_SPHEREX_COLLECTIONS`` (comma separated, priority order,
   default ``spherex_dr1``; the older ``spherex_qr`` Quick Release collection
   answered with zero rows in Nov 2026). When a new SPHEREx data release appears
   in IRSA (e.g. ``spherex_dr2``), put its collection name first in that env
   var -- no code change needed. The same exposure/detector appearing in
   several releases is kept only from the earliest-listed collection. If SIA fails we
   fall back to IRSA TAP ``ivoa.obscore`` with the same collection names.
2. Rows are grouped into "epochs" (visits): a new epoch starts when an image's
   t_min is more than ``EPOCH_WINDOW_DAYS`` after the first image of the
   current epoch.
3. Every image is fetched as a server-side IRSA cutout
   (``<access_url>?center=<ra>,<dec>&size=<deg>``), never the full 2040x2040
   frame, and cached on disk under ``sky_cache/`` (git-ignored) so repeated
   queries are instant and already-fetched targets work offline.
4. Each epoch's cutouts are reprojected onto ONE common north-up/east-left
   tangent-plane grid centred on the query position and co-added (mean of valid
   pixels; flagged and NaN pixels ignored), after subtracting IRSA's ZODI model
   and each cutout's median background. Every epoch uses the same grid and the
   same stretch, so a flip-book of the frames shows true motion and true
   brightness changes.

Nothing here invents data: if IRSA cannot be reached and nothing is cached,
endpoints answer 503.
"""
from __future__ import annotations

import csv
import gzip
import hashlib
import io
import json
import logging
import math
import os
import re
import threading
import time
import warnings
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Literal, Optional, Tuple

import numpy as np
import requests
from astropy.io import fits
from astropy.time import Time
from astropy.wcs import WCS, FITSFixedWarning
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, Response
from PIL import Image

from sky_targets import targets as _targets

log = logging.getLogger("stardetective.sky")
warnings.simplefilter("ignore", FITSFixedWarning)

# ---------------------------------------------------------------- config
COLLECTIONS: List[str] = [c.strip() for c in os.environ.get("SD_SPHEREX_COLLECTIONS", "spherex_dr1").split(",") if c.strip()]
SIA_URL = os.environ.get("SD_IRSA_SIA_URL", "https://irsa.ipac.caltech.edu/SIA")
TAP_URL = os.environ.get("SD_IRSA_TAP_URL", "https://irsa.ipac.caltech.edu/TAP/sync")
SESAME_URL = os.environ.get("SD_SESAME_URL", "https://cds.unistra.fr/cgi-bin/nph-sesame/-oxp/SNV")
CACHE_DIR = os.environ.get("SD_SKY_CACHE", os.path.join(os.path.dirname(os.path.abspath(__file__)), "sky_cache"))
USER_AGENT = "StarDetective/1.0"
EPOCH_WINDOW_DAYS = 2.0
MAX_IMAGES_PER_QUERY = int(os.environ.get("SD_SKY_MAX_IMAGES", "60"))
MAX_PER_EPOCH = int(os.environ.get("SD_SKY_MAX_PER_EPOCH", "8"))
MIN_PER_EPOCH = 3
MAX_EPOCHS = int(os.environ.get("SD_SKY_MAX_EPOCHS", "24"))
QUERY_TTL_S = 6 * 3600
EMPTY_QUERY_TTL_S = 15 * 60   # re-ask soon when IRSA said "nothing here"
GRID_ARCSEC = 3.1          # output grid scale: 2x oversampling of SPHEREx's 6.2"/px
DOWNLOAD_WORKERS = 4
HTTP_TIMEOUT = (10, 90)
RETRY_AFTER_S = 60
IRSA_DOWN_MSG = "NASA's IRSA archive is not responding. Try again in a minute."
CACHE_VERSION = "v1"
COADD_VERSION = "c2"   # bump when the co-add recipe changes (invalidates cached co-adds/stretches only)

# FLAGS bits that make a pixel unusable for co-adding. "SOURCE" (a real detected
# source) and informational bits are deliberately NOT masked.
# Names as decoded from the real SPHEREx L2 FLAGS header (MSKNnnnn keywords).
BAD_FLAG_NAMES = {
    "TRANSIENT", "OVERFLOW", "SUR_ERROR", "NONFUNC", "MISSING_DATA", "HOT", "COLD",
    "NONLINEAR", "PERSIST", "OUTLIER", "CROSSTALK", "GHOST", "GHOST_FPA", "GHOST_EXT",
    "STREAK", "BLOOM", "SNOWBALL", "HALO",
}
# Saturation-type flags: a bright star's core carries them. Those pixels are left out of the
# co-add, except where NO image has a clean pixel -- then the mean of the saturation-flagged
# values is shown instead of a black hole in the middle of a bright star.
SOFT_FLAG_NAMES = {"OVERFLOW", "NONLINEAR", "BLOOM"}
KEEP_EXTENSIONS = ("IMAGE", "FLAGS", "VARIANCE", "ZODI", "WCS-WAVE")  # EPSF (~4 MB) is dropped from the cache

_session = requests.Session()
_session.headers["User-Agent"] = USER_AGENT
_pool = ThreadPoolExecutor(max_workers=DOWNLOAD_WORKERS, thread_name_prefix="irsa")
_warm_pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="sky-warm")
_warming: set = set()


class IrsaUnavailable(Exception):
    pass


def _irsa_503() -> JSONResponse:
    return JSONResponse(status_code=503, content={"detail": IRSA_DOWN_MSG, "retry_after": RETRY_AFTER_S},
                        headers={"Retry-After": str(RETRY_AFTER_S)})


# ---------------------------------------------------------------- small utils
_locks: Dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()


def _lock(key: str) -> threading.Lock:
    with _locks_guard:
        return _locks.setdefault(key, threading.Lock())


def _h(*parts) -> str:
    return hashlib.sha1("|".join(str(p) for p in parts).encode()).hexdigest()[:24]


def _cache_path(sub: str, name: str) -> str:
    d = os.path.join(CACHE_DIR, sub)
    os.makedirs(d, exist_ok=True)
    gi = os.path.join(CACHE_DIR, ".gitignore")
    if not os.path.exists(gi):
        with open(gi, "w") as f:
            f.write("*\n")
    return os.path.join(d, name)


def _atomic_write(path: str, data: bytes) -> None:
    tmp = f"{path}.tmp{threading.get_ident()}"
    with open(tmp, "wb") as f:
        f.write(data)
    os.replace(tmp, path)


def _http_get(url: str, params=None, attempts: int = 3, timeout=HTTP_TIMEOUT, backoff: float = 1.5) -> requests.Response:
    """GET with retry + exponential backoff. 5xx / network errors -> IrsaUnavailable."""
    last = None
    for i in range(attempts):
        try:
            r = _session.get(url, params=params, timeout=timeout)
            if r.status_code < 500:
                return r
            last = f"HTTP {r.status_code}"
        except requests.RequestException as e:
            last = repr(e)
        if i < attempts - 1:
            time.sleep(backoff * (2 ** i))
    log.warning("IRSA request failed after %d attempts: %s (%s)", attempts, url, last)
    raise IrsaUnavailable(last)


def _mjd_to_date(mjd: float) -> str:
    return Time(mjd, format="mjd").to_datetime().date().isoformat()


# ---------------------------------------------------------------- discovery
def _parse_detector(*texts) -> Optional[int]:
    for t in texts:
        if not t:
            continue
        m = re.search(r"D([1-6])(?![0-9])", str(t))
        if m:
            return int(m.group(1))
    return None


def _f(v) -> Optional[float]:
    try:
        x = float(v)
        return x if math.isfinite(x) else None
    except (TypeError, ValueError):
        return None


def normalize_rows(raw_rows: List[Dict]) -> List[Dict]:
    """Map raw ObsCore/SIA rows to the fields we use; drop unusable rows; dedupe by access_url."""
    out, seen = [], set()
    for r in raw_rows:
        r = {str(k).lower(): v for k, v in r.items()}
        url = (r.get("access_url") or "").strip()
        ptype = (r.get("dataproduct_type") or "image").lower()
        subtype = (r.get("dataproduct_subtype") or "science").lower()
        if ptype != "image" or subtype not in ("science", ""):
            continue
        fmt = (r.get("access_format") or "").lower()
        if not url or url in seen or ("datalink" in fmt) or ("votable" in fmt):
            continue
        t_min = _f(r.get("t_min"))
        if t_min is None:
            t_min = _f(r.get("t_max"))
        if t_min is None:
            continue
        em_min, em_max = _f(r.get("em_min")), _f(r.get("em_max"))
        det = _parse_detector(r.get("energy_bandpassname"), r.get("obs_publisher_did"), url)
        base_id = str(r.get("obs_id") or os.path.basename(url.split("?")[0]))
        uid = (base_id, det)  # the same exposure/detector from a later-listed release is a duplicate
        if uid in seen:
            continue
        seen.add(uid)
        seen.add(url)
        out.append({
            "access_url": url,
            "obs_id": f"{base_id}_D{det}" if det else base_id,
            "t_min": t_min,
            "t_max": _f(r.get("t_max")),
            "detector": det,
            "em_min_um": em_min * 1e6 if em_min else None,
            "em_max_um": em_max * 1e6 if em_max else None,
            "collection": r.get("obs_collection"),
        })
    return out


def _rows_from_csv(text: str) -> List[Dict]:
    return list(csv.DictReader(io.StringIO(text)))


def _rows_from_votable(content: bytes) -> List[Dict]:
    from astropy.io.votable import parse_single_table
    t = parse_single_table(io.BytesIO(content)).to_table()
    rows = []
    for rec in t:
        rows.append({c: (None if np.ma.is_masked(rec[c]) else (rec[c].decode() if isinstance(rec[c], bytes) else rec[c])) for c in t.colnames})
    return rows


def _sia_query(ra: float, dec: float, radius_deg: float) -> List[Dict]:
    raw = []
    for i, coll in enumerate(COLLECTIONS):
        params = {"COLLECTION": coll, "POS": f"CIRCLE {ra:.6f} {dec:.6f} {radius_deg:.5f}", "RESPONSEFORMAT": "CSV"}
        try:
            r = _http_get(SIA_URL, params=params)
            if r.status_code != 200:
                raise IrsaUnavailable(f"SIA HTTP {r.status_code}")
            raw += _parse_table_response(r, "SIA")
        except IrsaUnavailable:
            if i == 0 or not raw:
                raise
            log.warning("SIA failed for secondary collection %s; keeping %d rows from earlier ones", coll, len(raw))
    return raw


def _parse_table_response(r: requests.Response, what: str) -> List[Dict]:
    """Parse CSV or VOTable; an error document or a table without access_url means IRSA is unwell."""
    txt = r.text
    if txt.lstrip().startswith("<"):
        if re.search(r'QUERY_STATUS"\s+value="(ERROR|OVERFLOW)"', txt) or "<html" in txt[:500].lower():
            log.warning("%s returned an error document: %s", what, txt[:300])
            raise IrsaUnavailable(f"{what} error document")
        try:
            rows = _rows_from_votable(r.content)
        except Exception as e:
            raise IrsaUnavailable(f"{what} unparsable VOTable: {e}")
        if not rows and "access_url" not in txt.lower():
            raise IrsaUnavailable(f"{what} VOTable without access_url column")
        return rows
    first = txt.lstrip().split("\n", 1)[0].lower()
    if "access_url" not in first:
        log.warning("%s returned unexpected content: %s", what, txt[:300])
        raise IrsaUnavailable(f"{what} unexpected content")
    return _rows_from_csv(txt)


def _tap_query(ra: float, dec: float, radius_deg: float) -> List[Dict]:
    colls = ",".join("'" + c.replace("'", "") + "'" for c in COLLECTIONS)
    adql = ("SELECT access_url, access_format, obs_id, obs_collection, t_min, t_max, em_min, em_max, "
            "energy_bandpassname FROM ivoa.obscore WHERE obs_collection IN (" + colls + ") AND "
            f"INTERSECTS(CIRCLE('ICRS', {ra:.6f}, {dec:.6f}, {radius_deg:.5f}), s_region) = 1")
    r = _http_get(TAP_URL, params={"QUERY": adql, "LANG": "ADQL", "FORMAT": "csv"})
    if r.status_code != 200:
        raise IrsaUnavailable(f"TAP HTTP {r.status_code}")
    return _parse_table_response(r, "TAP")


def find_images(ra: float, dec: float) -> Tuple[List[Dict], str]:
    """All SPHEREx images containing (ra, dec). Returns (rows, source 'irsa'|'cache')."""
    key = _h(CACHE_VERSION, ",".join(COLLECTIONS), round(ra, 5), round(dec, 5))
    path = _cache_path("queries", key + ".json")
    cached = None
    if os.path.exists(path):
        with open(path) as f:
            cached = json.load(f)
        ttl = QUERY_TTL_S if cached.get("rows") else EMPTY_QUERY_TTL_S
        if time.time() - cached.get("fetched_at", 0) < ttl:
            return cached["rows"], "cache"
    with _lock(path):
        radius = 0.002  # images that contain the field centre
        try:
            try:
                raw = _sia_query(ra, dec, radius)
            except IrsaUnavailable:
                raw = _tap_query(ra, dec, radius)
        except IrsaUnavailable:
            if cached is not None:
                return cached["rows"], "cache"
            raise
        rows = normalize_rows(raw)
        _atomic_write(path, json.dumps({"fetched_at": time.time(), "ra": ra, "dec": dec,
                                        "collections": COLLECTIONS, "rows": rows}).encode())
        return rows, "irsa"


# ---------------------------------------------------------------- epochs
def group_epochs(rows: List[Dict], window_days: float = EPOCH_WINDOW_DAYS) -> List[Dict]:
    """Group rows into visits: an epoch holds every image whose t_min lies within
    ``window_days`` of the epoch's first image. Sorted by time; ids are the
    ISO date of the first image (stable across calls)."""
    srt = sorted(rows, key=lambda r: r["t_min"])
    groups: List[List[Dict]] = []
    for r in srt:
        if groups and r["t_min"] - groups[-1][0]["t_min"] <= window_days:
            groups[-1].append(r)
        else:
            groups.append([r])
    epochs, used_ids = [], set()
    for g in groups:
        start = g[0]["t_min"]
        eid = _mjd_to_date(start)
        if eid in used_ids:  # only possible with window < 1 day
            eid = f"{eid}T{Time(start, format='mjd').to_datetime().strftime('%H%M')}"
        used_ids.add(eid)
        mjd = float(np.median([r["t_min"] for r in g]))
        epochs.append({
            "id": eid, "date_obs": _mjd_to_date(mjd), "mjd": round(mjd, 5),
            "detectors": sorted({r["detector"] for r in g if r["detector"]}),
            "n_images": len(g), "rows": g,
        })
    return epochs


def thin_epochs(epochs: List[Dict], max_epochs: int = MAX_EPOCHS) -> List[Dict]:
    """Keep at most max_epochs, evenly spaced in order, always the first and the last."""
    if len(epochs) <= max_epochs:
        return epochs
    idx = sorted({round(i * (len(epochs) - 1) / (max_epochs - 1)) for i in range(max_epochs)})
    return [epochs[i] for i in idx]


def select_rows(rows: List[Dict], k: int) -> List[Dict]:
    """Pick k rows spread evenly in wavelength (hence across detectors)."""
    if len(rows) <= k:
        return list(rows)
    srt = sorted(rows, key=lambda r: ((r["em_min_um"] or 0) + (r["em_max_um"] or 0), r["t_min"]))
    idx = sorted({round(i * (len(srt) - 1) / (k - 1)) for i in range(k)}) if k > 1 else [len(srt) // 2]
    return [srt[i] for i in idx]


def _per_epoch(n_epochs: int) -> int:
    return max(MIN_PER_EPOCH, min(MAX_PER_EPOCH, MAX_IMAGES_PER_QUERY // max(1, n_epochs)))


# ---------------------------------------------------------------- cutouts
def cutout_size_deg(fov_arcmin: float) -> float:
    """Cutout side, quantised so nearby fovs share cached files. 1.5x fov covers any rotation."""
    for bucket in (6, 12, 20, 30):
        if fov_arcmin <= bucket:
            return round(bucket * 1.5 / 60.0, 4)
    return round(30 * 1.5 / 60.0, 4)


def cutout_url(access_url: str, ra: float, dec: float, size_deg: float) -> str:
    sep = "&" if "?" in access_url else "?"
    return f"{access_url}{sep}center={ra:.6f},{dec:.6f}&size={size_deg:.4f}"


def fetch_cutout(url: str) -> str:
    """Download (or reuse) a FITS cutout; returns the local path."""
    path = _cache_path("cutouts", _h(CACHE_VERSION, url) + ".fits")
    if os.path.exists(path):
        return path
    with _lock(path):
        if os.path.exists(path):
            return path
        r = _http_get(url, timeout=(10, 180), attempts=5, backoff=2.0)  # IBE answers 503 "Server busy" under load
        if r.status_code != 200:
            raise IrsaUnavailable(f"cutout HTTP {r.status_code}")
        data = r.content
        if data[:2] == b"\x1f\x8b":
            data = gzip.decompress(data)
        if not data.startswith(b"SIMPLE"):
            raise IrsaUnavailable("cutout is not FITS")
        try:  # keep only what we use; the EPSF table is ~95% of each cutout's bytes
            with fits.open(io.BytesIO(data)) as hdul:
                keep = [hdul[0]] + [h for h in hdul[1:] if h.name.upper() in KEEP_EXTENSIONS]
                buf = io.BytesIO()
                fits.HDUList(keep).writeto(buf)
                data = buf.getvalue()
        except Exception as e:
            log.warning("could not slim cutout %s: %s", url, e)
        _atomic_write(path, data)
        return path


def _flag_names(header) -> Dict[str, int]:
    """Decode FLAGS bit names from the header.

    SPHEREx L2 files use ``MSKNnnnn = '<NAME>'`` with ``MSKMnnnn = 1<<n`` (and a
    description in ``MSKDnnnn``); ``MP_<NAME> = <bit>`` is accepted as a fallback."""
    names = {}
    for k, v in header.items():
        m = re.match(r"^MSKN(\d{4})$", k)
        if m and isinstance(v, str) and v.strip():
            n = int(m.group(1))
            mask = header.get(f"MSKM{m.group(1)}")
            bit = int(mask).bit_length() - 1 if isinstance(mask, (int, np.integer)) and mask > 0 else n
            if 0 <= bit < 32:
                names[v.strip()] = bit
    if names:
        return names
    for k, v in header.items():
        if isinstance(v, (int, np.integer)) and not isinstance(v, bool) and 0 <= int(v) < 32:
            m = re.match(r"^(?:HIERARCH\s+)?MP_(\w+)$", k)
            if m:
                names[m.group(1)] = int(v)
    return names


def load_cutout(path: str) -> Dict:
    with fits.open(path, memmap=False) as hdul:
        ext = {h.name.upper(): h for h in hdul}
        img_hdu = ext.get("IMAGE") or next(h for h in hdul if h.data is not None and h.data.ndim == 2)
        hdr = img_hdu.header
        img = np.asarray(img_hdu.data, dtype=np.float32)
        wcs = WCS(hdr, naxis=2)
        out = {"header": hdr, "image": img, "wcs": wcs, "flags": None, "flag_names": {},
               "variance": None, "zodi": None, "spec_wcs": None}
        if "FLAGS" in ext:
            out["flags"] = np.asarray(ext["FLAGS"].data).astype(np.int64)
            out["flag_names"] = _flag_names(ext["FLAGS"].header)
        if "VARIANCE" in ext:
            out["variance"] = np.asarray(ext["VARIANCE"].data, dtype=np.float32)
        if "ZODI" in ext:
            out["zodi"] = np.asarray(ext["ZODI"].data, dtype=np.float32)
        try:
            hw = hdr.copy()  # the SIP terms belong to the celestial WCS, not to the 'W' lookup table
            for k in [k for k in hw.keys() if re.match(r"^(A|B|AP|BP)_(ORDER|\d+_\d+)$", k)]:
                del hw[k]
            sw = WCS(hw, fobj=hdul, key="W")
            out["spec_wcs"] = sw
        except Exception as e:  # spectral WCS unavailable in this file
            log.info("no spectral WCS in %s: %s", path, e)
    return out


def _bits(c: Dict, names_set) -> int:
    names = c["flag_names"]
    if not names:
        return 0xFFFFFFFF  # unknown layout -> conservative
    bits = 0
    for n, b in names.items():
        if n.upper() in names_set:
            bits |= 1 << b
    return bits


def bad_mask(c: Dict, exclude_soft: bool = False) -> np.ndarray:
    """True where the pixel must not be used (NaN or a BAD_FLAG_NAMES bit set).
    With exclude_soft, saturation-type bits (SOFT_FLAG_NAMES) are tolerated."""
    img = c["image"]
    bad = ~np.isfinite(img)
    fl = c["flags"]
    if fl is not None and fl.shape == img.shape:
        bits = _bits(c, BAD_FLAG_NAMES)
        if exclude_soft and c["flag_names"]:
            bits &= ~_bits(c, SOFT_FLAG_NAMES)
        bad |= (fl & bits) != 0
    return bad


def science_image(c: Dict) -> Tuple[np.ndarray, np.ndarray]:
    """Zodi- and median-background-subtracted image. Returns (clean, soft): clean has every
    bad pixel = NaN; soft additionally keeps pixels whose only problem is saturation."""
    img = c["image"].astype(np.float64)
    if c["zodi"] is not None and c["zodi"].shape == img.shape:
        img = img - c["zodi"]
    clean = img.copy()
    clean[bad_mask(c)] = np.nan
    bg = float(np.nanmedian(clean)) if np.isfinite(clean).any() else 0.0
    soft = img - bg
    soft[bad_mask(c, exclude_soft=True)] = np.nan
    return clean - bg, soft


def wavelength_at(c: Dict, x: float, y: float, row: Dict) -> Tuple[float, bool]:
    """Wavelength (um) at pixel (x, y) from the spectral WCS; fallback: band centre of the row."""
    sw = c.get("spec_wcs")
    if sw is not None:
        try:
            vals = sw.pixel_to_world_values(x, y)
            wl = float(np.atleast_1d(vals[0] if isinstance(vals, (tuple, list)) else vals)[0])
            unit = str(sw.wcs.cunit[0]) if sw.wcs.cunit[0] else "um"
            if unit in ("m",):
                wl *= 1e6
            if 0.5 < wl < 5.5:
                return wl, True
        except Exception as e:
            log.info("spectral WCS evaluation failed: %s", e)
    if row.get("em_min_um") and row.get("em_max_um"):
        return (row["em_min_um"] + row["em_max_um"]) / 2.0, False
    return float("nan"), False


# ---------------------------------------------------------------- grid & reprojection
def grid_shape(fov_arcmin: float) -> int:
    return int(min(600, max(16, math.ceil(fov_arcmin * 60.0 / GRID_ARCSEC))))


def make_grid_wcs(ra: float, dec: float, fov_arcmin: float) -> Tuple[WCS, int]:
    """North-up, east-left TAN grid centred on (ra, dec). Array row 0 = south edge (FITS convention)."""
    n = grid_shape(fov_arcmin)
    scale = fov_arcmin / 60.0 / n
    w = WCS(naxis=2)
    w.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    w.wcs.crval = [ra, dec]
    w.wcs.crpix = [(n + 1) / 2.0, (n + 1) / 2.0]
    w.wcs.cdelt = [-scale, scale]
    w.wcs.cunit = ["deg", "deg"]
    return w, n


def _bilinear_fallback(data: np.ndarray, wcs_in: WCS, wcs_out: WCS, n: int) -> np.ndarray:
    yy, xx = np.mgrid[0:n, 0:n]
    ra, dec = wcs_out.pixel_to_world_values(xx.ravel(), yy.ravel())
    x, y = wcs_in.world_to_pixel_values(ra, dec)
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = x - x0, y - y0
    H, W = data.shape
    out = np.full(x.shape, np.nan)
    ok = (x0 >= 0) & (y0 >= 0) & (x0 + 1 < W) & (y0 + 1 < H)
    a, b = x0[ok], y0[ok]
    v = (data[b, a] * (1 - fx[ok]) * (1 - fy[ok]) + data[b, a + 1] * fx[ok] * (1 - fy[ok])
         + data[b + 1, a] * (1 - fx[ok]) * fy[ok] + data[b + 1, a + 1] * fx[ok] * fy[ok])
    out[ok] = v
    return out.reshape(n, n)


def reproject_to_grid(data: np.ndarray, wcs_in: WCS, wcs_out: WCS, n: int) -> np.ndarray:
    try:
        from reproject import reproject_interp
        arr, _ = reproject_interp((data, wcs_in), wcs_out, shape_out=(n, n), order="bilinear")
        return arr
    except ImportError:
        return _bilinear_fallback(data, wcs_in, wcs_out, n)


# ---------------------------------------------------------------- co-adds
def _query_epochs(ra: float, dec: float) -> Tuple[List[Dict], str]:
    rows, source = find_images(ra, dec)
    return thin_epochs(group_epochs(rows)), source


def _get_epoch(epochs: List[Dict], eid: str) -> Dict:
    for e in epochs:
        if e["id"] == eid:
            return e
    raise HTTPException(404, f"Unknown epoch '{eid}'. Call /api/v2/sky/search first for valid ids.")


def _det_rows(epoch: Dict, detector: str) -> List[Dict]:
    rows = epoch["rows"]
    if detector != "all":
        rows = [r for r in rows if r["detector"] == int(detector)]
    return rows


def _fetch_many(urls: List[str]) -> List[Optional[str]]:
    def one(u):
        try:
            return fetch_cutout(u)
        except IrsaUnavailable:
            return None
    return list(_pool.map(one, urls))


def frame_rows(epochs: List[Dict], epoch: Dict, detector: str) -> List[Dict]:
    rows = _det_rows(epoch, detector)
    if not rows:
        raise HTTPException(404, f"Epoch {epoch['id']} has no images from detector {detector}.")
    return select_rows(rows, _per_epoch(len(epochs)))


def coadd_epoch(ra, dec, fov, epochs, epoch, detector) -> Tuple[np.ndarray, Dict]:
    rows = frame_rows(epochs, epoch, detector)
    size = cutout_size_deg(fov)
    urls = [cutout_url(r["access_url"], ra, dec, size) for r in rows]
    key = _h(COADD_VERSION, round(ra, 5), round(dec, 5), round(fov, 3), GRID_ARCSEC, *sorted(urls))
    path = _cache_path("coadds", key + ".npz")
    if os.path.exists(path):
        z = np.load(path, allow_pickle=False)
        return z["arr"], json.loads(str(z["info"]))
    with _lock(path):
        if os.path.exists(path):
            z = np.load(path, allow_pickle=False)
            return z["arr"], json.loads(str(z["info"]))
        paths = _fetch_many(urls)
        grid, n = make_grid_wcs(ra, dec, fov)
        acc, cnt = np.zeros((n, n)), np.zeros((n, n))
        acc_s, cnt_s = np.zeros((n, n)), np.zeros((n, n))
        used = []
        for row, url, p in zip(rows, urls, paths):
            if p is None:
                continue
            try:
                c = load_cutout(p)
                clean, soft = science_image(c)
                arr = reproject_to_grid(clean, c["wcs"], grid, n)
                arr_s = reproject_to_grid(soft, c["wcs"], grid, n)
            except Exception as e:
                log.warning("skipping unreadable cutout %s: %s", url, e)
                continue
            ok = np.isfinite(arr)
            acc[ok] += arr[ok]
            cnt[ok] += 1
            ok = np.isfinite(arr_s)
            acc_s[ok] += arr_s[ok]
            cnt_s[ok] += 1
            used.append({"obs_id": row["obs_id"], "url": url, "detector": row["detector"],
                         "em_min_um": row["em_min_um"], "em_max_um": row["em_max_um"]})
        failed = sum(p is None for p in paths)
        if not used:
            raise IrsaUnavailable("no cutouts available")
        with np.errstate(invalid="ignore", divide="ignore"):
            coadd = np.where(cnt > 0, acc / np.maximum(cnt, 1),
                             np.where(cnt_s > 0, acc_s / np.maximum(cnt_s, 1), np.nan)).astype(np.float32)
        info = {"used": used, "failed": failed, "date_obs": epoch["date_obs"]}
        if failed == 0:
            buf = io.BytesIO()
            np.savez_compressed(buf, arr=coadd, info=np.array(json.dumps(info)))
            _atomic_write(path, buf.getvalue())
        return coadd, info


def query_stretch(ra, dec, fov, epochs, detector) -> Tuple[float, float]:
    """Percentile limits across the co-adds of ALL epochs of this query (cached),
    so brightness differences between frames are real, not stretch artefacts."""
    key = _h(COADD_VERSION, "stretch", round(ra, 5), round(dec, 5), round(fov, 3), detector, *[e["id"] for e in epochs])
    path = _cache_path("stretch", key + ".json")
    if os.path.exists(path):
        with open(path) as f:
            d = json.load(f)
        return d["lo"], d["hi"]
    vals, complete = [], True
    for e in epochs:
        if detector != "all" and not _det_rows(e, detector):
            continue
        try:
            arr, info = coadd_epoch(ra, dec, fov, epochs, e, detector)
            complete &= info["failed"] == 0
            v = arr[np.isfinite(arr)]
            if v.size:
                vals.append(v)
        except IrsaUnavailable:
            complete = False
    if not vals:
        raise IrsaUnavailable("no data for stretch")
    allv = np.concatenate(vals)
    lo, hi = float(np.percentile(allv, 1.0)), float(np.percentile(allv, 99.8))
    if hi <= lo:
        hi = lo + 1e-6
    if complete:
        _atomic_write(path, json.dumps({"lo": lo, "hi": hi}).encode())
    return lo, hi


def warm_query(ra: float, dec: float, fov: float, detector: str = "all") -> None:
    """Background prefetch after /sky/search: build every epoch's co-add and the shared
    stretch so the first frame.png requests are fast. Safe to call repeatedly."""
    key = _h(round(ra, 5), round(dec, 5), round(fov, 3), detector)
    if key in _warming:
        return
    _warming.add(key)

    def run():
        try:
            epochs, _ = _query_epochs(ra, dec)
            if epochs:
                query_stretch(ra, dec, fov, epochs, detector)
        except Exception as e:  # never let a warm-up error escape the worker
            log.info("warm-up for %s stopped: %s", key, e)
        finally:
            _warming.discard(key)
    _warm_pool.submit(run)


# ---------------------------------------------------------------- rendering
def apply_stretch(arr: np.ndarray, lo: float, hi: float, kind: str) -> np.ndarray:
    x = np.clip((np.nan_to_num(arr, nan=lo) - lo) / (hi - lo), 0, 1)
    if kind == "asinh":
        a = 0.1
        x = np.arcsinh(x / a) / np.arcsinh(1 / a)
    elif kind == "log":
        x = np.log10(1 + 1000 * x) / 3.0
    return x


def _to_png(img: np.ndarray, size: int, mode: str) -> bytes:
    """img in FITS orientation (row 0 = south). Flip so north is up in the PNG."""
    im = Image.fromarray(np.flipud(img), mode=mode)
    im = im.resize((size, size), Image.BILINEAR)
    buf = io.BytesIO()
    im.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def saturated_holes(arr: np.ndarray, thresh: float, max_iter: int = 25) -> np.ndarray:
    """Display helper: NaN pixels connected to pixels at/above ``thresh``. The SPHEREx pipeline
    blanks the cores of saturated stars; we paint those holes white ("saturated") instead
    of black ("no signal"). Data arrays are never modified."""
    nan = ~np.isfinite(arr)
    with np.errstate(invalid="ignore"):
        sat = np.isfinite(arr) & (arr >= thresh)
    filled = np.zeros_like(nan)
    for _ in range(max_iter):
        grow = np.zeros_like(nan)
        src = sat | filled
        grow[1:, :] |= src[:-1, :]; grow[:-1, :] |= src[1:, :]
        grow[:, 1:] |= src[:, :-1]; grow[:, :-1] |= src[:, 1:]
        new = grow & nan & ~filled
        if not new.any():
            break
        filled |= new
    return filled


def render_grey(arr, lo, hi, stretch, size) -> bytes:
    x = apply_stretch(arr, lo, hi, stretch)
    x[saturated_holes(arr, lo + 0.3 * (hi - lo))] = 1.0
    return _to_png((x * 255).round().astype(np.uint8), size, "L")


_DIV_STOPS = np.array([-1.0, -0.5, 0.0, 0.5, 1.0])
_DIV_RGB = np.array([[0.55, 0.80, 1.00], [0.10, 0.35, 0.95], [0.0, 0.0, 0.0], [1.00, 0.50, 0.08], [1.0, 1.0, 1.0]])


def diverging_rgb(d: np.ndarray) -> np.ndarray:
    """Map a difference image to RGB: 0 -> black, + -> orange/white, - -> blue."""
    v = d[np.isfinite(d)]
    if v.size:
        sigma = 1.4826 * float(np.median(np.abs(v - np.median(v))))   # robust noise level
        s = max(6.0 * sigma, float(np.percentile(np.abs(v), 99.5)))  # noise stays dark, real changes glow
    else:
        s = 1.0
    s = s if s > 0 else 1.0
    t = np.clip(np.nan_to_num(d, nan=0.0) / s, -1, 1)
    rgb = np.stack([np.interp(t, _DIV_STOPS, _DIV_RGB[:, i]) for i in range(3)], axis=-1)
    return (rgb * 255).round().astype(np.uint8)


# ---------------------------------------------------------------- API
router = APIRouter(prefix="/api/v2", tags=["Real SPHEREx sky (IRSA)"])

RA = Query(..., ge=0, le=360, description="Right ascension, degrees (ICRS)")
DEC = Query(..., ge=-90, le=90, description="Declination, degrees (ICRS)")
FOV = Query(6.0, ge=1, le=30, description="Field of view, arcmin")
DET = Query("all", pattern=r"^(all|[1-6])$", description="SPHEREx detector 1..6 or 'all' (co-add)")
SIZE = Query(512, ge=64, le=2048, description="Output PNG size in px")
IMG_HEADERS = {"X-Data-Tag": "Real", "Cache-Control": "public, max-age=86400"}


@router.get("/targets", summary="Preset challenge targets (positions propagated to epoch 2025.6)")
def get_targets():
    return _targets()


@router.get("/resolve", summary="Resolve an object name to RA/Dec via CDS Sesame")
def resolve(name: str = Query(..., min_length=1, max_length=120)):
    try:
        r = _session.get(f"{SESAME_URL}?{requests.utils.quote(name.strip())}", timeout=(5, 20))
    except requests.RequestException:
        raise HTTPException(503, "The CDS Sesame name resolver is not responding.")
    if r.status_code >= 500:
        raise HTTPException(503, "The CDS Sesame name resolver is not responding.")
    m_ra = re.search(r"<jradeg>([-+0-9.eE]+)</jradeg>", r.text)
    m_de = re.search(r"<jdedeg>([-+0-9.eE]+)</jdedeg>", r.text)
    if not (m_ra and m_de):
        raise HTTPException(404, f"Unknown object '{name}'.")
    m_n = re.search(r"<oname>([^<]+)</oname>", r.text)
    return {"name": (m_n.group(1).strip() if m_n else name.strip()),
            "ra": float(m_ra.group(1)), "dec": float(m_de.group(1))}


@router.get("/sky/search", summary="List SPHEREx epochs (visits) covering a sky position")
def sky_search(ra: float = RA, dec: float = DEC, fov: float = FOV):
    try:
        rows, source = find_images(ra, dec)
    except IrsaUnavailable:
        return _irsa_503()
    all_epochs = group_epochs(rows)
    epochs = thin_epochs(all_epochs)
    notes = [f"Collections searched: {', '.join(COLLECTIONS)} (NASA/IPAC IRSA)."]
    if not epochs:
        notes.append("SPHEREx has no images covering this position yet in the searched releases.")
    else:
        notes.append(f"{len(rows)} images grouped into {len(all_epochs)} visits "
                     f"(images within {EPOCH_WINDOW_DAYS:g} days of a visit's first image).")
        if len(all_epochs) > len(epochs):
            notes.append(f"Showing {len(epochs)} visits evenly spread in time (first and last included).")
        notes.append(f"Each frame co-adds up to {_per_epoch(len(epochs))} cutouts of its visit, spread over "
                     "wavelength/detectors, after subtracting the ZODI model and the median background.")
        notes.append("SPHEREx pixels are 6.2 arcsec; very fast stars move about one pixel per 6-month visit.")
        notes.append("Visits differ in which detectors (wavelengths) saw the field, so star brightness can "
                     "change between 'all detector' frames; pick a single detector for the cleanest blink.")
        warm_query(ra, dec, fov)
    if source == "cache":
        notes.append("Served from the local cache of earlier IRSA results.")
    return {
        "query": {"ra": ra, "dec": dec, "fov_arcmin": fov},
        "source": source, "data_tag": "Real",
        "epochs": [{k: e[k] for k in ("id", "date_obs", "mjd", "detectors", "n_images")} for e in epochs],
        "notes": notes,
    }


@router.get("/sky/frame.png", response_class=Response, summary="Co-added frame of one epoch on the common grid")
def sky_frame(ra: float = RA, dec: float = DEC, fov: float = FOV, epoch: str = Query(...),
              detector: str = DET, stretch: Literal["asinh", "linear", "log"] = "asinh", size: int = SIZE):
    try:
        epochs, _ = _query_epochs(ra, dec)
        e = _get_epoch(epochs, epoch)
        arr, info = coadd_epoch(ra, dec, fov, epochs, e, detector)
        lo, hi = query_stretch(ra, dec, fov, epochs, detector)
    except IrsaUnavailable:
        return _irsa_503()
    png = render_grey(arr, lo, hi, stretch, size)
    return Response(png, media_type="image/png", headers={**IMG_HEADERS, "X-Observation-Date": e["date_obs"]})


@router.get("/sky/combine.png", response_class=Response, summary="Difference (b - a) or sum of two epochs")
def sky_combine(ra: float = RA, dec: float = DEC, fov: float = FOV, a: str = Query(...), b: str = Query(...),
                op: Literal["diff", "sum"] = "diff", detector: str = DET, size: int = SIZE,
                stretch: Literal["asinh", "linear", "log"] = "asinh"):
    try:
        epochs, _ = _query_epochs(ra, dec)
        ea, eb = _get_epoch(epochs, a), _get_epoch(epochs, b)
        arr_a, _ = coadd_epoch(ra, dec, fov, epochs, ea, detector)
        arr_b, _ = coadd_epoch(ra, dec, fov, epochs, eb, detector)
        if op == "diff":
            png = _to_png(diverging_rgb(arr_b - arr_a), size, "RGB")
        else:
            lo, hi = query_stretch(ra, dec, fov, epochs, detector)
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", RuntimeWarning)
                s = np.nanmean(np.stack([arr_a, arr_b]), axis=0)
            png = render_grey(s, lo, hi, stretch, size)
    except IrsaUnavailable:
        return _irsa_503()
    return Response(png, media_type="image/png",
                    headers={**IMG_HEADERS, "X-Observation-Date": f"{ea['date_obs']}/{eb['date_obs']}"})


@router.get("/sky/spectrum", summary="On-the-fly SPHEREx spectrum at a position")
def sky_spectrum(ra: float = RA, dec: float = DEC, epoch: str = Query("all")):
    try:
        epochs, _ = _query_epochs(ra, dec)
        rows = [r for e in epochs for r in e["rows"]] if epoch == "all" else _get_epoch(epochs, epoch)["rows"]
        rows = select_rows(rows, MAX_IMAGES_PER_QUERY)
        size = cutout_size_deg(6.0)
        urls = [cutout_url(r["access_url"], ra, dec, size) for r in rows]
        paths = _fetch_many(urls)
        if rows and all(p is None for p in paths):
            raise IrsaUnavailable("no cutouts")
    except IrsaUnavailable:
        return _irsa_503()
    points, n_flag, n_fallback, n_out = [], 0, 0, 0
    for row, p in zip(rows, paths):
        if p is None:
            continue
        try:
            c = load_cutout(p)
        except Exception:
            continue
        x, y = c["wcs"].world_to_pixel_values(ra, dec)
        ix, iy = int(round(float(x))), int(round(float(y)))
        H, W = c["image"].shape
        if not (0 <= ix < W and 0 <= iy < H):
            n_out += 1
            continue
        if bad_mask(c)[iy, ix]:
            n_flag += 1
            continue
        val = float(c["image"][iy, ix]) - (float(c["zodi"][iy, ix]) if c["zodi"] is not None else 0.0)
        err = float(np.sqrt(c["variance"][iy, ix])) if c["variance"] is not None else None
        wl, from_wcs = wavelength_at(c, ix, iy, row)
        n_fallback += 0 if from_wcs else 1
        if not math.isfinite(wl):
            continue
        points.append({"wavelength_um": round(wl, 5), "flux_mjy_sr": val,
                       "error": err if err is None or math.isfinite(err) else None,
                       "detector": row["detector"], "date_obs": _mjd_to_date(row["t_min"])})
    points.sort(key=lambda p: p["wavelength_um"])
    notes = ["flux_mjy_sr is the IMAGE pixel at (ra, dec) minus IRSA's ZODI model (surface brightness, MJy/sr); "
             "error is sqrt(VARIANCE).", f"Up to {MAX_IMAGES_PER_QUERY} images used, spread over wavelength."]
    if n_fallback:
        notes.append(f"{n_fallback} wavelengths use the image's band centre (em_min+em_max)/2 because the "
                     "per-pixel spectral WCS was unavailable.")
    if n_flag:
        notes.append(f"{n_flag} measurements skipped because the pixel was flagged bad.")
    if epoch != "all" and not rows:
        notes.append("This epoch has no images.")
    return {"ra": ra, "dec": dec, "points": points, "note": " ".join(notes), "data_tag": "Real"}


@router.get("/sky/meta", summary="Provenance and quality flags for one epoch's frame")
def sky_meta(ra: float = RA, dec: float = DEC, fov: float = FOV, epoch: str = Query(...), detector: str = DET):
    try:
        epochs, _ = _query_epochs(ra, dec)
        e = _get_epoch(epochs, epoch)
        rows = frame_rows(epochs, e, detector)
        size = cutout_size_deg(fov)
        urls = [cutout_url(r["access_url"], ra, dec, size) for r in rows]
        paths = _fetch_many(urls)
        if all(p is None for p in paths):
            raise IrsaUnavailable("no cutouts")
    except IrsaUnavailable:
        return _irsa_503()
    grid, n = make_grid_wcs(ra, dec, fov)
    counts: Dict[str, int] = {}
    tot_pix, tot_bad = 0, 0
    for p in paths:
        if p is None:
            continue
        try:
            c = load_cutout(p)
        except Exception:
            continue
        H, W = c["image"].shape
        yy, xx = np.mgrid[0:H, 0:W]
        wr, wd = c["wcs"].pixel_to_world_values(xx.ravel(), yy.ravel())
        gx, gy = grid.world_to_pixel_values(wr, wd)
        inside = ((gx >= -0.5) & (gx < n - 0.5) & (gy >= -0.5) & (gy < n - 0.5)).reshape(H, W)
        tot_pix += int(inside.sum())
        tot_bad += int((bad_mask(c) & inside).sum())
        fl = c["flags"]
        if fl is None:
            continue
        names = c["flag_names"] or {f"bit_{b}": b for b in range(32)}
        for nm, b in names.items():
            k = int((((fl >> b) & 1) == 1)[inside].sum())
            counts[nm] = counts.get(nm, 0) + k
    wls = [v for r in rows for v in (r["em_min_um"], r["em_max_um"]) if v]
    return {
        "epoch": e["id"], "date_obs": e["date_obs"], "n_images": len(rows), "n_available": len(_det_rows(e, detector)),
        "obs_ids": [r["obs_id"] for r in rows], "detectors": sorted({r["detector"] for r in rows if r["detector"]}),
        "wavelength_range_um": [round(min(wls), 4), round(max(wls), 4)] if wls else None,
        "flags": counts, "flagged_fraction": round(tot_bad / tot_pix, 5) if tot_pix else None,
        "bad_flags_masked": sorted(BAD_FLAG_NAMES), "source_urls": urls, "data_tag": "Real",
    }
