
from datetime import datetime, timedelta
from utils import *
from config import MATCH_THRESHOLD_DEG, MAX_DAYS_TO_SEARCH, COARSE_SEARCH_STEP_DAYS, TARGET_ALTITUDE_DEG, FINE_SEARCH_WINDOW_DAYS
import time
from typing import Optional


def search_for_henge(
    lat: float,
    lon: float,
    date: datetime,
    match_threshold_deg: float=MATCH_THRESHOLD_DEG, 
    step_size: int=COARSE_SEARCH_STEP_DAYS,
    road_bearing: Optional[float] = None,
):
    """
    Check if a henge occurs for the latitude/longitude specified.

    Starts with a course search over days and then moves to a fine-grained search if required.

    Args:
        lat: latitude
        lon: longitude
        date: start date of the search
        match_threshold_deg: How close (in degrees) sun azimuth must be to road bearing (degrees) to be considered aligned
        step_size: Days between coarse search dates

    Returns:
        result (dict):
            henge_found (bool)
            henge_date (datetime)
            sun_angle (float): Sun's azimuth angle in degrees
            road_bearing (float): Road's bearing angle in degrees
            days_searched (int): Number of days searched in the coarse search
    """
    start_time = time.time()

    if road_bearing is None:
        bearing_start = time.time()
        road_bearing = get_road_bearing(lat, lon)
        bearing_end = time.time()
        print(f"    🧭 get_road_bearing in search_for_henge: {bearing_end - bearing_start:.3f}s")

    tz = get_timezone_from_coordinates(lat, lon)
    obs = Observer(lat, lon)

    horizon_start = time.time()
    az_today, exact_time_today    = get_horizon_azimuth(tz, obs, date, target_altitude_deg=TARGET_ALTITUDE_DEG)
    az_tomorrow, exact_time_tomorrow = get_horizon_azimuth(tz, obs, date + timedelta(days=1), target_altitude_deg=TARGET_ALTITUDE_DEG)
    horizon_end = time.time()
    print(f"    ☀️ Initial horizon_azimuth calls: {horizon_end - horizon_start:.3f}s")

    # If we couldn't get the azimuth for today or tomorrow, return an error
    if az_today == None or az_tomorrow == None: 
        print('Error getting azimuth for today / tomorrow')
        return {'error': 'Could not calculate sun position'}

    # Determine the direction of the sun's movement
    sun_direction = np.sign(az_tomorrow - az_today)

    # Calculate the closest alignment direction (that is, the direction the sun needs to go in, to align with the road)
    bearing_difference, bearing_direction = get_closest_alignment_direction(az_today, road_bearing)

    print(f"road_bearing {road_bearing}")
    print(f"az_today {az_today}")
    print(f"bearing_difference {bearing_difference}")

    # Check if the sun is aligned with the road today or tomorrow, before we start our main search.
    for az, exact_time in [(az_today, exact_time_today), (az_tomorrow, exact_time_tomorrow)]:
        if check_match(az, road_bearing, match_threshold_deg):
            tzname = exact_time.tzname() if exact_time and exact_time.tzinfo else None
            time_str = exact_time.strftime('%Y-%m-%d %H:%M %Z') if exact_time else None
            return {
                'henge_found': True,
                'henge_date': exact_time.isoformat(),
                'henge_time_local_str': time_str,
                'henge_timezone': tzname,
                'sun_angle': round(az, 2),
                'road_bearing': round(road_bearing, 2),
                'days_searched': 0
            }


    def _search_over_days(step: int = COARSE_SEARCH_STEP_DAYS) -> dict:
        """
        Search for a henge over a range of days with a coarse search step.
        If we may have skipped a potential alignment, we go back and do a fine grained search.
        
        Conditions that trigger a fine grained search: 
            1) We were headed towards the alignment, but we've made a U-turn (e.g. aiming for 90˚ road bearing, we were at 85˚ sun azimuth, and now we're at 80˚ sun azimuth)
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

        while curr_date <= end_date:
            az_curr_date, exact_time = get_horizon_azimuth(tz, obs, curr_date, target_altitude_deg=TARGET_ALTITUDE_DEG)
            if az_curr_date == None:
                print('Could not get azimuth, skipping...')
                curr_date = curr_date + timedelta(days=1) # Just moving forward 1 day. keeping the "previous" day info the same. 
                continue
            print(round(az_curr_date, 2))

            sun_direction = np.sign(az_curr_date - prev_az)

            # Calculate the closest alignment direction for current azimuth
            bearing_diff_curr, bearing_direction = get_closest_alignment_direction(az_curr_date, road_bearing)

            # Check if we found a match
            if abs(bearing_diff_curr) < match_threshold_deg:
                # Found a potential henge in coarse search, but we need to do a fine-grained search
                # to find the earliest henge date in the previous FINE_SEARCH_WINDOW_DAYS
                fine_search_start = curr_date - timedelta(days=FINE_SEARCH_WINDOW_DAYS)
                fine_search_end = curr_date

                henge_found, henge_date, azimuth = search_daily_for_henge(
                    start_date=fine_search_start,
                    end_date=fine_search_end,
                    tz=tz,
                    obs=obs,
                    road_bearing=road_bearing,
                    target_altitude_deg=TARGET_ALTITUDE_DEG
                )

                # We should always find a henge since curr_date is included in the search
                tzname = henge_date.tzname() if henge_date and henge_date.tzinfo else None
                time_str = henge_date.strftime('%Y-%m-%d %H:%M %Z') if henge_date else None
                return {
                    'henge_found': True,
                    'henge_date': henge_date.isoformat(),
                    'henge_time_local_str': time_str,
                    'henge_timezone': tzname,
                    'sun_angle': round(azimuth, 2),
                    'road_bearing': round(road_bearing, 2),
                }

            # Check conditions that indicate we missed alignments, that should trigger a fine grained search
            if (
                prev_sun_direction == bearing_direction and sun_direction != bearing_direction # 1st condition - if we've made a U-turn, do a fine grained search because we may have missed the alignment
                ) or (
                bearing_direction != prev_bearing_direction # 2nd condition -we've skipped over the alignment. Uses Intermediate Value Theorem.
                ):

                # Do a fine grained search.
                henge_found, henge_date, azimuth = search_daily_for_henge(
                    start_date=prev_date + timedelta(days=1),
                    end_date=curr_date - timedelta(days=1),
                    tz=tz,
                    obs=obs,
                    road_bearing=road_bearing,
                    target_altitude_deg=TARGET_ALTITUDE_DEG
                )


                if henge_found == True: 
                    tzname = henge_date.tzname() if henge_date and henge_date.tzinfo else None
                    time_str = henge_date.strftime('%Y-%m-%d %H:%M %Z') if henge_date else None
                    return {
                    'henge_found': henge_found,
                    'henge_date': henge_date.isoformat() if henge_date else None,
                    'henge_time_local_str': time_str,
                    'henge_timezone': tzname,
                    'sun_angle': round(azimuth, 2) if azimuth else None,
                    'road_bearing': round(road_bearing, 2),
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
            'henge_time_local_str': None,
            'henge_timezone': None,
            'sun_angle': None,
            'road_bearing': round(road_bearing, 2),
            'days_searched': MAX_DAYS_TO_SEARCH
        }

    search_start = time.time()
    result = _search_over_days(step=step_size)
    search_end = time.time()
    print(f"    🔍 _search_over_days took: {search_end - search_start:.3f}s")

    end_time = time.time()
    print(f"    ⏱️  search_for_henge total: {end_time - start_time:.3f}s")

    return result

def search_daily_for_henge(
        start_date: datetime,
        end_date: datetime,
        tz: ZoneInfo,
        obs: Observer,
        road_bearing: float,
        target_altitude_deg: float
    ):
    """
    Iterate every day within a specified period and check if any day is one where a henge occurs. 
    """
    start_time = time.time()
    curr_date = start_date

    while curr_date <= end_date:
        # Get the azimuth/time for the current date
        az_curr_date, exact_time = get_horizon_azimuth(tz, obs, curr_date, target_altitude_deg=target_altitude_deg)
        if az_curr_date is None:
            print("Error getting azimuth for date")
            curr_date = curr_date + timedelta(days=1)
            continue

        print(round(az_curr_date, 2))

        # Check if the azimuth matches the road bearing
        henge_found = check_match(az_curr_date, road_bearing)

        if henge_found:
            end_time = time.time()
            print(f"    📅 search_daily_for_henge took: {end_time - start_time:.3f}s")
            return henge_found, exact_time, az_curr_date

        curr_date = curr_date + timedelta(days=1)

    # If we got here, no henge was found.
    end_time = time.time()
    print(f"    📅 search_daily_for_henge took: {end_time - start_time:.3f}s")
    return False, None, None

if __name__ == "__main__":

    address = "211 E 43rd St NYC" # Reference for manhattanhenge
    #address = "601-615 E 76th St, Chicago, IL" # Reference for chicagohenge
    #address = "3131 Market St, Philadelphia, PA 19104"

    #address = "493 Eastern Pkwy, Brooklyn, NY 11225"
    #address = "594-598 Broadway, Brooklyn, NY 11206"
    #address = "43 Front St E, Toronto, ON M5E 1B3, Canada"
    #address = "701-651 E Tudor Rd, Anchorage, AK 99503"
    #address = "84 Thirlestane Rd, Edinburgh EH9 1AR, UK"
    #address = "s103 101, 1051 KT Amsterdam, Netherlands"

    location = get_location(address)
    lat, lon = get_coordinates(location)
    check_latitude(lat)
    print(f"Coordinates: {lat}, {lon}")

    start_date = get_utc_start_date()# Use UTC for consistent start dates (e.g. for server)
    result = search_for_henge(lat, lon, start_date, step_size=COARSE_SEARCH_STEP_DAYS)
    if result and 'henge_found' in result:
        if result['henge_found']:
            print(f"Henge found! Date: {result['henge_date']}, sun_angle = {result['sun_angle']}, road_bearing = {result['road_bearing']}")
        else:
            print(f"No henge found after searching {result['days_searched']} days.")
    elif result and 'error' in result:
        print(f"Error: {result['error']}")
    else:
        print("Error occurred during search.")


