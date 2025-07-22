
from datetime import datetime, timedelta
from utils import *
from config import MATCH_THRESHOLD_DEG, MAX_DAYS_TO_SEARCH, COARSE_SEARCH_STEP_DAYS, TARGET_ALTITUDE_DEG


def search_daily_for_henge(
        start_date: datetime,
        end_date: datetime,
        lat: float,
        lon: float,
        road_angle: float,
        target_altitude_deg: float
    ):
    """ 
    Iterate every day within a specified period and check if any day is one where a henge occurs. 
    """
    curr_date = start_date
    
    while curr_date < end_date:
        az_curr_date, exact_time = get_horizon_azimuth(lat, lon, curr_date, target_altitude_deg=target_altitude_deg)
        if az_curr_date is None:
            print("Error getting azimuth for date")
            curr_date = curr_date + timedelta(days=1)
            continue
        
        print(round(az_curr_date, 2))
        henge_found = check_match(az_curr_date, road_angle)
        
        if henge_found:
            return henge_found, exact_time, az_curr_date
        
        curr_date = curr_date + timedelta(days=1)
    
    # if we got here, no henge was found.
    return False, None, None


# def check_viable_henge(lat, lon, starting_date, match_threshold_deg=MATCH_THRESHOLD_DEG):
#     """
#     Check if a henge is possible at a given address, and returns the date of the first time the sun is aligned with the road if possible.
#     """
#     try:
        
#         road_angle = get_road_angle(lat, lon)
        
#         # Check if the sun is ever at the road bearing
#         max_days_to_search = MAX_DAYS_TO_SEARCH
#         henge_found = False
#         henge_date = None
#         sun_angle = None
        
#         for i in range(max_days_to_search):
#             date = starting_date + timedelta(days=i)
#             try:
#                 sun_az, when = get_horizon_azimuth(lat, lon, date, target_altitude_deg=TARGET_ALTITUDE_DEG)
#                 angle_diff = abs(sun_az - road_angle)
#                 angle_diff_opposite = abs(angle_diff - 180)
                
#                 if min(angle_diff, angle_diff_opposite) < match_threshold_deg:
#                     henge_found = True
#                     henge_date = when
#                     sun_angle = sun_az
#                     break
#             except Exception as e:
#                 print(f"Error on date {date}: {e}")
#                 continue
        
#         return {
#             'henge_found': henge_found,
#             'henge_date': henge_date.isoformat() if henge_date else None,
#             'sun_angle': round(sun_angle, 2) if sun_angle else None,
#             'road_angle': round(road_angle, 2),
#             'days_searched': max_days_to_search
#         }
        
#     except Exception as e:
#         return {'error': str(e)}
    
    
def search_for_henge(lat, lon, date, match_threshold_deg=MATCH_THRESHOLD_DEG, step_size=COARSE_SEARCH_STEP_DAYS):
    """
    Check if a henge occurs for the latitude/longitude specified. 
    
    Starts with a course search over days and then moves to a fine-grained search if required.
    
    Args: 
        lat: latitude
        lon: longitude
        date: start date of the search
        match_threshold_deg: How close (in degrees) sun must be to road bearing (degrees) to be considered aligned
        step_size: Days between coarse search dates
        
    Returns:
        result (dict):
            henge_found
            henge_date
            sun_angle
            road_angle
            days_searched
    """
    
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
        """
        Search for a henge over a range of days with a coarse search step.
        If we may have skipped a potential alignment, we go back and do a fine grained search.
        
        Conditions that trigger a fine grained search: 
            1) We were headed towards the alignment, but we've made a U-turn (e.g. aiming for 90˚, we were at 85˚, and now we're at 80˚)
            2) We've skipped over alignmentment. 
            

        """
        
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
    
    address = "211 E 43rd St NYC" # Reference for manhattanhenge
    #address = "601-615 E 76th St, Chicago, IL" # Reference for chicagohenge
    #address = "3131 Market St, Philadelphia, PA 19104"

    #address = "493 Eastern Pkwy, Brooklyn, NY 11225"
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
        ###########
        # restrict latitudes
        # map out the sun's path over the year
        # error handling for short, windy streets
