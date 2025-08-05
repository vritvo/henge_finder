# Henge calculation parameters
TARGET_ALTITUDE_DEG = 0.5  # Sun elevation for henge effect (degrees). Sun will be sitting on the horizon.
SEARCH_WINDOW_MINUTES = 20  # Minutes before sunset to search
MATCH_THRESHOLD_DEG = 0.25   # How close (in degrees) sun must be to road bearing (degrees) to be considered aligned

# Search parameters  
MAX_DAYS_TO_SEARCH = 365    # How many days to search forward
COARSE_SEARCH_STEP_DAYS = 30 # Days between coarse search points
FINE_SEARCH_WINDOW_DAYS = 7  # Days to search backwards when coarse match is found

# Road detection parameters
ROAD_SEARCH_RADIUS_M = 100  # Meters to search for nearby roads to get road bearing