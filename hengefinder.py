
from geopy.geocoders import Nominatim
from astral import  Observer, sun
import math
from datetime import datetime, timedelta
import osmnx as ox
from zoneinfo import ZoneInfo
from timezonefinder import TimezoneFinder
from datetime import timedelta

import numpy as np

def get_coordinates(address):
    geolocator = Nominatim(user_agent="HengeFinder", timeout=10) #timeout is needed for some addresses
    location = geolocator.geocode(address)
    return (location.latitude, location.longitude)

def get_timezone_from_coordinates(lat, lon):
    tf = TimezoneFinder()
    timezone_name = tf.timezone_at(lat=lat, lng=lon)
    return ZoneInfo(timezone_name)

def check_match(azimuth, road_bearing, match_threshold_deg = .5):
    angle_diff = abs(azimuth - road_bearing)
    angle_diff_opposite = abs(angle_diff - 180)
    
    if min(angle_diff, angle_diff_opposite) < match_threshold_deg:
        return True
    else:
        return False  
    
    
    
    
def get_road_angle(lat, lon, dist=100, network_type="all"):
    """
    Return the street‐bearing (degrees east of North) at the given address
    by finding the nearest OSMnx edge and calculating bearing using flat earth approximation.
    """
    #TODO: This works for many streets, but is not always reliable. 
    # Probably because of the kinds of other nodes it hits.
    
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


def get_closest_alignment_direction(azimuth, road_angle):

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


def get_horizon_azimuth(lat, lon, date, target_altitude_deg=0.5, search_window_minutes=20):
    """
    Find the azimuth of the sun at a given date, location, and  altitude (e.g. 0.5 degrees for the sun just visible on the horizon)
    Returns the azimuth and the time of the event.
    """
    try:
        print(date)
        tz = get_timezone_from_coordinates(lat, lon)
        obs = Observer(lat, lon)

        # Get sunset time for date/location
        s = sun.sun(obs, date)
        sunset_time = s["sunset"].astimezone(tz)

        # OLD LOGIC
        # Search mins leading up to sunset for when the sun is at the target altitude    
        # for minute in range(-search_window_minutes, 1):  # e.g. -20 to 0
        #     exact_time = sunset + timedelta(minutes=minute)
        #     alt = sun.elevation(obs, exact_time)

        #     # Once the sun has dropped below the altitude we care about, return the azimuth and time
        #     if alt < target_altitude_deg:
        #         az = sun.azimuth(obs, exact_time)
        #         return az, exact_time
    
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

def check_viable_henge(lat, lon, starting_date, match_threshold_deg=0.5):
    """
    Check if a henge is possible at a given address, and returns the date of the first time the sun is aligned with the road if possible.
    """
    try:
        
        road_angle = get_road_angle(lat, lon)
        
        # Check if the sun is ever at the road bearing
        max_days_to_search = 365
        henge_found = False
        henge_date = None
        sun_angle = None
        
        for i in range(max_days_to_search):
            date = starting_date + timedelta(days=i)
            try:
                sun_az, when = get_horizon_azimuth(lat, lon, date, target_altitude_deg=0.5)
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
            az_curr_date, _ = get_horizon_azimuth(lat, lon, curr_date, target_altitude_deg=target_altitude_deg)
            if az_curr_date == None:
                print("Error geting azimuth for date")
                curr_date = curr_date + timedelta(days=1)
                continue
            
            
            print(az_curr_date)
            henge_found = check_match(az_curr_date, road_angle)
            
            if henge_found == True:
                print('Henge Found!')
                print(f'road angle: {road_angle}, azimuth {az_curr_date}')
                return henge_found, curr_date, az_curr_date
    
            
            curr_date = curr_date + timedelta(days=1)
        
        # if we got here, no henge was found.
        return False, _, _
    

def search_for_henge(lat, lon, date):
    target_altitude_deg = .5
    road_angle = get_road_angle(lat, lon)
    
    # Check if the sun is ever at the road bearing
    max_days_to_search = 365 
    henge_found = False
    henge_date  = None
    sun_angle   = None
    
    az_today, _    = get_horizon_azimuth(lat, lon, date, target_altitude_deg=target_altitude_deg)
    az_tomorrow, _ = get_horizon_azimuth(lat, lon, date + timedelta(days=1), target_altitude_deg=target_altitude_deg)
    
    if az_today == None or az_tomorrow == None: 
        print('Error getting azimuth for today / tomorrow')
        #today - for web app need to change error handling. 
        return None
    
    # Calculate the closest alignment direction
    bearing_difference, bearing_direction = get_closest_alignment_direction(az_today, road_angle)
    
    print(f"road_angle {road_angle}")
    print(f"az_today {az_today}")
    print(f"bearing_difference {bearing_difference}")
    
    if bearing_direction == 0:
        #TODO: function for valid henge
        return True
        
    sun_direction = np.sign(az_tomorrow - az_today)

    def _search_over_days(
        start_date: datetime, 
        end_date: datetime, 
        prev_az: float,
        prev_sun_direction: int,
        step: int = 7,
    ) -> bool | None:
        
        print(f"start_day {start_date}\n, end_day {end_date},\n step {step}")

        nonlocal sun_direction
        nonlocal bearing_direction
        
        # Initialize values
        prev_date = start_date
        prev_az = az_tomorrow
        prev_sun_direction=sun_direction
        prev_bearing_direction = bearing_direction
        curr_date = prev_date + timedelta(days=step)

        while curr_date < end_date:
            az_curr_date, _ = get_horizon_azimuth(lat, lon, curr_date, target_altitude_deg=target_altitude_deg)
            if az_curr_date == None:
                print('Could not get azimuth, skipping...')
                curr_date = curr_date + timedelta(days=1) # Just moving forward 1 day. keeping the "previous" day info the same. 
                continue
            print(az_curr_date)
            
            sun_direction = np.sign(az_curr_date - prev_az)

            # Calculate the closest alignment direction for current azimuth
            _, bearing_direction = get_closest_alignment_direction(az_curr_date, road_angle)
            
            # TODO: 
            # add some check so if they match we return True
            
            if (
                prev_sun_direction == bearing_direction and sun_direction != bearing_direction # if we've made a U-turn, do a fine grained search because we may have missed the alignment
                ) or (
                bearing_direction != prev_bearing_direction # Using Intermediate Value Theorem to find the alignment. But this is basically for the situation where we've skipped over the alignment and need to go back.
                ):
                #search_over_days(start_date, end_date, step=1):
                if (prev_sun_direction == bearing_direction and sun_direction != bearing_direction):
                    print(f'changing direction')
                elif (bearing_direction != prev_bearing_direction):
                    print('skip')
                    
                print(f'psd {prev_sun_direction}, sd {sun_direction}, pbd {prev_bearing_direction}, bd {bearing_direction}' )

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
                    print('HENGE FOUND')
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

            
        
    _search_over_days(
        start_date=date, 
        end_date=date+timedelta(days=max_days_to_search), 
        prev_az = az_tomorrow, 
        prev_sun_direction=sun_direction,
        step=7
    )
    
    

    
    
            
    

    
    ##########################


        
    
    
if __name__ == "__main__":
    
    #address = "211 E 43rd St NYC" #Reference for manhattanhenge
    # address = "493 Eastern Pkwy, Brooklyn, NY 11225"
    address = "601-615 E 76th St, Chicago, IL"
    #address = "3131 Market St, Philadelphia, PA 19104"
    #address = "594-598 Broadway, Brooklyn, NY 11206"
    
    lat, lon = get_coordinates(address)
    search_for_henge(lat, lon, datetime.today())
    # henge_found, henge_date, sun_angle, road_angle, days_searched = check_viable_henge(lat, lon, datetime.today())

    # print(henge_found)

    # #TODO: Fix
    # if henge_found == True: 
    #     print(f"Henge found! Date: {henge_date}, sun_angle = {sun_angle:.2f}, road_angle = {road_angle:.2f}")
    # else:
    #     print(f"No Henge found.")
    
    
    #TODO: 
    # - do I need the when output of horizon check? probably
    # something up w naming of required direction, prev direction, curr direction etc. 
    # make sure i take care of output if there's an error with azimuth in "today" and "tomrrow" at the start
    # is error handling right acrsos the board?
    # what happens if no henge is found?
    
        
    # required direction    --> bearing direction
    # real difference       --> bearing difference
    # prev_direction        --> prev_sun_direction
    # curr_direction        --> sun_direction
