from geopy.geocoders import Nominatim
from astral import Observer, sun
import math
from datetime import timedelta
import osmnx as ox
from zoneinfo import ZoneInfo
from timezonefinder import TimezoneFinder
from datetime import timedelta
import numpy as np
from config import (
    MATCH_THRESHOLD_DEG,
    ROAD_SEARCH_RADIUS_M,
    TARGET_ALTITUDE_DEG,
    SEARCH_WINDOW_MINUTES,
)
from datetime import datetime, date


class GeocodingError(Exception):
    """Raised when geocoding fails to find coordinates for an address."""

    pass


def get_location(address):
    geolocator = Nominatim(
        user_agent="HengeFinder", timeout=10
    )  # longer timeout is needed for some addresses
    location = geolocator.geocode(address)
    if location is None:
        raise GeocodingError(f"Could not find coordinates for address: {address}")
    return location


def get_coordinates(location):
    """
    Convert a location to latitude and longitude coordinates using geocoding.
    """

    return (location.latitude, location.longitude)


def get_standardized_address(location):
    """
    Get a standardized address
    """

    return location.address


def get_utc_start_date():
    """
    Get today's date in UTC (standardized)
    """

    today_utc = date.today()
    return datetime(
        today_utc.year,
        today_utc.month,
        today_utc.day,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
        tzinfo=ZoneInfo("UTC"),
    )


def check_latitude(lat, max_lat=60):
    """
    Make sure the latitude is within some range.
    """
    if abs(lat) > max_lat:
        raise ValueError(f"Address out of range.")
    return True


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

    if angle_diff < match_threshold_deg:
        return True
    else:
        return False


def get_road_bearing(lat, lon, dist=ROAD_SEARCH_RADIUS_M, network_type="drive"):
    """
    Return the street‐bearing (degrees clockwise from North) at the given address
    by finding the nearest OSMnx edge and calculating bearing.
    """

    # get a network around the point
    # we use truncate_by_edge=True to make sure we get all edges within the distance
    G = ox.graph_from_point(
        (lat, lon), dist=dist, network_type=network_type, truncate_by_edge=True
    )

    # find the single closest edge to our point
    u, v, key = ox.distance.nearest_edges(G, X=lon, Y=lat)

    # get the coordinates of both endpoints
    lat_1 = G.nodes[u]["y"]
    lon_1 = G.nodes[u]["x"]
    lat_2 = G.nodes[v]["y"]
    lon_2 = G.nodes[v]["x"]

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

    # put in 180-360 range, since the sun sets in the west (and if a road bearing is, for e.g, 90, it's fine to say 270)
    bearing = normalize_bearing_to_180_360(bearing)

    return bearing


def normalize_bearing_to_180_360(bearing: float) -> float:
    """
    Normalize a bearing to the 180-360 degree range.

    Since the sun sets in the west, we prefer bearings in the 180-360 range.
    """
    if bearing < 180:
        return bearing + 180
    return bearing


def get_closest_alignment_direction(
    azimuth: float, road_bearing: float
) -> tuple[float, int]:
    """
    Calculate the shortest angular difference between sun azimuth and road angle.

    Args:
        azimuth: Sun's azimuth angle in degrees (0-360 range, but in practice 180-360 because sun sets in the west)
        road_bearing: Road's bearing angle in degrees (180-360 range)

    Returns:
        tuple (bearing_difference, direction_sign)
            - bearing_difference: Angular difference in degrees
            - direction_sign: 1 if road is clockwise from sun, -1 if counterclockwise
    """
    # Calculate the angle difference
    bearing_difference = road_bearing - azimuth

    # Normalize to [-180, 180] range
    while bearing_difference > 180:
        bearing_difference -= 360
    while bearing_difference < -180:
        bearing_difference += 360

    return bearing_difference, np.sign(bearing_difference)


def get_horizon_azimuth(
    tz: ZoneInfo,
    obs: Observer,
    date: datetime,
    target_altitude_deg: float = TARGET_ALTITUDE_DEG,
    search_window_minutes: int = SEARCH_WINDOW_MINUTES,
):
    """
    Find the sun's azimuth when it reaches a specific altitude above the horizon.

    Uses binary search to find the exact time when the sun is first at the target altitude
    within the search window before sunset.

    Returns:
        tuple: (azimuth, exact_time)
    """
    try:
        # Get sunset time for date/location
        # If date has a time zone (eg from server), convert to the target timezone.
        if date.tzinfo is not None:
            date_in_tz = date.astimezone(tz)
            date_only = date_in_tz.date()
        else:
            # If naive datetime, assume it's in the target timezone
            date_only = date.date()

        s = sun.sun(obs, date_only, tzinfo=tz)
        sunset_time = s["sunset"]

    except (ValueError, AttributeError) as e:
        print(f"Could not get azimuth for {date}: {e}")
        return None, None
    except Exception as e:
        print(e)
        return None, None

    return _binary_search(
        -search_window_minutes, 1, target_altitude_deg, sunset_time, obs
    )


def _binary_search(start, end, target_altitude_deg, sunset_time, obs):
    """
    Modification of binary search specifically to find the azimuth of the sun at the last minute before it drops below the target altitude of interest.

    We keep track of the min distance between the altitudes we've found so far and the target_altitude_deg.
        - if dist = 0, we've found an exact match (the sun is sitting exactly where we want)
        - otherwise, we return the time when the altitude of the sun was closest to but above target_altitude_deg.
    """

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

        # if we've found a closer altitude to our target altitude than our best altitude, we update the best_min to be this one.
        # Since we want the altitude to always be above the horizon, we make sure dist >0.
        if dist >= 0 and dist < min_dist:
            min_dist = dist
            best_minute = minute

    exact_time = sunset_time + timedelta(minutes=best_minute)
    return sun.azimuth(obs, exact_time), exact_time
