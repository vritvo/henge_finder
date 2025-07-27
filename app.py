from flask import Flask, render_template, request, jsonify
from hengefinder import search_for_henge
from utils import get_coordinates, get_standardized_address, get_road_bearing, GeocodingError, check_latitude
from datetime import datetime
import traceback

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/check_henge', methods=['POST'])
def check_henge():
    try:
        data = request.get_json()
        address = data.get('address')
        
        if not address:
            return jsonify({'error': 'Please enter an address to search for henge alignments.'}), 400
        
        print(f"Processing address: {address}")
        
        # Get coordinates and standardized address first
        try:
            lat, lon = get_coordinates(address)
            standardized_address = get_standardized_address(address)
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
            road_bearing = get_road_bearing(lat, lon)
            print(f"Road angle: {road_bearing}")
        except Exception as e:
            print(f"Error getting road angle: {e}")
            return jsonify({
                'error': f"Could not determine the street direction at this location. This might happen if the address is not near a mapped road, or if the road data is incomplete. Try using a different address on the same street."
            }), 400
        
        # Check for henge
        print("Checking for henge...")
        result = search_for_henge(lat, lon, datetime.today())
        print(f"Henge result: {result}")
        
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