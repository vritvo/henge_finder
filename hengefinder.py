
from geopy.geocoders import Nominatim
from astral import  Observer, sun
import math
from datetime import datetime, timedelta
import osmnx as ox
from zoneinfo import ZoneInfo
from timezonefinder import TimezoneFinder
from datetime import timedelta
import numpy as np

# Henge calculation parameters
TARGET_ALTITUDE_DEG = 0.5  # Sun elevation for henge effect (degrees)
SEARCH_WINDOW_MINUTES = 20  # Minutes before sunset to search
MATCH_THRESHOLD_DEG = 0.5   # How close sun must be to road bearing (degrees) to be considered aligned

# Search parameters  
MAX_DAYS_TO_SEARCH = 365    # How many days to search forward
COARSE_SEARCH_STEP_DAYS = 30 # Days between coarse search points

# Road detection parameters
ROAD_SEARCH_RADIUS_M = 100  # Meters to search for nearby roads

class GeocodingError(Exception):
    """Raised when geocoding fails to find coordinates for an address."""
    pass

def get_coordinates(address):
    """
    Convert an address to latitude and longitude coordinates using geocoding.
    """
    
    geolocator = Nominatim(user_agent="HengeFinder", timeout=10) #longer timeout is needed for some addresses
    location = geolocator.geocode(address)
    
    if location is None:
        raise GeocodingError(f"Could not find coordinates for address: {address}")
    
    return (location.latitude, location.longitude)

def get_timezone_from_coordinates(lat, lon):
    """
    Get the timezone for a given latitude and longitude.
    """
    tf = TimezoneFinder()
    timezone_name = tf.timezone_at(lat=lat, lng=lon)
    return ZoneInfo(timezone_name)

def check_match(azimuth, road_bearing, match_threshold_deg=MATCH_THRESHOLD_DEG):
    """
    Check if the sun's azimuth aligns with the road bearing within the threshold.
    """
    angle_diff = abs(azimuth - road_bearing)
    angle_diff_opposite = abs(angle_diff - 180)
    
    if min(angle_diff, angle_diff_opposite) < match_threshold_deg:
        return True
    else:
        return False  

    
def get_road_angle(lat, lon, dist=ROAD_SEARCH_RADIUS_M, network_type="all"):
    """
    Return the street‐bearing (degrees east of North) at the given address
    by finding the nearest OSMnx edge and calculating bearing using flat earth approximation.
    """
    #TODO: This works for many streets, but is not always reliable (curb, intersection, etc)
    
    # get a network around the point
    G = ox.graph_from_point((lat, lon), dist=dist, network_type=network_type)

    # find the single closest edge to our point
    u, v, key = ox.distance.nearest_edges(G, X=lon, Y=lat)
    
    # get the coordinates of both endpoints
    lat_1 = G.nodes[u]['y']
    lon_1 = G.nodes[u]['x']
    lat_2 = G.nodes[v]['y'] 
    lon_2 = G.nodes[v]['x']

    # We now have two points near the address, given by coordinates (lat, lon). 
    # In theory, we could use basic trig, using the difference in latitudes and longitudes and use the arctan2 function to calculate the bearing.
    # But the earth is not flat, so we have to scale the difference in longitudes by the cosine of the mean latitude (longitude lines converge at the poles).
    # Latitude lines are parallel, so we can just use the difference in latitudes.
    
    delta_y = lat_2 - lat_1
    mean_lat = math.radians((lat_1 + lat_2) / 2)
    delta_x = (lon_2 - lon_1) * math.cos(mean_lat)

    # calculate angle in radians
    bearing_rad = math.atan2(delta_x, delta_y)
    
    # convert to degrees and normalize to 0-360
    bearing_deg = math.degrees(bearing_rad)
    bearing = (bearing_deg + 360) % 360

    return bearing


def get_closest_alignment_direction(azimuth: float, road_angle: float) -> tuple[float, int]:
    """
    Calculate the shortest angular difference between sun azimuth and road angle.
    
    Args:
        azimuth: Sun's azimuth angle in degrees
        road_angle: Road's bearing angle in degrees
        
    Returns:
        tuple (bearing_difference, direction_sign)
            - bearing_difference: Angular difference in degrees (-180 to 180)
            - direction_sign: 1 if road is clockwise from sun, -1 if counterclockwise
    """
    # Calculate the shortest angular difference, accounting for both directions
    angle_diff = abs(azimuth - road_angle)
    angle_diff_opposite = abs(angle_diff - 180)
    
    # Find which direction is closer
    if angle_diff <= angle_diff_opposite:
        bearing_difference = road_angle - azimuth
    else:
        bearing_difference = (road_angle + 180) - azimuth
    
    # Normalize to [-180, 180] range
    while bearing_difference > 180:
        bearing_difference -= 360
    while bearing_difference < -180:
        bearing_difference += 360
    
    return bearing_difference, np.sign(bearing_difference)


def get_horizon_azimuth(
    lat, 
    lon, 
    date, 
    target_altitude_deg=TARGET_ALTITUDE_DEG, 
    search_window_minutes=SEARCH_WINDOW_MINUTES
):
    """
    Find the sun's azimuth when it reaches a specific altitude above the horizon.
    
    Uses binary search to find the exact time when the sun is first at the target altitude
    within the search window before sunset.
    
    Returns:
        tuple: (azimuth, exact_time)
    """
    try:
        print(date.date())
        tz = get_timezone_from_coordinates(lat, lon)
        obs = Observer(lat, lon)

        # Get sunset time for date/location
        s = sun.sun(obs, date)
        sunset_time = s["sunset"].astimezone(tz)
    
    except (ValueError, AttributeError) as e: 
        print(f"Could not get azimuth for {date}: {e}")
        return None, None
    except Exception as e:
        print(e)
        return None, None

    
    return _binary_search(-search_window_minutes, 1, target_altitude_deg, sunset_time, obs)

def _binary_search(
    start, 
    end,
    target_altitude_deg, 
    sunset_time, obs
): 
    #If dist = 0, we found an exact match for target_altitude_deg. 
    # otherwise, we return the time when altitdue is the closest time to but above target_altitude_deg
    min_dist = float("inf")
    best_minute: int
    
    left, right = start, end
    while left < right:
        minute = (left + right) // 2
    
        exact_time = sunset_time + timedelta(minutes=minute)
        altitude = sun.elevation(obs, exact_time)
        
        dist = target_altitude_deg - altitude
        if dist == 0:
            return sun.azimuth(obs, exact_time), exact_time
        elif dist < 0:
            left = minute + 1
        else:
            right = minute - 1

        if dist >= 0 and dist >= min_dist:
            exact_time = sunset_time + timedelta(minutes=best_minute)
            return sun.azimuth(obs, exact_time), exact_time
        if dist >= 0 and dist < min_dist:
            min_dist = dist
            best_minute = minute
    
    exact_time = sunset_time + timedelta(minutes=best_minute)
    return sun.azimuth(obs, exact_time), exact_time

def check_viable_henge(lat, lon, starting_date, match_threshold_deg=MATCH_THRESHOLD_DEG):
    """
    Check if a henge is possible at a given address, and returns the date of the first time the sun is aligned with the road if possible.
    """
    try:
        
        road_angle = get_road_angle(lat, lon)
        
        # Check if the sun is ever at the road bearing
        max_days_to_search = MAX_DAYS_TO_SEARCH
        henge_found = False
        henge_date = None
        sun_angle = None
        
        for i in range(max_days_to_search):
            date = starting_date + timedelta(days=i)
            try:
                sun_az, when = get_horizon_azimuth(lat, lon, date, target_altitude_deg=TARGET_ALTITUDE_DEG)
                angle_diff = abs(sun_az - road_angle)
                angle_diff_opposite = abs(angle_diff - 180)
                
                if min(angle_diff, angle_diff_opposite) < match_threshold_deg:
                    henge_found = True
                    henge_date = when
                    sun_angle = sun_az
                    break
            except Exception as e:
                print(f"Error on date {date}: {e}")
                continue
        
        return {
            'henge_found': henge_found,
            'henge_date': henge_date.isoformat() if henge_date else None,
            'sun_angle': round(sun_angle, 2) if sun_angle else None,
            'road_angle': round(road_angle, 2),
            'days_searched': max_days_to_search
        }
        
    except Exception as e:
        return {'error': str(e)}
    
    
def search_daily_for_henge(
        start_date: datetime,
        end_date: datetime,
        lat: float,
        lon: float,
        road_angle: float,
        target_altitude_deg: float
    ):
        curr_date = start_date
        
        while curr_date < end_date:
            az_curr_date, exact_time = get_horizon_azimuth(lat, lon, curr_date, target_altitude_deg=target_altitude_deg)
            if az_curr_date == None:
                print("Error geting azimuth for date")
                curr_date = curr_date + timedelta(days=1)
                continue
            
            
            print(round(az_curr_date, 2))
            henge_found = check_match(az_curr_date, road_angle)
            
            if henge_found == True:
                return henge_found, exact_time, az_curr_date
    
            
            curr_date = curr_date + timedelta(days=1)
        
        # if we got here, no henge was found.
        return False, None, None
    

def search_for_henge(lat, lon, date, match_threshold_deg=MATCH_THRESHOLD_DEG, step_size=COARSE_SEARCH_STEP_DAYS):
    # Check for extreme latitudes where sun behavior is too complex
    # if abs(lat) > 60:
    #     return {
    #         'error': f'Latitude {lat:.1f}° is too extreme. '
    #     }
    
    target_altitude_deg = TARGET_ALTITUDE_DEG
    road_angle = get_road_angle(lat, lon)
    
    # Check if the sun is ever at the road bearing
    max_days_to_search = MAX_DAYS_TO_SEARCH
    
    az_today, _    = get_horizon_azimuth(lat, lon, date, target_altitude_deg=target_altitude_deg)
    az_tomorrow, _ = get_horizon_azimuth(lat, lon, date + timedelta(days=1), target_altitude_deg=target_altitude_deg)
    
    if az_today == None or az_tomorrow == None: 
        print('Error getting azimuth for today / tomorrow')
        return {'error': 'Could not calculate sun position'}
    
    # Calculate the closest alignment direction
    bearing_difference, bearing_direction = get_closest_alignment_direction(az_today, road_angle)
    
    print(f"road_angle {road_angle}")
    print(f"az_today {az_today}")
    print(f"bearing_difference {bearing_difference}")
    
    if abs(bearing_difference) < match_threshold_deg:
        # Sun is already aligned with the road
        _, exact_time = get_horizon_azimuth(lat, lon, date, target_altitude_deg=target_altitude_deg)
        return {
            'henge_found': True,
            'henge_date': exact_time.isoformat(),
            'sun_angle': round(az_today, 2),
            'road_angle': round(road_angle, 2),
            'days_searched': 0
        }
        
    sun_direction = np.sign(az_tomorrow - az_today)

    def _search_over_days(step: int = COARSE_SEARCH_STEP_DAYS) -> dict:
        
        # Declare nonlocal variables that will be modified
        nonlocal sun_direction
        nonlocal bearing_direction
        
        print(f"Searching with step {step}")

        # Initialize values from outer scope
        start_date = date
        end_date = date + timedelta(days=MAX_DAYS_TO_SEARCH)
        prev_date = start_date
        prev_az = az_tomorrow
        prev_sun_direction = sun_direction
        prev_bearing_direction = bearing_direction
        curr_date = prev_date + timedelta(days=step)

        while curr_date < end_date:
            az_curr_date, exact_time = get_horizon_azimuth(lat, lon, curr_date, target_altitude_deg=target_altitude_deg)
            if az_curr_date == None:
                print('Could not get azimuth, skipping...')
                curr_date = curr_date + timedelta(days=1) # Just moving forward 1 day. keeping the "previous" day info the same. 
                continue
            print(az_curr_date)
            
            sun_direction = np.sign(az_curr_date - prev_az)

            # Calculate the closest alignment direction for current azimuth
            bearing_diff_curr, bearing_direction = get_closest_alignment_direction(az_curr_date, road_angle)
            
            # Check if we found an immediate match
            if abs(bearing_diff_curr) < match_threshold_deg:
                return {
                    'henge_found': True,
                    'henge_date': exact_time.isoformat(),
                    'sun_angle': round(az_curr_date, 2),
                    'road_angle': round(road_angle, 2),
                }
            
            if (
                prev_sun_direction == bearing_direction and sun_direction != bearing_direction # if we've made a U-turn, do a fine grained search because we may have missed the alignment
                ) or (
                bearing_direction != prev_bearing_direction # Using Intermediate Value Theorem to find the alignment. But this is basically for the situation where we've skipped over the alignment and need to go back.
                ):

                if (prev_sun_direction == bearing_direction and sun_direction != bearing_direction):
                    print(f'changing direction')
                elif (bearing_direction != prev_bearing_direction):
                    print('skip')
                    
                #print(f'psd {prev_sun_direction}, sd {sun_direction}, pbd {prev_bearing_direction}, bd {bearing_direction}' )

                print("fine grain search")
                henge_found, henge_date, azimuth = search_daily_for_henge(
                    start_date=prev_date + timedelta(days=1),
                    end_date=curr_date - timedelta(days=1),
                    lat=lat,
                    lon=lon,
                    road_angle=road_angle,
                    target_altitude_deg=target_altitude_deg
                )
                
            
                if henge_found == True: 
                    return {
                    'henge_found': henge_found,
                    'henge_date': henge_date.isoformat() if henge_date else None,
                    'sun_angle': round(azimuth, 2) if azimuth else None,
                    'road_angle': round(road_angle, 2),
                }
        
            #Update for next iteration:
            prev_sun_direction = sun_direction
            prev_az= az_curr_date
            prev_date = curr_date
            curr_date = prev_date + timedelta(days=step)

        # If we get here, no henge was found in the search
        return {
            'henge_found': False,
            'henge_date': None,
            'sun_angle': None,
            'road_angle': round(road_angle, 2),
            'days_searched': MAX_DAYS_TO_SEARCH
        }
        
    result = _search_over_days(step=step_size)
    
    return result

    
if __name__ == "__main__":
    
    address = "211 E 43rd St NYC" #Reference for manhattanhenge
    #address = "493 Eastern Pkwy, Brooklyn, NY 11225"
    #address = "601-615 E 76th St, Chicago, IL"
    #address = "3131 Market St, Philadelphia, PA 19104"
    #address = "594-598 Broadway, Brooklyn, NY 11206"
    #address = "350 King St W, Toronto, ON M5V 3X5, Canada"
    #address = "43 Front St E, Toronto, ON M5E 1B3, Canada"
    #address = "701-651 E Tudor Rd, Anchorage, AK 99503"
    #address = "84 Thirlestane Rd, Edinburgh EH9 1AR, UK"
    
    try:
        lat, lon = get_coordinates(address)
        print(f"Coordinates: {lat}, {lon}")
        
        result = search_for_henge(lat, lon, datetime.today(), step_size=COARSE_SEARCH_STEP_DAYS)
        
        if result and 'henge_found' in result:
            if result['henge_found']:
                print(f"Henge found! Date: {result['henge_date']}, sun_angle = {result['sun_angle']}, road_angle = {result['road_angle']}")
            else:
                print(f"No henge found after searching {result['days_searched']} days.")
        elif result and 'error' in result:
            print(f"Error: {result['error']}")
        else:
            print("Error occurred during search.")
            
    except GeocodingError as e:
        print(f"Geocoding error: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        
        
        # TODO: 
        # restrict latitudes
        # map out the sun's path over the year
        # error handling for short, windy streets
