#!/usr/bin/env python3
"""
Preprocess street data for top 100 US cities
This script fetches street data from Overpass API and processes it for the Henge Finder application.
"""

import requests
import json
import time
import os
import math
from typing import List, Dict, Any, Optional
from datetime import datetime

class CityDataPreprocessor:
    def __init__(self):
        self.overpass_url = "https://overpass-api.de/api/interpreter"
        self.output_dir = "data/cities"
        self.top_100_cities = self.load_city_list()
        
    def load_city_list(self) -> List[Dict[str, Any]]:
        """Load the list of top 100 US cities with coordinates"""
        return [
            {"name": "New York, NY, USA", "lat": 40.7128, "lon": -74.0060, "state": "NY", "population": 8336817},
            {"name": "Los Angeles, CA, USA", "lat": 34.0522, "lon": -118.2437, "state": "CA", "population": 3979576},
            {"name": "Chicago, IL, USA", "lat": 41.8781, "lon": -87.6298, "state": "IL", "population": 2693976},
            {"name": "Houston, TX, USA", "lat": 29.7604, "lon": -95.3698, "state": "TX", "population": 2320268},
            {"name": "Phoenix, AZ, USA", "lat": 33.4484, "lon": -112.0740, "state": "AZ", "population": 1680992},
            {"name": "Philadelphia, PA, USA", "lat": 39.9526, "lon": -75.1652, "state": "PA", "population": 1584064},
            {"name": "San Antonio, TX, USA", "lat": 29.4241, "lon": -98.4936, "state": "TX", "population": 1547253},
            {"name": "San Diego, CA, USA", "lat": 32.7157, "lon": -117.1611, "state": "CA", "population": 1423851},
            {"name": "Dallas, TX, USA", "lat": 32.7767, "lon": -96.7970, "state": "TX", "population": 1343573},
            {"name": "San Jose, CA, USA", "lat": 37.3382, "lon": -121.8863, "state": "CA", "population": 1035317},
            {"name": "Austin, TX, USA", "lat": 30.2672, "lon": -97.7431, "state": "TX", "population": 978908},
            {"name": "Jacksonville, FL, USA", "lat": 30.3322, "lon": -81.6557, "state": "FL", "population": 949611},
            {"name": "Fort Worth, TX, USA", "lat": 32.7555, "lon": -97.3308, "state": "TX", "population": 918915},
            {"name": "Columbus, OH, USA", "lat": 39.9612, "lon": -82.9988, "state": "OH", "population": 898553},
            {"name": "Charlotte, NC, USA", "lat": 35.2271, "lon": -80.8431, "state": "NC", "population": 885708},
            {"name": "San Francisco, CA, USA", "lat": 37.7749, "lon": -122.4194, "state": "CA", "population": 881549},
            {"name": "Indianapolis, IN, USA", "lat": 39.7684, "lon": -86.1581, "state": "IN", "population": 876384},
            {"name": "Seattle, WA, USA", "lat": 47.6062, "lon": -122.3321, "state": "WA", "population": 753675},
            {"name": "Denver, CO, USA", "lat": 39.7392, "lon": -104.9903, "state": "CO", "population": 727211},
            {"name": "Washington, DC, USA", "lat": 38.9072, "lon": -77.0369, "state": "DC", "population": 705749},
            {"name": "Boston, MA, USA", "lat": 42.3601, "lon": -71.0589, "state": "MA", "population": 692600},
            {"name": "El Paso, TX, USA", "lat": 31.7619, "lon": -106.4850, "state": "TX", "population": 682669},
            {"name": "Nashville, TN, USA", "lat": 36.1627, "lon": -86.7816, "state": "TN", "population": 670820},
            {"name": "Detroit, MI, USA", "lat": 42.3314, "lon": -83.0458, "state": "MI", "population": 670031},
            {"name": "Oklahoma City, OK, USA", "lat": 35.4676, "lon": -97.5164, "state": "OK", "population": 655057},
            {"name": "Portland, OR, USA", "lat": 45.5152, "lon": -122.6784, "state": "OR", "population": 654741},
            {"name": "Las Vegas, NV, USA", "lat": 36.1699, "lon": -115.1398, "state": "NV", "population": 651319},
            {"name": "Memphis, TN, USA", "lat": 35.1495, "lon": -90.0490, "state": "TN", "population": 651073},
            {"name": "Louisville, KY, USA", "lat": 38.2527, "lon": -85.7585, "state": "KY", "population": 617638},
            {"name": "Baltimore, MD, USA", "lat": 39.2904, "lon": -76.6122, "state": "MD", "population": 593490},
            {"name": "Milwaukee, WI, USA", "lat": 43.0389, "lon": -87.9065, "state": "WI", "population": 590157},
            {"name": "Albuquerque, NM, USA", "lat": 35.0844, "lon": -106.6504, "state": "NM", "population": 560513},
            {"name": "Tucson, AZ, USA", "lat": 32.2226, "lon": -110.9747, "state": "AZ", "population": 548073},
            {"name": "Fresno, CA, USA", "lat": 36.7378, "lon": -119.7871, "state": "CA", "population": 542107},
            {"name": "Sacramento, CA, USA", "lat": 38.5816, "lon": -121.4944, "state": "CA", "population": 513624},
            {"name": "Mesa, AZ, USA", "lat": 33.4152, "lon": -111.8315, "state": "AZ", "population": 508958},
            {"name": "Kansas City, MO, USA", "lat": 39.0997, "lon": -94.5786, "state": "MO", "population": 508090},
            {"name": "Atlanta, GA, USA", "lat": 33.7490, "lon": -84.3880, "state": "GA", "population": 498715},
            {"name": "Long Beach, CA, USA", "lat": 33.7701, "lon": -118.1937, "state": "CA", "population": 462257},
            {"name": "Colorado Springs, CO, USA", "lat": 38.8339, "lon": -104.8214, "state": "CO", "population": 478221},
            {"name": "Raleigh, NC, USA", "lat": 35.7796, "lon": -78.6382, "state": "NC", "population": 474069},
            {"name": "Miami, FL, USA", "lat": 25.7617, "lon": -80.1918, "state": "FL", "population": 467963},
            {"name": "Virginia Beach, VA, USA", "lat": 36.8529, "lon": -76.0172, "state": "VA", "population": 459470},
            {"name": "Omaha, NE, USA", "lat": 41.2565, "lon": -95.9345, "state": "NE", "population": 478192},
            {"name": "Oakland, CA, USA", "lat": 37.8044, "lon": -122.2712, "state": "CA", "population": 433031},
            {"name": "Minneapolis, MN, USA", "lat": 44.9778, "lon": -93.2650, "state": "MN", "population": 429606},
            {"name": "Tulsa, OK, USA", "lat": 36.1540, "lon": -95.9928, "state": "OK", "population": 401190},
            {"name": "Arlington, TX, USA", "lat": 32.7357, "lon": -97.1081, "state": "TX", "population": 398854},
            {"name": "Tampa, FL, USA", "lat": 27.9506, "lon": -82.4572, "state": "FL", "population": 399700},
            {"name": "New Orleans, LA, USA", "lat": 29.9511, "lon": -90.0715, "state": "LA", "population": 390144},
            {"name": "Wichita, KS, USA", "lat": 37.6872, "lon": -97.3301, "state": "KS", "population": 389938},
            {"name": "Cleveland, OH, USA", "lat": 41.4993, "lon": -81.6944, "state": "OH", "population": 383793},
            {"name": "Bakersfield, CA, USA", "lat": 35.3733, "lon": -119.0187, "state": "CA", "population": 384145},
            {"name": "Aurora, CO, USA", "lat": 39.7294, "lon": -104.8319, "state": "CO", "population": 386261},
            {"name": "Anaheim, CA, USA", "lat": 33.8366, "lon": -117.9143, "state": "CA", "population": 346824},
            {"name": "Honolulu, HI, USA", "lat": 21.3099, "lon": -157.8581, "state": "HI", "population": 350964},
            {"name": "Santa Ana, CA, USA", "lat": 33.7455, "lon": -117.8677, "state": "CA", "population": 334227},
            {"name": "Riverside, CA, USA", "lat": 33.9533, "lon": -117.3962, "state": "CA", "population": 314998},
            {"name": "Corpus Christi, TX, USA", "lat": 27.8006, "lon": -97.3964, "state": "TX", "population": 326586},
            {"name": "Lexington, KY, USA", "lat": 38.0406, "lon": -84.5037, "state": "KY", "population": 323152},
            {"name": "Stockton, CA, USA", "lat": 37.9577, "lon": -121.2908, "state": "CA", "population": 310496},
            {"name": "Henderson, NV, USA", "lat": 36.0395, "lon": -114.9817, "state": "NV", "population": 317610},
            {"name": "Saint Paul, MN, USA", "lat": 44.9537, "lon": -93.0900, "state": "MN", "population": 311527},
            {"name": "St. Louis, MO, USA", "lat": 38.6270, "lon": -90.1994, "state": "MO", "population": 300576},
            {"name": "Milwaukee, WI, USA", "lat": 43.0389, "lon": -87.9065, "state": "WI", "population": 590157},
            {"name": "Baltimore, MD, USA", "lat": 39.2904, "lon": -76.6122, "state": "MD", "population": 593490},
            {"name": "Glendale, AZ, USA", "lat": 33.5387, "lon": -112.1860, "state": "AZ", "population": 248325},
            {"name": "Gilbert, AZ, USA", "lat": 33.3528, "lon": -111.7890, "state": "AZ", "population": 267918},
            {"name": "North Las Vegas, NV, USA", "lat": 36.1989, "lon": -115.1175, "state": "NV", "population": 262527},
            {"name": "Winston-Salem, NC, USA", "lat": 36.0999, "lon": -80.2442, "state": "NC", "population": 247945},
            {"name": "Chesapeake, VA, USA", "lat": 36.7682, "lon": -76.2875, "state": "VA", "population": 249422},
            {"name": "Norfolk, VA, USA", "lat": 36.8468, "lon": -76.2852, "state": "VA", "population": 242742},
            {"name": "Fremont, CA, USA", "lat": 37.5483, "lon": -121.9886, "state": "CA", "population": 230504},
            {"name": "Garland, TX, USA", "lat": 32.9126, "lon": -96.6389, "state": "TX", "population": 238002},
            {"name": "Irving, TX, USA", "lat": 32.8140, "lon": -96.9489, "state": "TX", "population": 256684},
            {"name": "Hialeah, FL, USA", "lat": 25.8576, "lon": -80.2781, "state": "FL", "population": 223109},
            {"name": "Richmond, VA, USA", "lat": 37.5407, "lon": -77.4360, "state": "VA", "population": 230436},
            {"name": "Boise, ID, USA", "lat": 43.6150, "lon": -116.2023, "state": "ID", "population": 228959},
            {"name": "Spokane, WA, USA", "lat": 47.6588, "lon": -117.4260, "state": "WA", "population": 228989},
            {"name": "Des Moines, IA, USA", "lat": 41.5868, "lon": -93.6250, "state": "IA", "population": 214237},
            {"name": "Tacoma, WA, USA", "lat": 47.2529, "lon": -122.4443, "state": "WA", "population": 219346},
            {"name": "San Bernardino, CA, USA", "lat": 34.1083, "lon": -117.2898, "state": "CA", "population": 222101},
            {"name": "Modesto, CA, USA", "lat": 37.6391, "lon": -120.9969, "state": "CA", "population": 218464},
            {"name": "Fontana, CA, USA", "lat": 34.0922, "lon": -117.4350, "state": "CA", "population": 208393},
            {"name": "Santa Clarita, CA, USA", "lat": 34.3917, "lon": -118.5426, "state": "CA", "population": 228673},
            {"name": "Birmingham, AL, USA", "lat": 33.5186, "lon": -86.8104, "state": "AL", "population": 200733},
            {"name": "Oxnard, CA, USA", "lat": 34.1975, "lon": -119.1771, "state": "CA", "population": 202063},
            {"name": "Fayetteville, NC, USA", "lat": 35.0527, "lon": -78.8784, "state": "NC", "population": 208501},
            {"name": "Moreno Valley, CA, USA", "lat": 33.9425, "lon": -117.2297, "state": "CA", "population": 208634},
            {"name": "Rochester, NY, USA", "lat": 43.1566, "lon": -77.6088, "state": "NY", "population": 205695},
            {"name": "Glendale, CA, USA", "lat": 34.1425, "lon": -118.2551, "state": "CA", "population": 201020},
            {"name": "Huntington Beach, CA, USA", "lat": 33.6595, "lon": -117.9988, "state": "CA", "population": 198711},
            {"name": "Salt Lake City, UT, USA", "lat": 40.7608, "lon": -111.8910, "state": "UT", "population": 200591},
            {"name": "Grand Rapids, MI, USA", "lat": 42.9634, "lon": -85.6681, "state": "MI", "population": 198917},
            {"name": "Amarillo, TX, USA", "lat": 35.2220, "lon": -101.8313, "state": "TX", "population": 200393},
            {"name": "Yonkers, NY, USA", "lat": 40.9312, "lon": -73.8988, "state": "NY", "population": 200370},
            {"name": "Aurora, IL, USA", "lat": 41.7606, "lon": -88.3201, "state": "IL", "population": 180542},
            {"name": "Montgomery, AL, USA", "lat": 32.3617, "lon": -86.2792, "state": "AL", "population": 200022},
            {"name": "Akron, OH, USA", "lat": 41.0814, "lon": -81.5190, "state": "OH", "population": 197597}
        ]
        
    def get_city_bounds(self, lat: float, lon: float, radius_km: float = 25) -> Dict[str, float]:
        """Calculate bounding box for a city"""
        # Convert km to degrees (approximate)
        lat_delta = radius_km / 111.0
        lon_delta = radius_km / (111.0 * math.cos(math.radians(lat)))
        
        return {
            "north": lat + lat_delta,
            "south": lat - lat_delta,
            "east": lon + lon_delta,
            "west": lon - lon_delta
        }
        
    def fetch_street_data(self, bounds: Dict[str, float]) -> List[Dict[str, Any]]:
        """Fetch street data from Overpass API"""
        query = f"""
[out:json][timeout:60];
(
  way["highway"~"^(primary|secondary|tertiary|residential|trunk)$"]
  ["name"]
  ({bounds['south']},{bounds['west']},{bounds['north']},{bounds['east']});
);
out geom;
        """
        
        try:
            print(f"Fetching data for bounds: {bounds}")
            response = requests.post(self.overpass_url, data=query, timeout=120)
            response.raise_for_status()
            data = response.json()
            print(f"Received {len(data.get('elements', []))} elements from Overpass API")
            return data.get('elements', [])
        except Exception as e:
            print(f"Error fetching data: {e}")
            return []
            
    def calculate_bearing(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate bearing between two points"""
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lon = math.radians(lon2 - lon1)
        
        y = math.sin(delta_lon) * math.cos(lat2_rad)
        x = math.cos(lat1_rad) * math.sin(lat2_rad) - math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(delta_lon)
        
        bearing = math.atan2(y, x)
        return (math.degrees(bearing) + 360) % 360
        
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points in meters"""
        # Haversine formula
        R = 6371000  # Earth's radius in meters
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = (math.sin(delta_lat/2)**2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
        
    def process_street_geometry(self, way: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process a single street way into our format"""
        geometry = way.get('geometry', [])
        if len(geometry) < 2:
            return None
            
        # Calculate bearing from first to last point
        start = geometry[0]
        end = geometry[-1]
        bearing = self.calculate_bearing(start['lat'], start['lon'], end['lat'], end['lon'])
        
        # Calculate total length
        total_length = 0
        for i in range(len(geometry) - 1):
            current = geometry[i]
            next_point = geometry[i + 1]
            total_length += self.calculate_distance(
                current['lat'], current['lon'],
                next_point['lat'], next_point['lon']
            )
            
        return {
            "id": f"way_{way['id']}",
            "name": way.get('tags', {}).get('name', 'Unnamed Street'),
            "type": way.get('tags', {}).get('highway', 'unknown'),
            "geometry": [{"lat": point['lat'], "lon": point['lon']} for point in geometry],
            "bearing": round(bearing, 1),
            "length": round(total_length, 1),
            "osm_id": way['id']
        }
        
    def process_city(self, city_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single city"""
        print(f"Processing {city_data['name']}...")
        
        bounds = self.get_city_bounds(city_data['lat'], city_data['lon'])
        raw_streets = self.fetch_street_data(bounds)
        
        processed_streets = []
        for way in raw_streets:
            processed = self.process_street_geometry(way)
            if processed and processed['length'] > 100:  # Filter out very short streets
                processed_streets.append(processed)
                
        result = {
            "city": city_data['name'],
            "state": city_data['state'],
            "population": city_data['population'],
            "bounds": bounds,
            "streets": processed_streets,
            "metadata": {
                "processed_date": datetime.now().strftime("%Y-%m-%d"),
                "total_streets": len(processed_streets),
                "data_source": "overpass_api"
            }
        }
        
        return result
        
    def save_city_data(self, city_data: Dict[str, Any]) -> None:
        """Save processed city data to file"""
        filename = f"{city_data['city'].replace(', ', '_').replace(' ', '_')}.json"
        filepath = os.path.join(self.output_dir, filename)
        
        os.makedirs(self.output_dir, exist_ok=True)
        
        with open(filepath, 'w') as f:
            json.dump(city_data, f, indent=2)
            
        print(f"Saved {len(city_data['streets'])} streets for {city_data['city']}")
        
    def process_all_cities(self) -> None:
        """Process all top 100 cities"""
        print(f"Starting to process {len(self.top_100_cities)} cities...")
        
        for i, city_data in enumerate(self.top_100_cities):
            try:
                processed = self.process_city(city_data)
                self.save_city_data(processed)
                
                # Rate limiting - be nice to Overpass API
                if i < len(self.top_100_cities) - 1:
                    print(f"Waiting 2 seconds before next city...")
                    time.sleep(2)
                    
            except Exception as e:
                print(f"Error processing {city_data['name']}: {e}")
                continue
                
        print("Processing complete!")
        
    def process_single_city(self, city_name: str) -> None:
        """Process a single city by name"""
        city_data = next((city for city in self.top_100_cities if city['name'] == city_name), None)
        if not city_data:
            print(f"City '{city_name}' not found in top 100 list")
            return
            
        try:
            processed = self.process_city(city_data)
            self.save_city_data(processed)
        except Exception as e:
            print(f"Error processing {city_name}: {e}")

if __name__ == "__main__":
    import sys
    
    preprocessor = CityDataPreprocessor()
    
    if len(sys.argv) > 1:
        # Process single city
        city_name = sys.argv[1]
        preprocessor.process_single_city(city_name)
    else:
        # Process all cities
        preprocessor.process_all_cities()
