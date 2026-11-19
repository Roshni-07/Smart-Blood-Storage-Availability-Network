"""Domain constants: blood groups, components, storage rules, compatibility.

Storage ranges are the commonly used reference values for a prototype.
They are NOT validated clinical settings — a real deployment must take
them from the blood bank's approved SOPs and national regulations.
"""

BLOOD_GROUPS = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]

# Component code -> storage rules
COMPONENTS = {
    "WB": {"name": "Whole Blood", "min_temp": 2.0, "max_temp": 6.0, "shelf_life_days": 35},
    "RBC": {"name": "Packed Red Cells", "min_temp": 2.0, "max_temp": 6.0, "shelf_life_days": 42},
    "PLT": {"name": "Platelets", "min_temp": 20.0, "max_temp": 24.0, "shelf_life_days": 5},
    "FFP": {"name": "Fresh Frozen Plasma", "min_temp": -40.0, "max_temp": -18.0, "shelf_life_days": 365},
}

UNIT_STATUSES = ["AVAILABLE", "RESERVED", "ISSUED", "EXPIRED", "DISCARDED"]

# Storage zone types inside each facility. Each zone holds certain components.
ZONE_TYPES = {
    "REFRIGERATOR": {
        "label": "Blood Bank Refrigerator",
        "components": ["WB", "RBC"],
        "setpoint": 4.0,
        "min_temp": 2.0,
        "max_temp": 6.0,
    },
    "PLATELET_INCUBATOR": {
        "label": "Platelet Incubator / Agitator",
        "components": ["PLT"],
        "setpoint": 22.0,
        "min_temp": 20.0,
        "max_temp": 24.0,
    },
    "PLASMA_FREEZER": {
        "label": "Plasma Freezer",
        "components": ["FFP"],
        "setpoint": -30.0,
        "min_temp": -40.0,
        "max_temp": -18.0,
    },
}

# Red-cell compatibility: recipient -> donor groups that may be given.
RED_CELL_COMPATIBLE = {
    "O-": ["O-"],
    "O+": ["O-", "O+"],
    "A-": ["O-", "A-"],
    "A+": ["O-", "O+", "A-", "A+"],
    "B-": ["O-", "B-"],
    "B+": ["O-", "O+", "B-", "B+"],
    "AB-": ["O-", "A-", "B-", "AB-"],
    "AB+": BLOOD_GROUPS,
}

# Plasma compatibility is reversed on ABO (AB plasma is the universal donor).
# Rh is not considered for plasma in this simplified model.
_PLASMA_ABO = {"O": ["O", "A", "B", "AB"], "A": ["A", "AB"], "B": ["B", "AB"], "AB": ["AB"]}
PLASMA_COMPATIBLE = {
    g: [d for d in BLOOD_GROUPS if d.rstrip("+-") in _PLASMA_ABO[g.rstrip("+-")]]
    for g in BLOOD_GROUPS
}


def compatible_donor_groups(recipient_group: str, component: str) -> list[str]:
    """Donor blood groups whose `component` can be given to `recipient_group`.

    Simplified prototype logic:
      * WB / RBC  -> red-cell compatibility
      * FFP / PLT -> plasma (ABO) compatibility
    """
    if component in ("WB", "RBC"):
        return RED_CELL_COMPATIBLE[recipient_group]
    return PLASMA_COMPATIBLE[recipient_group]


# Alert engine settings
EXPIRY_WARNING_DAYS = 3          # warn when a unit expires within this many days
PLATELET_EXPIRY_WARNING_DAYS = 1 # platelets have a 5-day life, so warn later
LOW_STOCK_THRESHOLD = 3          # network-wide available units per group/component
