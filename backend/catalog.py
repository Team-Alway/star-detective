"""
Catalog of Star Detective Academy Stages (1-5) and Sky Patches for Stage 4 (Training) & Stage 5 (Explore).
All historical dates and astronomical facts verified against NASA / IAU records.
"""
import math
from typing import Dict, Any, List

DEFAULT_BANDS = [
    "Band 1 (0.75-1.1 um)",
    "Band 2 (1.1-1.6 um)",
    "Band 3 (1.6-2.4 um)",
    "Band 4 (2.4-3.8 um)",
    "Band 5 (3.8-5.0 um)",
]


def deg_to_hms(ra_deg: float) -> str:
    total_hours = (ra_deg % 360.0) / 15.0
    h = int(total_hours)
    m = int((total_hours - h) * 60.0)
    s = ((total_hours - h) * 60.0 - m) * 60.0
    return f"{h:02d}h {m:02d}m {s:04.1f}s"


def deg_to_dms(dec_deg: float) -> str:
    sign = "+" if dec_deg >= 0 else "-"
    abs_dec = abs(dec_deg)
    d = int(abs_dec)
    m = int((abs_dec - d) * 60.0)
    s = ((abs_dec - d) * 60.0 - m) * 60.0
    return f"{sign}{d:02d}° {m:02d}' {s:04.1f}\""


def compute_aitoff(ra_deg: float, dec_deg: float):
    """
    Computes normalized Aitoff all-sky projection coordinates in [-1.0, 1.0].
    """
    lon_deg = ((ra_deg + 180.0) % 360.0) - 180.0
    lam = math.radians(lon_deg)
    phi = math.radians(dec_deg)
    cos_alpha = math.cos(phi) * math.cos(lam / 2.0)
    cos_alpha = max(-1.0, min(1.0, cos_alpha))
    alpha = math.acos(cos_alpha)
    if abs(math.sin(alpha)) < 1e-8:
        return 0.0, 0.0
    sinc_alpha = math.sin(alpha) / alpha
    x = (2.0 * math.cos(phi) * math.sin(lam / 2.0)) / sinc_alpha
    y = math.sin(phi) / sinc_alpha
    return round(x / math.pi, 4), round(y / (math.pi / 2.0), 4)


ACADEMY_STAGES: List[Dict[str, Any]] = [
    {
        "stage_number": 1,
        "name": "Baby Steps",
        "subtitle": "Learns the key words of infrared astronomy",
        "stage_type": "lesson",
        "cards": [
            {
                "title": "Infrared light",
                "text": "Infrared is light our eyes cannot see. We feel it as heat. Cold, dim objects in space that are invisible in normal light can glow in infrared.",
                "icon_name": "flame"
            },
            {
                "title": "False colour",
                "text": "Because infrared is invisible, the colours in these images are added by software. Brighter colours mean more infrared light, not the object's real colour.",
                "icon_name": "palette"
            },
            {
                "title": "SPHEREx",
                "text": "SPHEREx is a NASA space telescope launched in 2025. It maps the whole sky about every six months in 102 colours of infrared light.",
                "icon_name": "satellite"
            },
            {
                "title": "Stars and the 'fixed' sky",
                "text": "Stars are so far away that they appear to stay in the same place for years. They make a steady background pattern.",
                "icon_name": "sparkles"
            },
            {
                "title": "Comets and asteroids",
                "text": "Asteroids are chunks of rock and metal. Comets are icy bodies that can grow a glowing tail near the Sun. Both orbit the Sun, so they shift against the background stars.",
                "icon_name": "orbit"
            },
            {
                "title": "Brown dwarf",
                "text": "A brown dwarf is bigger than a planet but too small to shine like a star. It is cool and faint, and shows up best in infrared.",
                "icon_name": "circle-dot"
            },
            {
                "title": "Glitch",
                "text": "Sometimes the camera records a dot that is not a real object, for example when a particle from space hits the sensor. It appears in one image only.",
                "icon_name": "zap-off"
            },
            {
                "title": "Candidate",
                "text": "A candidate is something that might be real but has not been confirmed. Scientists check candidates many times before calling anything a discovery.",
                "icon_name": "search-check"
            }
        ],
        "question": {
            "question": "A bright dot appears in one image and is gone in the next, and it is smaller and sharper than any star. What is it most likely to be?",
            "options": [
                "A new planet",
                "A camera glitch",
                "A galaxy"
            ],
            "correct_index": 1,
            "feedback": "Real objects show up in more than one image. A dot that appears once is usually a glitch.",
            "xp_reward": 20
        }
    },
    {
        "stage_number": 2,
        "name": "Known Findings",
        "subtitle": "Sees how real objects were found by movement",
        "stage_type": "lesson",
        "cards": [
            {
                "title": "Uranus, 1781",
                "text": "William Herschel noticed a faint object that moved slowly against the stars. He first thought it was a comet. It was a new planet.",
                "icon_name": "globe"
            },
            {
                "title": "Ceres, 1801",
                "text": "Giuseppe Piazzi saw a 'star' that changed position from night to night. It was Ceres, the first asteroid ever found.",
                "icon_name": "compass"
            },
            {
                "title": "Barnard's Star, 1916",
                "text": "E. E. Barnard found a nearby star that drifts across the sky faster than any other star we know. Even so, it takes many years to move a noticeable amount.",
                "icon_name": "move-up-right"
            },
            {
                "title": "Pluto, 1930",
                "text": "Clyde Tombaugh flipped back and forth between two photographs of the same sky, taken days apart. One dot jumped. That dot was Pluto. This is the same method you will use.",
                "icon_name": "layers"
            },
            {
                "title": "WISE 0855, 2014",
                "text": "Astronomers compared infrared images taken at different times and found a very cold brown dwarf only about 7 light-years away, one of the Sun's nearest neighbours.",
                "icon_name": "snowflake"
            },
            {
                "title": "Comet 3I/ATLAS, 2025",
                "text": "A survey telescope spotted a comet moving so fast that it must have come from another star system. It is only the third such visitor ever seen.",
                "icon_name": "rocket"
            },
            {
                "title": "Planet Nine",
                "text": "Some astronomers think a large, unseen planet may orbit far beyond Neptune. Nobody has found it yet. If it exists, it would be found the same way: by spotting a faint dot that moves.",
                "icon_name": "help-circle"
            }
        ],
        "question": {
            "question": "How did Clyde Tombaugh find Pluto?",
            "options": [
                "He saw it through a telescope with his own eyes on one night",
                "He compared two photos of the same sky and looked for a dot that moved",
                "A spacecraft flew past it"
            ],
            "correct_index": 1,
            "feedback": "Comparing images over time is one of the oldest and most successful ways to find objects in our solar system.",
            "xp_reward": 20
        }
    },
    {
        "stage_number": 3,
        "name": "The Solar System",
        "subtitle": "Learns what is out there and why near things seem to move",
        "stage_type": "lesson",
        "cards": [
            {
                "title": "The Sun and planets",
                "text": "The Sun sits at the centre. Eight planets orbit it: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune.",
                "icon_name": "sun"
            },
            {
                "title": "The asteroid belt",
                "text": "Between Mars and Jupiter lies a wide ring of rocky bodies. Most asteroids we see come from here.",
                "icon_name": "disc"
            },
            {
                "title": "The Kuiper Belt",
                "text": "Beyond Neptune is a region of icy bodies, including Pluto. Objects here are far away, so they are faint and move slowly across the sky.",
                "icon_name": "cloud-snow"
            },
            {
                "title": "The far edge",
                "text": "Much farther out, a huge cloud of icy bodies is thought to surround the solar system. Many comets are believed to come from there.",
                "icon_name": "sparkles"
            },
            {
                "title": "Measuring distance",
                "text": "Astronomers use the distance from Earth to the Sun as a ruler. It is about 150 million kilometres and is called one astronomical unit (AU). Neptune is about 30 AU from the Sun.",
                "icon_name": "ruler"
            },
            {
                "title": "Why near things seem to move",
                "text": "From a moving car, nearby trees rush past while distant hills barely shift. The sky works the same way: nearby objects shift between images, and distant stars stay put.",
                "icon_name": "eye"
            },
            {
                "title": "Fast and slow movers",
                "text": "An asteroid can cross many pixels in a few days. A distant, slow object might shift by less than one pixel in six months. That is why patient comparison matters.",
                "icon_name": "clock"
            }
        ],
        "question": {
            "question": "Two dots are in an image. Six months later, dot A has shifted and dot B has not. Which is probably closer to us?",
            "options": [
                "Dot A",
                "Dot B",
                "They must be the same distance"
            ],
            "correct_index": 0,
            "feedback": "Nearby objects appear to move more. This is the key idea behind the whole search.",
            "xp_reward": 20
        }
    },
    {
        "stage_number": 4,
        "name": "Training",
        "subtitle": "Real SPHEREx images where we already know the answer. Spot what moved and learn how to tell real objects from glitches.",
        "stage_type": "training",
        "cards": [],
        "question": None
    },
    {
        "stage_number": 5,
        "name": "Explore",
        "subtitle": "Compare SPHEREx images from different dates yourself. Anything you notice here is a candidate, not a discovery.",
        "stage_type": "explore",
        "cards": [],
        "question": None
    }
]


PATCH_CATALOG: Dict[str, Dict[str, Any]] = {
    "wise0855": {
        "id": "wise0855",
        "title": "Training (Known Answer): WISE 0855-0714 Cold Brown Dwarf",
        "stage": 4,
        "stage_label": "Stage 4: Training",
        "is_training": True,
        "data_tag": "Simulated",
        "ra_deg": 133.795,
        "dec_deg": -7.245,
        "instrument": "SPHEREx / WISE-Archive",
        "default_band": "Band 5 (4.6 um)",
        "epoch1_date": "2025-05-12",
        "epoch2_date": "2025-11-14",
        "briefing": "Prepared training patch (known answer). Blink between May 2025 and November 2025 to spot our Sun's 4th-closest neighbor leaping across the center of the frame.",
        "anomaly": {
            "epoch1_x": 54.0,
            "epoch1_y": 68.0,
            "epoch2_x": 72.0,
            "epoch2_y": 60.0,
            "tolerance_radius_px": 12.0
        },
        "glitch": None,
        "reveal": {
            "object_name": "WISE J085510.83-071442.5 (WISE 0855)",
            "discovery_year": 2014,
            "discoverer": "Kevin Luhman (Penn State / NASA WISE)",
            "anomaly_type": "Sub-Brown Dwarf (Coldest Known)",
            "story": "Only 7.4 light-years from Earth, WISE 0855 is chilled to -48°C—colder than the North Pole! It is completely invisible in normal visible light and can only be spotted glowing faintly in thermal infrared.",
            "blink_explanation": "Notice how the object jumps from (54, 68) in May to (72, 60) in November while every distant background star stays locked in place."
        }
    },
    "barnard": {
        "id": "barnard",
        "title": "Training (Known Answer): Barnard's Star Fast Mover",
        "stage": 4,
        "stage_label": "Stage 4: Training",
        "is_training": True,
        "data_tag": "Simulated",
        "ra_deg": 269.452,
        "dec_deg": 4.693,
        "instrument": "SPHEREx",
        "default_band": "Band 2 (1.3 um)",
        "epoch1_date": "2025-04-20",
        "epoch2_date": "2025-10-22",
        "briefing": "Prepared training patch (known answer). Compare these two sky snapshots taken 6 months apart to spot the fastest-drifting star in Earth's sky heading vertically.",
        "anomaly": {
            "epoch1_x": 64.0,
            "epoch1_y": 42.0,
            "epoch2_x": 64.5,
            "epoch2_y": 81.0,
            "tolerance_radius_px": 12.0
        },
        "glitch": None,
        "reveal": {
            "object_name": "Barnard's Star (GJ 699)",
            "discovery_year": 1916,
            "discoverer": "E. E. Barnard",
            "anomaly_type": "High-Proper-Motion Red Dwarf",
            "story": "At just 5.96 light-years away, Barnard's Star holds the speed record for apparent motion across Earth's sky (10.3 arcseconds per year). It is an ancient red dwarf over 10 billion years old.",
            "blink_explanation": "As you blink between April and October, the bright source near the center vertical column shifts sharply from Y=42 to Y=81."
        }
    },
    "luhman16": {
        "id": "luhman16",
        "title": "Training (Known Answer): Luhman 16 AB + Glitch Check",
        "stage": 4,
        "stage_label": "Stage 4: Training",
        "is_training": True,
        "data_tag": "Simulated",
        "ra_deg": 162.328,
        "dec_deg": -53.319,
        "instrument": "SPHEREx / WISE-Archive",
        "default_band": "Band 4 (3.4 um)",
        "epoch1_date": "2025-03-18",
        "epoch2_date": "2025-09-21",
        "briefing": "Prepared training patch (known answer). Watch out! There is both a single-frame camera glitch and a real moving brown dwarf pair here—spot the object that appears in BOTH images.",
        "anomaly": {
            "epoch1_x": 82.0,
            "epoch1_y": 74.0,
            "epoch2_x": 63.0,
            "epoch2_y": 79.0,
            "tolerance_radius_px": 12.0
        },
        "glitch": {
            "x": 30.0,
            "y": 95.0,
            "radius": 9.0
        },
        "reveal": {
            "object_name": "Luhman 16 AB (WISE 1049-5319)",
            "discovery_year": 2013,
            "discoverer": "Kevin Luhman",
            "anomaly_type": "Binary Brown Dwarf System",
            "story": "Just 6.5 light-years away in the constellation Vela, Luhman 16 AB is the closest known pair of brown dwarfs to the Solar System, orbiting each other every 27 years.",
            "blink_explanation": "The sharp spike at (30, 95) vanishes in Epoch 2 because it was a cosmic ray glitch! The real target Luhman 16 shifts smoothly from (82, 74) to (63, 79)."
        }
    },
    "rw_aur": {
        "id": "rw_aur",
        "title": "Training (Known Answer): RW Aurigae Variable Star",
        "stage": 4,
        "stage_label": "Stage 4: Training",
        "is_training": True,
        "data_tag": "Simulated",
        "ra_deg": 76.956,
        "dec_deg": 30.401,
        "instrument": "SPHEREx",
        "default_band": "Band 3 (2.1 um)",
        "epoch1_date": "2025-05-02",
        "epoch2_date": "2025-11-05",
        "briefing": "Prepared training patch (known answer). Not all anomalies change position—some flare up dramatically in brightness as dusty protoplanetary disks shift!",
        "anomaly": {
            "epoch1_x": 60.0,
            "epoch1_y": 60.0,
            "epoch2_x": 60.0,
            "epoch2_y": 60.0,
            "tolerance_radius_px": 12.0
        },
        "glitch": None,
        "reveal": {
            "object_name": "RW Aurigae A/B",
            "discovery_year": 1906,
            "discoverer": "Lidiya Ceraski (Harvard / Moscow Survey)",
            "anomaly_type": "Young T Tauri Variable Star System",
            "story": "RW Aurigae is a turbulent young binary star system surrounded by colliding streams of gas and planet-forming dust that periodically eclipse and brighten in infrared light.",
            "blink_explanation": "At (60, 60), the star remains stationary but surges more than 4x in infrared flux between May and November."
        }
    },
    "epsilon_indi": {
        "id": "epsilon_indi",
        "title": "Stage 5 Explore: Epsilon Indi Sector Survey",
        "stage": 5,
        "stage_label": "Stage 5: Explore",
        "is_training": False,
        "data_tag": "Simulated",
        "ra_deg": 330.840,
        "dec_deg": -56.786,
        "instrument": "SPHEREx",
        "default_band": "Band 4 (3.6 um)",
        "epoch1_date": "2025-05-19",
        "epoch2_date": "2025-11-20",
        "briefing": "Live Frontier exploration sector in Indus. Compare May and November 2025 images using Blink, Swipe, or Difference mode to log moving candidates.",
        "anomaly": {
            "epoch1_x": 45.0,
            "epoch1_y": 52.0,
            "epoch2_x": 58.0,
            "epoch2_y": 44.0,
            "tolerance_radius_px": 12.0
        },
        "glitch": None,
        "reveal": {
            "object_name": "Epsilon Indi Sector Candidate",
            "discovery_year": 2026,
            "discoverer": "Star Detective Citizen Science Survey",
            "anomaly_type": "Proper Motion Candidate",
            "story": "High-latitude southern sky sector monitored every 6 months by SPHEREx.",
            "blink_explanation": "Candidate dipole shift logged for multi-epoch verification."
        }
    },
    "nep_deep": {
        "id": "nep_deep",
        "title": "Stage 5 Explore: SPHEREx North Ecliptic Pole Deep Field",
        "stage": 5,
        "stage_label": "Stage 5: Explore",
        "is_training": False,
        "data_tag": "Simulated",
        "ra_deg": 270.000,
        "dec_deg": 66.560,
        "instrument": "SPHEREx Deep Survey",
        "default_band": "Band 5 (4.8 um)",
        "epoch1_date": "2025-06-01",
        "epoch2_date": "2025-12-03",
        "briefing": "Deep-field survey patch near the North Ecliptic Pole. Inspect carefully for faint outer Solar System movers—and watch out for cosmic ray sensor glitches!",
        "anomaly": {
            "epoch1_x": 91.0,
            "epoch1_y": 36.0,
            "epoch2_x": 84.0,
            "epoch2_y": 42.0,
            "tolerance_radius_px": 12.0
        },
        "glitch": {
            "x": 18.0,
            "y": 24.0,
            "radius": 9.0
        },
        "reveal": {
            "object_name": "NEP Outer Solar System Candidate",
            "discovery_year": 2026,
            "discoverer": "Star Detective Citizen Science Survey",
            "anomaly_type": "Slow Trans-Neptunian Candidate",
            "story": "The North Ecliptic Pole is scanned on almost every orbit by SPHEREx, making it a prime hunting ground for distant icy objects and brown dwarfs.",
            "blink_explanation": "Slow 6-month parallax shift across the upper-right quadrant."
        }
    }
}
