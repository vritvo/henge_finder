import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import sys
import os
from astral import Observer
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils import get_coordinates, get_road_bearing, get_horizon_azimuth, get_location, get_timezone_from_coordinates
from config import TARGET_ALTITUDE_DEG, SEARCH_WINDOW_MINUTES

def plot_azimuth_over_year(address, num_days=365, start_date=None):
    """
    Plots the sun's azimuth at the target altitude for each day over a period for a given address.
    """
    if start_date is None:
        start_date = datetime.today()
    location = get_location(address)
    lat, lon = get_coordinates(location)
    
    tz = get_timezone_from_coordinates(lat, lon)
    obs = Observer(lat, lon)
    road_angle = get_road_bearing(lat, lon)
    azimuths = []
    dates = []
    
    for i in range(num_days):
        date = start_date + timedelta(days=i)
        az, _ = get_horizon_azimuth(tz, obs, date, target_altitude_deg=TARGET_ALTITUDE_DEG, search_window_minutes=SEARCH_WINDOW_MINUTES)
        azimuths.append(az)
        dates.append(date)
        
    print(azimuths)
    print(dates)
    plt.figure(figsize=(12, 6))
    plt.plot(dates, azimuths, label="Sun Azimuth at Target Altitude")
    plt.axhline(road_angle, color='r', linestyle='--', label=f"Road Angle ({road_angle:.2f}°)")
    plt.xlabel("Date")
    plt.ylabel("Sun Azimuth (degrees from North)")
    plt.title(f"Sun Azimuth at Target Altitude for {address}\n(Road Angle: {road_angle:.2f}°)")
    plt.legend()
    plt.tight_layout()
    # plt.show()
    
    # save the plot to a file
    plt.savefig(f"azimuth_over_year.png")

if __name__ == "__main__":
    address = "Haarlemmerweg 109-C, 1051 KV Amsterdam, Netherlands" 
    start_date = datetime(2024, 1, 1)
    plot_azimuth_over_year(address) 