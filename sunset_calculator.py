from datetime import datetime, timedelta
from astral import Observer, sun
from typing import Dict, Any
from zoneinfo import ZoneInfo
from utils import get_horizon_azimuth, get_timezone_from_coordinates
from config import MATCH_THRESHOLD_DEG


def calculate_sun_azimuths_for_year(
    lat: float, 
    lon: float, 
    year: int = None,
    target_altitude_deg: float = 0.5,
    time_of_day: str = "sunset",
) -> Dict[int, Dict[str, Any]]:
    """
    Calculate sun azimuth at target altitude for every day of the year.
    
    Args:
        lat: Latitude in degrees
        lon: Longitude in degrees  
        year: Year to calculate for (default: current year)
        target_altitude_deg: Sun altitude in degrees (default: 0.5)
        time_of_day: Either "sunrise" or "sunset" (default: "sunset")
        
    Returns:
        Dictionary with day-of-year (0-364) as keys and dictionaries with 'date' and 'azimuth' as values
    """
    # Round coordinates to 3 decimal places
    lat = round(lat, 3)
    lon = round(lon, 3)
    
    # Create observer for the location
    obs = Observer(lat, lon)
    
    # Get timezone for the location (needed for astral library)
    tz = get_timezone_from_coordinates(lat, lon)
    
    # Use the specified year or current year
    if year is None:
        year = datetime.now(ZoneInfo("UTC")).year
    
    # Start with January 1st of the specified year
    start_date = datetime(year, 1, 1, tzinfo=tz)
    
    results = {}
    
    for day_of_year in range(365):  # Calculate for all 365 days of the year
        current_date = start_date + timedelta(days=day_of_year)
        
        try:
            # Use the existing get_horizon_azimuth function from utils.py
            azimuth, exact_time = get_horizon_azimuth(
                tz, obs, current_date, target_altitude_deg, time_of_day=time_of_day
            )
            
            if azimuth is not None and exact_time is not None:
                # Convert to UTC for consistent results
                exact_time_utc = exact_time.astimezone(ZoneInfo("UTC"))
                
                # Store by day-of-year index (0-364)
                results[day_of_year] = {
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