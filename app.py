from flask import Flask, render_template, request, jsonify
from hengefinder import search_for_henge, get_coordinates, get_road_angle
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
            return jsonify({'error': 'Address is required'}), 400
        
        print(f"Processing address: {address}")
        
        # Get coordinates first
        try:
            lat, lon = get_coordinates(address)
            print(f"Coordinates: {lat}, {lon}")
        except Exception as e:
            print(f"Error getting coordinates: {e}")
            return jsonify({'error': f'Could not find coordinates for address: {str(e)}'}), 400
        
        # Get road angle
        try:
            road_angle = get_road_angle(lat, lon)
            print(f"Road angle: {road_angle}")
        except Exception as e:
            print(f"Error getting road angle: {e}")
            return jsonify({'error': f'Could not determine road angle: {str(e)}'}), 400
        
        # Check for henge
        print("Checking for henge...")
        result = search_for_henge(lat, lon, datetime.today())
        print(f"Henge result: {result}")
        
        return jsonify({
            'address': address,
            'coordinates': {'lat': lat, 'lon': lon},
            'road_angle': round(road_angle, 2),
            'result': result
        })
        
    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001) 