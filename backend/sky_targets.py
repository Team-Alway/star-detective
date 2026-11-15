"""Preset sky targets for the NASA Space Apps "Planet X and SPHEREx" challenge.

Catalogue values were taken from the CDS Sesame name resolver (SIMBAD), which
gives ICRS positions at epoch J2000.0 together with proper motion
(pm_ra is pm_ra*cos(dec)), parallax and radial velocity. Sources quoted by
Sesame: Gaia EDR3 (2020yCat.1350) for Barnard's Star, eps Ind B and R Dra;
Kirkpatrick et al. 2021 (ApJS 253, 7) for WISE 0855-0714; van Leeuwen 2007
(Hipparcos) for RW Aur.

The fast movers are propagated to ``TARGET_EPOCH`` (2025.6, mid SPHEREx survey
year 1) with ``SkyCoord.apply_space_motion`` so the star is actually in the
middle of a small field. Barnard's Star moves ~10.4"/yr, i.e. ~4.4' between
2000 and 2025.6 -- J2000 coordinates would put it off a 6' field.

Sanity check: propagating WISE 0855's J2000 Sesame position to 2010.5 lands
within 0.5" of the challenge brief's 08h55m10.831s -07d14m42.53s.
"""
from functools import lru_cache
from typing import Dict, List

import astropy.units as u
from astropy.coordinates import Distance, SkyCoord
from astropy.time import Time

TARGET_EPOCH = 2025.6

# id, name, ra2000, dec2000, pmra_cosdec mas/yr, pmdec mas/yr, plx mas, rv km/s, fov, kind, description
_RAW = [
    ("barnards_star", "Barnard's Star", 269.4520769586187, 4.69336496657667,
     -801.551, 10362.394, 546.9759, -110.11, 4.0, "high_proper_motion_star",
     "The fastest-moving star in our sky (10.4 arcsec per year), a red dwarf just 6 light-years "
     "away. Between SPHEREx visits it shifts by about one pixel, so compare the earliest and "
     "latest epochs with a small field."),
    ("eps_indi_b", "Epsilon Indi B", 331.04414658852124, -56.78284419511611,
     3981.977, -2466.832, 270.6580, None, 4.0, "brown_dwarf",
     "A pair of brown dwarfs 12 light-years away, racing across the sky at 4.7 arcsec per year. "
     "Brown dwarfs glow brightest at the long infrared wavelengths SPHEREx sees (try detectors 4-6)."),
    ("wise0855", "WISE 0855-0714", 133.81890825, -7.247048,
     -8123.7, 673.2, 439.0, None, 4.0, "brown_dwarf",
     "The coldest known brown dwarf (about -25 C), 7.4 light-years away, moving 8.1 arcsec per "
     "year. It is almost invisible at short wavelengths and appears only around 4-5 microns "
     "(detector 6)."),
    ("rw_aur", "RW Aurigae", 76.95652603458, 30.40143817389,
     7.23, -20.33, 15.42, 15.0, 6.0, "variable_star",
     "A young T Tauri star whose dusty disk makes its brightness jump and dip. It does not move; "
     "watch for its brightness changing between epochs."),
    ("r_dra", "R Draconis", 248.16761083295, 66.75497941722,
     -20.643, 6.149, 1.2509, -132.8, 6.0, "variable_star",
     "A Mira-type pulsating red giant with a ~245-day cycle. It sits close to the north ecliptic "
     "pole, where SPHEREx looks very often."),
]


def _propagate(ra, dec, pmra, pmdec, plx, rv, epoch=TARGET_EPOCH):
    kw = dict(ra=ra * u.deg, dec=dec * u.deg, pm_ra_cosdec=pmra * u.mas / u.yr,
              pm_dec=pmdec * u.mas / u.yr, distance=Distance(parallax=plx * u.mas),
              obstime=Time(2000.0, format="jyear"), frame="icrs")
    if rv is not None:
        kw["radial_velocity"] = rv * u.km / u.s
    c = SkyCoord(**kw).apply_space_motion(new_obstime=Time(epoch, format="jyear"))
    return float(c.ra.deg), float(c.dec.deg)


@lru_cache(maxsize=1)
def targets() -> List[Dict]:
    out = []
    for (tid, name, ra, dec, pmra, pmdec, plx, rv, fov, kind, desc) in _RAW:
        ra_e, dec_e = _propagate(ra, dec, pmra, pmdec, plx, rv)
        out.append({
            "id": tid, "name": name, "ra": round(ra_e, 6), "dec": round(dec_e, 6),
            "fov_arcmin": fov, "kind": kind, "description": desc,
        })
    return out
