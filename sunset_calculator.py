from datetime import datetime, timedelta, date
from astral import Observer, sun
from typing import Dict, Any
from zoneinfo import ZoneInfo
from utils import get_horizon_azimuth, get_timezone_from_coordinates
from config import MATCH_THRESHOLD_DEG


def calculate_sun_azimuths_for_year(
    lat: float, 
    lon: float, 
    year: int = None,
    start_date: date = None,
    target_altitude_deg: float = 0.5,
    time_of_day: str = "sunset",
) -> Dict[int, Dict[str, Any]]:
    """
    Calculate sun azimuth at target altitude for every day of the year.
    
    Args:
        lat: Latitude in degrees
        lon: Longitude in degrees  
        start_date: Start date for calculations (default: January 1 of specified year)
        target_altitude_deg: Sun altitude in degrees (default: 0.5)
        time_of_day: Either "sunrise" or "sunset" (default: "sunset")
        
    Returns:
        Dictionary with day index (0-based) as keys and dictionaries with 'date' and 'azimuth' as values
    """
    # Round coordinates to 3 decimal places
    lat = round(lat, 3)
    lon = round(lon, 3)
    
    # Create observer for the location
    obs = Observer(lat, lon)
    
    # Get timezone for the location (needed for astral library)
    tz = get_timezone_from_coordinates(lat, lon)
    
    # Determine the start date
    if start_date is not None:
        # Use the provided start date
        start_datetime = datetime.combine(start_date, datetime.min.time(), tzinfo=tz)
    else:
        # Start with January 1st of the current year
        year = datetime.now(ZoneInfo("UTC")).year
        start_datetime = datetime(year, 1, 1, tzinfo=tz)
    
    results = {}
    
    for day_index in range(365):  # Calculate for all 365 days of the year
        current_date = start_datetime + timedelta(days=day_index)
        
        try:
            # Use the existing get_horizon_azimuth function from utils.py
            azimuth, exact_time = get_horizon_azimuth(
                tz, obs, current_date, target_altitude_deg, time_of_day=time_of_day
            )
            
            if azimuth is not None and exact_time is not None:
                # Convert to UTC for consistent results
                exact_time_utc = exact_time.astimezone(ZoneInfo("UTC"))
                
                # Store by day index (0-based)
                results[day_index] = {
                    'date': exact_time_utc.isoformat(),
                    'azimuth': round(azimuth, 2)
                }
                
        except (ValueError, AttributeError) as e:
            print(f"Could not get azimuth for {current_date.date()}: {e}")
            continue
        except Exception as e:
            print(f"Unexpected error for {current_date.date()}: {e}")
            continue
    
    return results

