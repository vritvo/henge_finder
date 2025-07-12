
from geopy.geocoders import Nominatim
from astral import  Observer, sun
import math
from datetime import datetime, timedelta
import osmnx as ox
from zoneinfo import ZoneInfo
from timezonefinder import TimezoneFinder

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
    
    tz = get_timezone_from_coordinates(lat, lon)
    obs = Observer(lat, lon)

    # Get sunset time for date/location
    s = sun.sun(obs, date)
    sunset = s["sunset"].astimezone(tz)

    # Search mins leading up to sunset for when the sun is at the target altitude
    for minute in range(-search_window_minutes, 1):  # e.g. -20 to 0
        exact_time = sunset + timedelta(minutes=minute)
        alt = sun.elevation(obs, exact_time)

        # Once the sun has dropped below the altitude we care about, return the azimuth and time
        if alt < target_altitude_deg:
            az = sun.azimuth(obs, exact_time)
            return az, exact_time

def check_viable_henge(address, starting_date = datetime.today(), match_threshold_deg = 0.5):
    """
    Check if a henge is possible at a given address, and returns the date of the first time the sun is aligned with the road if possible.
    Args:
        address: The address of the location to check
        starting_date: The date to start searching for a henge
        match_threshold_deg: The threshold for a match (road + sun) in degrees. 
    """
    try: 
        lat, lon = get_coordinates(address)
    except:
        print(f"Error getting coordinates for {address}")
        return None
    
    road_angle = get_road_angle(lat, lon)
    print(f"Street bearing for {address} is {road_angle} degrees from North.")
    
    # Check if the sun is ever at the road bearing
    # We only need to search ~6 months to cover the full range of sunset azimuths
    max_days_to_search = 180
    henge_found = False
    
    for i in range(max_days_to_search):
        date = starting_date + timedelta(days=i)
        try:
            sun_angle, when = get_horizon_azimuth(lat, lon, date, target_altitude_deg=0.5)
            angle_diff = abs(sun_angle - road_angle)
            angle_diff_opposite = abs(angle_diff - 180) # necessary, e.g. if sun is 270, road is 90, that should count as a match.
            
            if min(angle_diff, angle_diff_opposite) < match_threshold_deg:  
                print(f"Aligned sunset at {address} at {when}. Street bearing: {road_angle:0.2f}°, Sun bearing: {sun_angle:0.2f}°.")
                henge_found = True
                break
        except: #TODO: can't get for some dates
            print(f"Error getting sun angle for {date}")
            continue
    
    if not henge_found:
        print(f"No henge found for {address} in the next {max_days_to_search} days.")

if __name__ == "__main__":
    
    address = "211 E 43rd St NYC" #Reference for manhattanhenge
    # address = "493 Eastern Pkwy, Brooklyn, NY 11225"
    # address = "601-615 E 76th St, Chicago, IL"
    # address = "3131 Market St, Philadelphia, PA 19104"

    check_viable_henge(address, datetime.today())

    
