import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import sys
import os
from astral import Observer
import pandas as pd
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils import get_coordinates, get_road_bearing, get_horizon_azimuth, get_location, get_timezone_from_coordinates
from config import TARGET_ALTITUDE_DEG, SEARCH_WINDOW_MINUTES
from sunset_calculator import calculate_sunset_azimuths_for_year

def plot_azimuth_over_year(address, num_days=365, start_date=None):
    """
    Plots the sun's azimuth at the target altitude for each day over a period for a given address.
    """
    if start_date is None:
        start_date = datetime.today()
    location = get_location(address)
    lat, lon = get_coordinates(location)
    
    azimuths_for_year = calculate_sunset_azimuths_for_year(lat, lon)
    
    # Extract data for plotting
    dates = [datetime.fromisoformat(item['date']) for item in azimuths_for_year]
    azimuths = [item['azimuth'] for item in azimuths_for_year]
    
    tz = get_timezone_from_coordinates(lat, lon)
    obs = Observer(lat, lon)
    road_angle = get_road_bearing(lat, lon)
    
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
    output_filename = f"azimuth_data_{address.replace(' ', '_').replace(',', '')}.csv"
    plt.savefig(f"plots/{output_filename}.png")

    # Save data to CSV file
    # Create DataFrame with the data
    df = pd.DataFrame({
        'date': [d.strftime('%Y-%m-%d') for d in dates],
        'datetime_iso': [item['date'] for item in azimuths_for_year],
        'azimuth': azimuths,
        'road_bearing': [road_angle] * len(azimuths),
        'address': [address] * len(azimuths)
    })
    
    # Save to CSV
    df.to_csv(f"plots/{output_filename}", index=False)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Address is required")
        sys.exit(1)
    
    address = sys.argv[1]
    start_date = datetime(2024, 1, 1)
    plot_azimuth_over_year(address) 