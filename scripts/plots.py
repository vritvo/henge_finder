import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils import get_coordinates, get_road_bearing, get_horizon_azimuth

def plot_azimuth_over_year(address, num_days=365, start_date=None):
    """
    Plots the sun's azimuth at the target altitude for each day over a period for a given address.
    """
    if start_date is None:
        start_date = datetime.today()
    lat, lon = get_coordinates(address)
    road_angle = get_road_bearing(lat, lon)
    azimuths = []
    dates = []
    for i in range(num_days):
        date = start_date + timedelta(days=i)
        az, _ = get_horizon_azimuth(lat, lon, date)
        azimuths.append(az)
        dates.append(date)
    plt.figure(figsize=(12, 6))
    plt.plot(dates, azimuths, label="Sun Azimuth at Target Altitude")
    plt.axhline(road_angle, color='r', linestyle='--', label=f"Road Angle ({road_angle:.2f}°)")
    plt.xlabel("Date")
    plt.ylabel("Sun Azimuth (degrees from North)")
    plt.title(f"Sun Azimuth at Target Altitude for {address}\n(Road Angle: {road_angle:.2f}°)")
    plt.legend()
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    address = "211 E 43rd St, NYC" 
    plot_azimuth_over_year(address) 