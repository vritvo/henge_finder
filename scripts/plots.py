import matplotlib.pyplot as plt
from datetime import datetime, date
import sys
import os
import pandas as pd
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils import get_coordinates, get_road_bearing, get_location
from config import TARGET_ALTITUDE_DEG
from sunset_calculator import calculate_sun_azimuths_for_year

# City coordinates for multi-city comparison
CITIES = {
    "Quito, Ecuador": (-0.1807, -78.4678),
    "Miami, USA": (25.7617, -80.1918),
    "NYC, USA": (40.7128, -74.0060),
    "London, UK": (51.5074, -0.1278),
    "Oslo, Norway": (59.9139, 10.7522)
}


def _get_azimuth_data(lat, lon, start_date=None, time_of_day="sunset"):
    """
    Helper function to get azimuth data for a given location.
    
    Args:
        lat: Latitude in degrees
        lon: Longitude in degrees
        start_date: Start date for calculations (default: January 1 of current year)
        time_of_day: Either "sunrise" or "sunset" (default: "sunset")
        
    Returns:
        tuple: (dates, azimuths, azimuths_for_year)
            - dates: List of datetime objects
            - azimuths: List of azimuth values
            - azimuths_for_year: List of dictionaries with 'date' and 'azimuth' keys
    """
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
    
    return dates, azimuths, azimuths_for_year


def _save_plot_and_csv(figure, base_filename, dates, azimuths_for_year, metadata=None):
    """
    Helper function to save plot and CSV file.
    
    Args:
        figure: matplotlib figure object
        base_filename: Base filename (without extension)
        dates: List of datetime objects
        azimuths_for_year: List of dictionaries with 'date' and 'azimuth' keys
        metadata: Dictionary with additional columns for CSV (e.g., {'road_bearing': value, 'address': value})
    """
    # Create plots directory if it doesn't exist
    plots_dir = "plots"
    os.makedirs(plots_dir, exist_ok=True)
    
    # Save the plot to a file
    figure.savefig(f"{plots_dir}/{base_filename}.png")
    
    # Save data to CSV file
    # Create DataFrame with the data
    df_data = {
        'date': [d.strftime('%Y-%m-%d') for d in dates],
        'datetime_iso': [item['date'] for item in azimuths_for_year],
        'azimuth': [item['azimuth'] for item in azimuths_for_year]
    }
    
    # Add metadata columns if provided
    if metadata:
        for key, value in metadata.items():
            if isinstance(value, (list, tuple)):
                df_data[key] = value
            else:
                df_data[key] = [value] * len(dates)
    
    df = pd.DataFrame(df_data)
    
    # Save to CSV
    df.to_csv(f"{plots_dir}/{base_filename}.csv", index=False)


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
    
    # Get azimuth data using helper function
    dates, azimuths, azimuths_for_year = _get_azimuth_data(lat, lon, start_date, time_of_day)
    
    road_angle = get_road_bearing(lat, lon)
    
    # Create plot
    fig = plt.figure(figsize=(12, 6))
    plt.plot(dates, azimuths, label="Sun Azimuth at Target Altitude")
    plt.axhline(road_angle, color='k', linestyle='--', label=f"Road Angle ({road_angle:.2f}°)")
    plt.xlabel("Date")
    plt.ylabel("Sun Azimuth (degrees from North)")
    plt.title(f"Sun Azimuth at Target Altitude for {address}\n(Road Angle: {road_angle:.2f}°)")
    plt.legend()
    plt.tight_layout()
    # plt.show()
    
    # Create base filename (without extension)
    base_filename = f"azimuth_data_{address.replace(' ', '_').replace(',', '')}"
    
    # Save plot and CSV using helper function
    _save_plot_and_csv(
        fig,
        base_filename,
        dates,
        azimuths_for_year,
        metadata={'road_bearing': road_angle, 'address': address}
    )


def plot_azimuth_over_year_multi_city(cities=None, start_date=None, time_of_day="sunset"):
    """
    Plots the sun's azimuth at the target altitude for multiple cities overlaid on one plot.
    
    Args:
        cities: Dictionary mapping city names to (lat, lon) tuples. If None, uses default CITIES.
        start_date: Start date for calculations (default: January 1 of current year)
        time_of_day: Either "sunrise" or "sunset" (default: "sunset")
    """
    if cities is None:
        cities = CITIES
    
    # Create plot
    fig = plt.figure(figsize=(12, 6))
    
    # Collect all data for CSV
    all_csv_data = []
    
    # Plot each city with different color
    for city_name, (lat, lon) in cities.items():
        dates, azimuths, azimuths_for_year = _get_azimuth_data(lat, lon, start_date, time_of_day)
        
        # Format label with latitude (rounded to nearest degree)
        lat_rounded = round(lat)
        lat_label = f"{lat_rounded}°N" if lat >= 0 else f"{abs(lat_rounded)}°S"
        label = f"{city_name} ({lat_label})"
        
        # Plot this city's data
        plt.plot(dates, azimuths, label=label)
        
        # Collect data for CSV
        for i, item in enumerate(azimuths_for_year):
            all_csv_data.append({
                'date': dates[i].strftime('%Y-%m-%d'),
                'datetime_iso': item['date'],
                'azimuth': item['azimuth'],
                'city': city_name
            })
    
    # Set fixed y-axis range to 360
    # plt.ylim(0, 360)
    plt.xlabel("Date")
    plt.ylabel("Sun Azimuth (degrees from North)")
    plt.title("Sun Azimuth at Target Altitude Across Different Latitudes")
    plt.legend()
    plt.tight_layout()
    # plt.show()
    
    # Save plot
    base_filename = "azimuth_comparison_multi_city"
    
    # Create plots directory if it doesn't exist
    plots_dir = "plots"
    os.makedirs(plots_dir, exist_ok=True)
    
    # Save the plot
    fig.savefig(f"{plots_dir}/{base_filename}.png")
    
    # Save combined CSV with all cities
    df = pd.DataFrame(all_csv_data)
    df.to_csv(f"{plots_dir}/{base_filename}.csv", index=False)


if __name__ == "__main__":
    start_date = date(2026, 1, 1)
    
    # Check for multi-city mode
    if len(sys.argv) > 1 and sys.argv[1] == "--multi-city":
        plot_azimuth_over_year_multi_city(start_date=start_date)
    else:
        # Single address mode (backward compatible)
        if len(sys.argv) < 2:
            print("Usage:")
            print("  Single address: python scripts/plots.py <address>")
            print("  Multi-city:     python scripts/plots.py --multi-city")
            sys.exit(1)
        
        address = sys.argv[1]
        plot_azimuth_over_year(address, start_date=start_date) 