import matplotlib.pyplot as plt
from datetime import datetime, date
import sys
import os
import pandas as pd
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils import get_coordinates, get_road_bearing, get_location
from config import TARGET_ALTITUDE_DEG
from sunset_calculator import calculate_sun_azimuths_for_year

def plot_azimuth_over_year(address, num_days=365, start_date=None, time_of_day="sunset"):
    """
    Plots the sun's azimuth at the target altitude for each day over a period for a given address.
    
    Args:
        address: Address string to geocode
        num_days: Number of days to plot (default: 365)
        start_date: Start date for calculations (default: January 1 of current year)
        time_of_day: Either "sunrise" or "sunset" (default: "sunset")
    """
    location = get_location(address)
    lat, lon = get_coordinates(location)
    
    # Convert start_date to date object if it's a datetime
    if start_date is not None and isinstance(start_date, datetime):
        start_date = start_date.date()
    
    # Calculate azimuths for the year
    azimuths_dict = calculate_sun_azimuths_for_year(
        lat, lon,
        start_date=start_date,
        target_altitude_deg=TARGET_ALTITUDE_DEG,
        time_of_day=time_of_day
    )
    
    # Convert dictionary to sorted list (by day index)
    azimuths_for_year = [azimuths_dict[i] for i in sorted(azimuths_dict.keys())]
    
    # Extract data for plotting
    dates = [datetime.fromisoformat(item['date']) for item in azimuths_for_year]
    azimuths = [item['azimuth'] for item in azimuths_for_year]
    
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
    
    # Create plots directory if it doesn't exist
    plots_dir = "plots"
    os.makedirs(plots_dir, exist_ok=True)
    
    # Create base filename (without extension)
    base_filename = f"azimuth_data_{address.replace(' ', '_').replace(',', '')}"
    
    # Save the plot to a file
    plt.savefig(f"{plots_dir}/{base_filename}.png")

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
    df.to_csv(f"{plots_dir}/{base_filename}.csv", index=False)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Address is required")
        sys.exit(1)
    
    address = sys.argv[1]
    start_date = date(2024, 1, 1)
    plot_azimuth_over_year(address) 