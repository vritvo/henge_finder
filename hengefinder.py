
from geopy.geocoders import Nominatim
from astral import  Observer, sun
import math
from datetime import datetime, timedelta
import osmnx as ox
from zoneinfo import ZoneInfo
from timezonefinder import TimezoneFinder
from datetime import timedelta

def get_coordinates(address):
    geolocator = Nominatim(user_agent="HengeFinder", timeout=10) #timeout is needed for some addresses
    location = geolocator.geocode(address)
    return (location.latitude, location.longitude)

def get_timezone_from_coordinates(lat, lon):
    tf = TimezoneFinder()
    timezone_name = tf.timezone_at(lat=lat, lng=lon)
    return ZoneInfo(timezone_name)

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


def get_horizon_azimuth(lat, lon, date, target_altitude_deg=0.5, search_window_minutes=20):
    """
    Find the azimuth of the sun at a given date, location, and  altitude (e.g. 0.5 degrees for the sun just visible on the horizon)
    Returns the azimuth and the time of the event.
    """
    print(date)
    tz = get_timezone_from_coordinates(lat, lon)
    obs = Observer(lat, lon)

    # Get sunset time for date/location
    s = sun.sun(obs, date)
    sunset_time = s["sunset"].astimezone(tz)

    # Search mins leading up to sunset for when the sun is at the target altitude    
    # for minute in range(-search_window_minutes, 1):  # e.g. -20 to 0
    #     exact_time = sunset + timedelta(minutes=minute)
    #     alt = sun.elevation(obs, exact_time)

    #     # Once the sun has dropped below the altitude we care about, return the azimuth and time
    #     if alt < target_altitude_deg:
    #         az = sun.azimuth(obs, exact_time)
    #         return az, exact_time

    def binary_search(start, end, ref): 
        min_dist = float("inf")
        best_minute: int
        
        l, r = start, end
        while l < r:
            minute = (l + r) // 2
        
            exact_time = sunset_time + timedelta(minutes=minute)
            altitude = sun.elevation(obs, exact_time)
            
            dist = ref - altitude
            if dist == 0:
                return sun.azimuth(obs, exact_time), exact_time
            elif dist < 0:
                l = minute + 1
            else:
                r = minute - 1

            if dist >= 0 and dist >= min_dist:
                exact_time = sunset_time + timedelta(minutes=best_minute)
                return sun.azimuth(obs, exact_time), exact_time
            if dist >= 0 and dist < min_dist:
                min_dist = dist
                best_minute = minute
        
        exact_time = sunset_time + timedelta(minutes=best_minute)
        return sun.azimuth(obs, exact_time), exact_time
    
    return binary_search(-search_window_minutes, 1, target_altitude_deg)



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
    
    
    
if __name__ == "__main__":
    
    # address = "211 E 43rd St NYC" #Reference for manhattanhenge
    # address = "493 Eastern Pkwy, Brooklyn, NY 11225"
    address = "601-615 E 76th St, Chicago, IL"
    # address = "3131 Market St, Philadelphia, PA 19104"

    lat, lon = get_coordinates(address)
    henge_found, henge_date, sun_angle, road_angle, days_searched = check_viable_henge(lat, lon, datetime.today())

    print(henge_found)

    if henge_found == True: 
        print(f"Henge found! Date: {henge_date}, sun_angle = {sun_angle:.2f}, road_angle = {road_angle:.2f}")
    else:
        print(f"No Henge found.")