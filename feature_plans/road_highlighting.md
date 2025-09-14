# Road Filtering Implementation Plan for Henge Finder

## Overview
This plan outlines the implementation of street highlighting functionality for the Henge Near Me feature, focusing on the largest 100 US cities with preprocessed data and intelligent filtering.

## 1. File Structure

### New Files to Create
- `static/js/road_filter.js` - Main road filtering logic
- `static/css/road_filter.css` - Styling for road controls
- `data/cities/` directory - For preprocessed city data
- `scripts/preprocess_cities.py` - Data preprocessing script

### Files to Modify
- `static/js/henge_near_me.js` - Integration points
- `templates/henge_near_me.html` - UI controls
- `static/css/henge_near_me.css` - Additional styling

## 2. Core Architecture

### 2.1 Road Filter Module (`road_filter.js`)

```javascript
// Global state management
const RoadFilter = {
    // State variables
    streetData: null,
    filteredStreets: [],
    streetHighlights: null,
    debounceTimer: null,
    currentBounds: null,
    azimuthRange: { min: 0, max: 360 },
    
    // Configuration
    config: {
        minStreetLength: 500, // meters
        maxStreetLength: 10000, // meters
        alignmentTolerance: 5, // degrees
        debounceDelay: 300, // milliseconds
        roadTypes: ['primary', 'secondary', 'tertiary', 'residential', 'trunk']
    }
};
```

### 2.2 Key Functions

#### Data Fetching
- `fetchStreetData(bounds)` - Overpass API integration (fallback)
- `loadPreprocessedData(cityName)` - Load cached data for major cities
- `calculateStreetBearing(geometry)` - Calculate road direction
- `calculateStreetLength(geometry)` - Calculate road length

#### Filtering Logic
- `filterStreetsByAzimuthRange(streets, azimuthRange)` - Filter by sun angle range
- `filterStreetsByLength(streets, minLength, maxLength)` - Filter by road length
- `filterStreetsByBounds(streets, bounds)` - Filter by visible area
- `filterStreetsByAlignment(streets, sunAzimuth, tolerance)` - Filter by alignment

#### Visualization
- `highlightAlignedStreets(streets, sunAzimuth)` - Create map overlays
- `updateStreetHighlights()` - Refresh visual display
- `clearStreetHighlights()` - Remove existing highlights

#### Debouncing & Performance
- `debounceMapUpdate()` - Debounce map interactions
- `isInBounds(geometry, bounds)` - Check if road is visible
- `throttleAPIRequests()` - Limit API calls

## 3. Integration Points

### 3.1 Modified Functions in `henge_near_me.js`

#### `initializeMap(lat, lon)`
```javascript
// Add after map initialization
map.on('moveend', RoadFilter.debounceMapUpdate);
map.on('zoomend', RoadFilter.debounceMapUpdate);
```

#### `loadCityData(cityName, isToggleChange)`
```javascript
// After successful data load
if (response.ok) {
    // ... existing code ...
    
    // Initialize road filtering
    RoadFilter.initializeForCity(data.coordinates, sunAnglesData);
}
```

#### `drawAzimuthLatticeOnCanvas()`
```javascript
// After drawing azimuth lines
if (currentCityData && sunAnglesData && sunAnglesData[currentDayOfYear]) {
    const azimuth = sunAnglesData[currentDayOfYear].azimuth;
    RoadFilter.updateHighlightsForAzimuth(azimuth);
}
```

#### `updateAzimuthDisplay()`
```javascript
// After updating azimuth display
if (sunAnglesData && sunAnglesData[currentDayOfYear]) {
    const azimuth = sunAnglesData[currentDayOfYear].azimuth;
    RoadFilter.updateHighlightsForAzimuth(azimuth);
}
```

### 3.2 New Global Variables
```javascript
// Add to existing global variables
let roadFilterEnabled = true;
let streetHighlightLayer = null;
```

## 4. UI Controls

### 4.1 HTML Additions (`henge_near_me.html`)

Add after the time toggle section:

```html
<div class="road-controls">
    <h3 style="color: #DC816E; margin-bottom: 15px; font-size: 1.3em;">Step 3: Street Highlighting</h3>
    
    <div class="control-group">
        <label class="checkbox-label">
            <input type="checkbox" id="enableStreetHighlighting" checked>
            <span class="checkmark"></span>
            Highlight aligned streets
        </label>
    </div>
    
    <div class="control-group">
        <label for="alignmentTolerance">Alignment tolerance:</label>
        <input type="range" id="alignmentTolerance" min="1" max="15" value="5" step="1">
        <span id="toleranceValue">5°</span>
    </div>
    
    <div class="control-group">
        <label for="minStreetLength">Minimum street length:</label>
        <input type="range" id="minStreetLength" min="100" max="2000" value="500" step="100">
        <span id="lengthValue">500m</span>
    </div>
    
    <div class="control-group">
        <label for="roadTypeFilter">Road types:</label>
        <select id="roadTypeFilter" multiple>
            <option value="primary" selected>Primary</option>
            <option value="secondary" selected>Secondary</option>
            <option value="tertiary" selected>Tertiary</option>
            <option value="residential">Residential</option>
            <option value="trunk">Trunk</option>
        </select>
    </div>
    
    <div class="road-stats" id="roadStats">
        <span id="totalStreets">0</span> streets loaded, 
        <span id="alignedStreets">0</span> aligned
    </div>
</div>
```

### 4.2 CSS Styling (`road_filter.css`)

```css
.road-controls {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 20px;
    margin: 20px 0;
}

.control-group {
    margin-bottom: 15px;
}

.control-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    color: #5E4955;
}

.control-group input[type="range"] {
    width: 100%;
    margin: 5px 0;
}

.control-group select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.checkbox-label {
    display: flex;
    align-items: center;
    cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
    margin-right: 8px;
}

.road-stats {
    background: #e9ecef;
    padding: 10px;
    border-radius: 4px;
    font-size: 14px;
    color: #6c757d;
    text-align: center;
}
```

## 5. Data Management Strategy

### 5.1 Top 100 US Cities for Preprocessing

#### Major Metropolitan Areas
1. New York, NY
2. Los Angeles, CA
3. Chicago, IL
4. Houston, TX
5. Phoenix, AZ
6. Philadelphia, PA
7. San Antonio, TX
8. San Diego, CA
9. Dallas, TX
10. San Jose, CA
11. Austin, TX
12. Jacksonville, FL
13. Fort Worth, TX
14. Columbus, OH
15. Charlotte, NC
16. San Francisco, CA
17. Indianapolis, IN
18. Seattle, WA
19. Denver, CO
20. Washington, DC
21. Boston, MA
22. El Paso, TX
23. Nashville, TN
24. Detroit, MI
25. Oklahoma City, OK
26. Portland, OR
27. Las Vegas, NV
28. Memphis, TN
29. Louisville, KY
30. Baltimore, MD
31. Milwaukee, WI
32. Albuquerque, NM
33. Tucson, AZ
34. Fresno, CA
35. Sacramento, CA
36. Mesa, AZ
37. Kansas City, MO
38. Atlanta, GA
39. Long Beach, CA
40. Colorado Springs, CO
41. Raleigh, NC
42. Miami, FL
43. Virginia Beach, VA
44. Omaha, NE
45. Oakland, CA
46. Minneapolis, MN
47. Tulsa, OK
48. Arlington, TX
49. Tampa, FL
50. New Orleans, LA
51. Wichita, KS
52. Cleveland, OH
53. Bakersfield, CA
54. Aurora, CO
55. Anaheim, CA
56. Honolulu, HI
57. Santa Ana, CA
58. Riverside, CA
59. Corpus Christi, TX
60. Lexington, KY
61. Stockton, CA
62. Henderson, NV
63. Saint Paul, MN
64. St. Louis, MO
65. Milwaukee, WI
66. Milwaukee, WI
67. Baltimore, MD
68. Glendale, AZ
69. Gilbert, AZ
70. North Las Vegas, NV
71. Winston-Salem, NC
72. Chesapeake, VA
73. Norfolk, VA
74. Fremont, CA
75. Garland, TX
76. Irving, TX
77. Hialeah, FL
78. Richmond, VA
79. Boise, ID
80. Spokane, WA
81. Des Moines, IA
82. Tacoma, WA
83. San Bernardino, CA
84. Modesto, CA
85. Fontana, CA
86. Santa Clarita, CA
87. Birmingham, AL
88. Oxnard, CA
89. Fayetteville, NC
90. Moreno Valley, CA
91. Rochester, NY
92. Glendale, CA
93. Huntington Beach, CA
94. Salt Lake City, UT
95. Grand Rapids, MI
96. Amarillo, TX
97. Yonkers, NY
98. Aurora, IL
99. Montgomery, AL
100. Akron, OH

#### Data Format
```json
{
  "city": "New York, NY, USA",
  "state": "NY",
  "population": 8336817,
  "bounds": {
    "north": 40.9176,
    "south": 40.4774,
    "east": -73.7004,
    "west": -74.2591
  },
  "streets": [
    {
      "id": "way_12345",
      "name": "Broadway",
      "type": "primary",
      "geometry": [
        {"lat": 40.7589, "lon": -73.9851},
        {"lat": 40.7614, "lon": -73.9776}
      ],
      "bearing": 28.5,
      "length": 1250.3,
      "osm_id": 12345
    }
  ],
  "metadata": {
    "processed_date": "2024-01-15",
    "total_streets": 15420,
    "data_source": "overpass_api"
  }
}
```

### 5.2 Data Preprocessing Script (`scripts/preprocess_cities.py`)

```python
#!/usr/bin/env python3
"""
Preprocess street data for top 100 US cities
"""

import requests
import json
import time
import os
from typing import List, Dict, Any
import math

class CityDataPreprocessor:
    def __init__(self):
        self.overpass_url = "https://overpass-api.de/api/interpreter"
        self.output_dir = "data/cities"
        self.top_100_cities = self.load_city_list()
        
    def load_city_list(self) -> List[Dict[str, Any]]:
        """Load the list of top 100 US cities with coordinates"""
        # This would contain the city data with lat/lon coordinates
        pass
        
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
            response = requests.post(self.overpass_url, data=query, timeout=120)
            response.raise_for_status()
            return response.json().get('elements', [])
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
        
    def process_street_geometry(self, way: Dict[str, Any]) -> Dict[str, Any]:
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
                "processed_date": time.strftime("%Y-%m-%d"),
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
        for i, city_data in enumerate(self.top_100_cities):
            try:
                processed = self.process_city(city_data)
                self.save_city_data(processed)
                
                # Rate limiting - be nice to Overpass API
                if i < len(self.top_100_cities) - 1:
                    time.sleep(2)
                    
            except Exception as e:
                print(f"Error processing {city_data['name']}: {e}")
                continue
                
        print("Processing complete!")

if __name__ == "__main__":
    preprocessor = CityDataPreprocessor()
    preprocessor.process_all_cities()
```

## 6. Performance Optimizations

### 6.1 Debouncing Strategy
```javascript
// Debounce map interactions
debounceMapUpdate: function() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
        this.updateForCurrentView();
    }, this.config.debounceDelay);
}
```

### 6.2 Caching Strategy
- Cache street data per city in localStorage
- Cache filtered results per azimuth
- Clear cache when changing cities
- Use IndexedDB for large datasets

### 6.3 Viewport Optimization
- Only process streets in current map bounds
- Use spatial indexing for faster filtering
- Progressive loading for large datasets

## 7. Implementation Phases

### Phase 1: Basic Infrastructure
1. Create `road_filter.js` with core structure
2. Add UI controls to HTML
3. Implement basic Overpass API integration
4. Add simple street highlighting

### Phase 2: Filtering Logic
1. Implement azimuth range filtering
2. Add length and type filtering
3. Implement debouncing
4. Add performance optimizations

### Phase 3: Preprocessed Data
1. Create data preprocessing script
2. Implement cached data loading
3. Add fallback to Overpass API
4. Optimize for top 100 US cities

### Phase 4: Polish & Performance
1. Add comprehensive error handling
2. Implement loading states
3. Add user feedback
4. Performance optimization

## 8. Error Handling

### 8.1 API Failures
- Graceful fallback to cached data
- User notification for network issues
- Retry logic with exponential backoff

### 8.2 Data Validation
- Validate street geometry data
- Handle malformed coordinates
- Filter out invalid bearings

This implementation plan provides a comprehensive roadmap for adding street highlighting functionality to your Henge Finder application, with a focus on the top 100 US cities and performance optimization.