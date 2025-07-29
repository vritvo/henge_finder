from flask import Flask, render_template, request, jsonify
from hengefinder import search_for_henge
from utils import get_location, get_coordinates, get_standardized_address, get_road_bearing, GeocodingError, check_latitude, get_utc_start_date
import traceback
import time

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/check_henge', methods=['POST'])
def check_henge():
    total_start_time = time.time()
    try:
        data = request.get_json()
        address = data.get('address')
        
        if not address:
            return jsonify({'error': 'Please enter an address to search for henge alignments.'}), 400

        print(f"Processing address: {address}")

        # Get coordinates and standardized address first
        try:
            coords_start_time = time.time()
            location = get_location(address)
            lat, lon = get_coordinates(location)
            coords_end_time = time.time()
            print(f"⏱️  get_coordinates took: {coords_end_time - coords_start_time:.3f}s")

            standardized_address = get_standardized_address(location)
            try:
                check_latitude(lat)
            except ValueError as e:
                return jsonify({'error': str(e)}), 400
            print(f"Coordinates: {lat}, {lon}")
            print(f"Standardized address: {standardized_address}")
        except GeocodingError as e:
            print(f"Geocoding error: {e}")
            return jsonify({
                'error': f"Could not find the address '{address}'. Please check the spelling and try again)."
            }), 400
        except Exception as e:
            print(f"Unexpected error getting coordinates: {e}")
            return jsonify({'error': f'Error processing address: {str(e)}'}), 400

        # Get road bearing
        try:
            bearing_start_time = time.time()
            road_bearing = get_road_bearing(lat, lon)
            bearing_end_time = time.time()
            print(f"⏱️  get_road_bearing took: {bearing_end_time - bearing_start_time:.3f}s")
            print(f"Road angle: {road_bearing}")
        except Exception as e:
            print(f"Error getting road angle: {e}")
            return jsonify({
                'error': f"Could not determine the street direction at this location. This might happen if the address is not near a mapped road, or if the road data is incomplete. Try using a different address on the same street."
            }), 400

        start_date = get_utc_start_date() #server is in UTC - standardizing.

        # Check for henge
        print("Checking for henge...")
        henge_start_time = time.time()
        result = search_for_henge(lat, lon, start_date, road_bearing=road_bearing)
        henge_end_time = time.time()
        print(f"⏱️  search_for_henge took: {henge_end_time - henge_start_time:.3f}s")
        print(f"Henge result: {result}")

        total_end_time = time.time()
        print(f"⏱️  Total check_henge took: {total_end_time - total_start_time:.3f}s")

        return jsonify({
            'address': standardized_address,
            'coordinates': {'lat': lat, 'lon': lon},
            'road_bearing': round(road_bearing, 2),
            'result': result
        })

    except Exception as e:
        print(f"Unexpected error: {e}")
        traceback.print_exc()
        return jsonify({
            'error': 'An unexpected error occurred while processing your request. Please try again or contact support if the problem persists.'
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)
