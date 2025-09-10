from datetime import datetime, timedelta
from astral import Observer, sun
from typing import List, Tuple, Optional, Dict, Any
from zoneinfo import ZoneInfo
from utils import get_horizon_azimuth, get_timezone_from_coordinates
from config import MATCH_THRESHOLD_DEG


def calculate_sunset_azimuths_for_year(
    lat: float, 
    lon: float, 
    year: int = None,
    target_altitude_deg: float = 0.5,
) -> List[Dict[str, Any]]:
    """
    Calculate sun azimuth at target altitude for every day of the year starting from today.
    
    Args:
        lat: Latitude in degrees
        lon: Longitude in degrees  
        year: Year to calculate for (default: current year)
        target_altitude_deg: Sun altitude in degrees (default: 0.5)
        
    Returns:
        List of dictionaries with 'date' and 'azimuth' keys
    """
    # Round coordinates to 3 decimal places
    lat = round(lat, 3)
    lon = round(lon, 3)
    
    # Create observer for the location
    obs = Observer(lat, lon)
    
    # Get timezone for the location (needed for astral library)
    tz = get_timezone_from_coordinates(lat, lon)
    
    # Start with today's date in UTC
    if year is None:
        year = datetime.now(ZoneInfo("UTC")).year
    
    start_date_utc = datetime.now(ZoneInfo("UTC")).replace(hour=0, minute=0, second=0, microsecond=0)
    
    results = []
    
    for day in range(365):  # Calculate for next 365 days
        current_date_utc = start_date_utc + timedelta(days=day)
        
        # Convert to local timezone for astral calculations
        current_date_local = current_date_utc.astimezone(tz)
        
        try:
            # Use the existing get_horizon_azimuth function from utils.py
            azimuth, exact_time = get_horizon_azimuth(
                tz, obs, current_date_local, target_altitude_deg
            )
            
            if azimuth is not None and exact_time is not None:
                # Convert back to UTC for consistent results
                exact_time_utc = exact_time.astimezone(ZoneInfo("UTC"))
                
                # Create dictionary instead of SunsetAngle object
                sunset_data = {
                    'date': exact_time_utc.isoformat(),
                    'azimuth': round(azimuth, 2)
                }
                results.append(sunset_data)
                
        except (ValueError, AttributeError) as e:
            print(f"Could not get azimuth for {current_date_utc.date()}: {e}")
            continue
        except Exception as e:
            print(f"Unexpected error for {current_date_utc.date()}: {e}")
            continue
    
    # Sort results by date to ensure ascending order
    results.sort(key=lambda x: x['date'])
    
    return results