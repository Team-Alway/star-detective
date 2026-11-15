"""Unit tests for sky.py (no network). Run: .venv/bin/python -m pytest tests -q"""
import io
import os
import sys

import numpy as np
import pytest
from astropy.io import fits
from astropy.wcs import WCS
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sky  # noqa: E402


# ------------------------------------------------------------- helpers
def fake_spherex_wcs(ra0, dec0, n=120, rot_deg=33.0, scale_arcsec=6.2):
    """A rotated TAN WCS with SPHEREx-like 6.2"/px pixels (not north-up on purpose)."""
    w = WCS(naxis=2)
    w.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    w.wcs.crval = [ra0, dec0]
    w.wcs.crpix = [n / 2 + 3.3, n / 2 - 7.1]
    s = scale_arcsec / 3600
    t = np.deg2rad(rot_deg)
    w.wcs.cd = [[-s * np.cos(t), s * np.sin(t)], [s * np.sin(t), s * np.cos(t)]]
    return w


def star_image(w, n, ra, dec, amp=100.0, sigma=1.0):
    x0, y0 = w.world_to_pixel_values(ra, dec)
    yy, xx = np.mgrid[0:n, 0:n]
    return amp * np.exp(-((xx - x0) ** 2 + (yy - y0) ** 2) / (2 * sigma ** 2))


def write_fake_cutout(path, w, img, flags=None, zodi=None, flag_bits=None):
    hdr = w.to_header()
    pri = fits.PrimaryHDU()
    im = fits.ImageHDU(img.astype(np.float32), header=hdr, name="IMAGE")
    fh = fits.Header()
    for name, bit in (flag_bits or {"TRANSIENT": 0, "OVERFLOW": 1, "SOURCE": 21}).items():
        fh[f"HIERARCH MP_{name}"] = bit
    fl = fits.ImageHDU((flags if flags is not None else np.zeros(img.shape, np.int32)).astype(np.int32), header=fh, name="FLAGS")
    var = fits.ImageHDU(np.full(img.shape, 0.04, np.float32), name="VARIANCE")
    zo = fits.ImageHDU((zodi if zodi is not None else np.zeros(img.shape)).astype(np.float32), name="ZODI")
    fits.HDUList([pri, im, fl, var, zo]).writeto(path, overwrite=True)


# ------------------------------------------------------------- epoch grouping
def row(t, det=1, wl=1.0, url=None):
    return {"access_url": url or f"u{t}-{det}-{wl}", "obs_id": f"o{t}", "t_min": t, "t_max": t + 0.01,
            "detector": det, "em_min_um": wl, "em_max_um": wl + 0.02}


def test_group_epochs_basic():
    rows = [row(60800.0), row(60801.5, 2), row(60800.7, 3), row(60983.2), row(60984.9, 6), row(61170.0)]
    ep = sky.group_epochs(rows)
    assert [e["n_images"] for e in ep] == [3, 2, 1]
    assert ep[0]["detectors"] == [1, 2, 3]
    assert ep[1]["detectors"] == [1, 6]
    assert ep[0]["id"] < ep[1]["id"] < ep[2]["id"]          # sorted by time, ISO-date ids
    assert len({e["id"] for e in ep}) == 3


def test_group_epochs_anchor_window_not_chain():
    # continuous coverage every day (e.g. near the ecliptic poles) must not merge into one giant epoch
    rows = [row(60000.0 + d) for d in range(10)]
    ep = sky.group_epochs(rows, window_days=2.0)
    assert all(e["n_images"] <= 3 for e in ep)
    assert sum(e["n_images"] for e in ep) == 10


def test_thin_epochs_keeps_ends():
    eps = [{"id": str(i)} for i in range(100)]
    t = sky.thin_epochs(eps, 24)
    assert len(t) == 24 and t[0]["id"] == "0" and t[-1]["id"] == "99"


def test_select_rows_spreads_wavelength():
    rows = [row(1, det=1 + i // 17, wl=0.75 + i * 0.04) for i in range(102)]
    sel = sky.select_rows(rows, 6)
    assert len(sel) == 6
    assert sel[0]["em_min_um"] == pytest.approx(0.75) and sel[-1]["em_min_um"] == pytest.approx(0.75 + 101 * 0.04)


def test_normalize_rows():
    raw = [{"ACCESS_URL": "https://x/a_D3_.fits", "t_min": "60850.1", "em_min": "1.1e-6", "em_max": "1.2e-6",
            "energy_bandpassname": "SPHEREx-D3", "obs_id": "abc"},
           {"access_url": "https://x/a_D3_.fits", "t_min": "60850.1"},             # duplicate
           {"access_url": "", "t_min": "1"}]
    out = sky.normalize_rows(raw)
    assert len(out) == 1 and out[0]["detector"] == 3
    assert out[0]["em_min_um"] == pytest.approx(1.1)


# ------------------------------------------------------------- grid / reprojection
@pytest.mark.parametrize("use_fallback", [False, True])
def test_star_lands_on_correct_grid_pixel(use_fallback):
    ra0, dec0 = 133.79, -7.24
    w = fake_spherex_wcs(ra0 + 0.01, dec0 - 0.008)
    star_ra, star_dec = ra0 + 0.6 / 60, dec0 + 0.9 / 60    # 0.6' east, 0.9' north of centre
    img = star_image(w, 120, star_ra, star_dec, sigma=1.2)
    grid, n = sky.make_grid_wcs(ra0, dec0, 6.0)
    if use_fallback:
        out = sky._bilinear_fallback(img, w, grid, n)
    else:
        out = sky.reproject_to_grid(img, w, grid, n)
    exp_x, exp_y = grid.world_to_pixel_values(star_ra, star_dec)
    py, px = np.unravel_index(np.nanargmax(out), out.shape)
    assert abs(px - exp_x) <= 1 and abs(py - exp_y) <= 1
    # orientation: east -> smaller x (left), north -> larger y in FITS = upper half after flip
    c = (n - 1) / 2
    assert exp_x < c and exp_y > c


def test_grid_is_north_up_east_left_in_png():
    ra0, dec0 = 10.0, 20.0
    grid, n = sky.make_grid_wcs(ra0, dec0, 6.0)
    arr = np.zeros((n, n))
    x, y = grid.world_to_pixel_values(ra0 + 1.5 / 60 / np.cos(np.deg2rad(dec0)), dec0 + 1.5 / 60)  # NE of centre
    arr[int(round(float(y))), int(round(float(x)))] = 1
    png = sky.render_grey(arr, 0, 1, "linear", n)
    a = np.array(Image.open(io.BytesIO(png)))
    r, c = np.unravel_index(np.argmax(a), a.shape)
    assert r < n / 2 and c < n / 2   # top-left in the PNG = north-east


def test_coadd_aligns_two_detectors_and_ignores_flags(tmp_path, monkeypatch):
    monkeypatch.setattr(sky, "CACHE_DIR", str(tmp_path))
    ra0, dec0 = 269.446, 4.767
    star = (ra0 - 0.3 / 60, dec0 + 0.2 / 60)
    files = {}
    rows = []
    for i, (rot, det) in enumerate([(10.0, 1), (-55.0, 4)]):
        w = fake_spherex_wcs(ra0, dec0, rot_deg=rot)
        img = star_image(w, 120, *star) + 5.0                          # + background
        flags = np.zeros((120, 120), np.int32)
        if i == 1:  # a hot "cosmic ray" flagged TRANSIENT in the second image only
            cx, cy = w.world_to_pixel_values(ra0 + 1 / 60, dec0 - 1 / 60)
            img[int(cy), int(cx)] = 1e6
            flags[int(cy), int(cx)] = 1 << 0
        p = tmp_path / f"c{i}.fits"
        write_fake_cutout(str(p), w, img, flags=flags, zodi=np.full((120, 120), 2.0))
        url = f"https://irsa.example/img{i}.fits"
        rows.append(row(60800 + i * 0.1, det=det, wl=1 + 3 * i, url=url))
        files[url] = str(p)
    monkeypatch.setattr(sky, "fetch_cutout", lambda u: files[u.split("?")[0]])
    epochs = sky.group_epochs(rows)
    assert len(epochs) == 1
    arr, info = sky.coadd_epoch(ra0, dec0, 4.0, epochs, epochs[0], "all")
    assert len(info["used"]) == 2 and info["failed"] == 0
    grid, n = sky.make_grid_wcs(ra0, dec0, 4.0)
    ex, ey = grid.world_to_pixel_values(*star)
    py, px = np.unravel_index(np.nanargmax(arr), arr.shape)
    assert abs(px - ex) <= 1 and abs(py - ey) <= 1
    assert np.nanmax(arr) < 1000          # the flagged 1e6 pixel was masked
    assert abs(np.nanmedian(arr)) < 1     # zodi + median background removed
    # cached second call
    arr2, _ = sky.coadd_epoch(ra0, dec0, 4.0, epochs, epochs[0], "all")
    assert np.allclose(np.nan_to_num(arr), np.nan_to_num(arr2))


def test_flag_decoding_and_mask(tmp_path):
    w = fake_spherex_wcs(0, 0, n=10)
    fl = np.zeros((10, 10), np.int32)
    fl[0, 0] = 1 << 21   # SOURCE: real source, must NOT be masked
    fl[1, 1] = 1 << 1    # OVERFLOW: masked
    p = tmp_path / "f.fits"
    write_fake_cutout(str(p), w, np.ones((10, 10)), flags=fl)
    c = sky.load_cutout(str(p))
    assert c["flag_names"] == {"TRANSIENT": 0, "OVERFLOW": 1, "SOURCE": 21}
    m = sky.bad_mask(c)
    assert not m[0, 0] and m[1, 1] and m.sum() == 1


def test_flag_decoding_real_spherex_layout():
    # layout copied from a real SPHEREx DR1 L2 FLAGS header
    h = fits.Header()
    h["MSKN0000"] = "TRANSIENT"; h["MSKM0000"] = 1
    h["MSKN0021"] = "SOURCE"; h["MSKM0021"] = 2097152
    h["MSKN0027"] = "SNOWBALL"; h["MSKM0027"] = 134217728
    assert sky._flag_names(h) == {"TRANSIENT": 0, "SOURCE": 21, "SNOWBALL": 27}


def test_diverging_map_centre_black():
    d = np.zeros((5, 5)); d[0, 0] = 1; d[4, 4] = -1
    rgb = sky.diverging_rgb(d)
    assert tuple(rgb[2, 2]) == (0, 0, 0)
    assert rgb[0, 0, 0] > 200 and rgb[4, 4, 2] > 200 and rgb[4, 4, 0] < rgb[4, 4, 2]


def test_cutout_url():
    u = sky.cutout_url("https://irsa.ipac.caltech.edu/ibe/data/spherex/x.fits", 10.5, -3.25, 0.15)
    assert u.endswith("x.fits?center=10.500000,-3.250000&size=0.1500")
    assert sky.cutout_size_deg(6) == sky.cutout_size_deg(4)


# ------------------------------------------------------------- API validation
@pytest.fixture
def client():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    app = FastAPI()
    app.include_router(sky.router)
    return TestClient(app)


@pytest.mark.parametrize("q", ["ra=400&dec=0", "ra=-1&dec=0", "ra=10&dec=91", "ra=10&dec=0&fov=0.5",
                               "ra=10&dec=0&fov=31", "dec=0", "ra=abc&dec=0"])
def test_search_validation(client, q):
    assert client.get(f"/api/v2/sky/search?{q}").status_code == 422


def test_frame_validation(client):
    assert client.get("/api/v2/sky/frame.png?ra=10&dec=0&epoch=x&detector=7").status_code == 422
    assert client.get("/api/v2/sky/frame.png?ra=10&dec=0&epoch=x&stretch=sqrt").status_code == 422
    assert client.get("/api/v2/sky/combine.png?ra=10&dec=0&a=x&b=y&op=mul").status_code == 422


def test_search_irsa_down_returns_503(client, monkeypatch, tmp_path):
    monkeypatch.setattr(sky, "CACHE_DIR", str(tmp_path))
    def boom(*a, **k):
        raise sky.IrsaUnavailable("down")
    monkeypatch.setattr(sky, "_http_get", boom)
    r = client.get("/api/v2/sky/search?ra=12.3&dec=4.5")
    assert r.status_code == 503 and r.json()["retry_after"] == 60 and "IRSA" in r.json()["detail"]


def test_search_no_coverage(client, monkeypatch, tmp_path):
    monkeypatch.setattr(sky, "CACHE_DIR", str(tmp_path))
    monkeypatch.setattr(sky, "_sia_query", lambda *a: [])
    r = client.get("/api/v2/sky/search?ra=12.3&dec=4.5")
    assert r.status_code == 200 and r.json()["epochs"] == [] and r.json()["notes"]


def test_targets(client):
    t = {x["id"]: x for x in client.get("/api/v2/targets").json()}
    assert set(t) == {"barnards_star", "eps_indi_b", "wise0855", "rw_aur", "r_dra"}
    # Barnard's Star moved ~4.4' north since J2000 (Dec 4.6934 at J2000)
    assert 4.76 < t["barnards_star"]["dec"] < 4.775
    assert {x["kind"] for x in t.values()} <= {"brown_dwarf", "high_proper_motion_star", "variable_star"}


def test_saturated_hole_painted_white_but_isolated_nan_black():
    a = np.zeros((9, 9)); a[3:6, 3:6] = 10.0; a[4, 4] = np.nan     # blanked core of a bright star
    a[0, 8] = np.nan                                               # isolated missing pixel
    m = sky.saturated_holes(a, 5.0)
    assert m[4, 4] and not m[0, 8]
