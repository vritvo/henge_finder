from flask import Flask, render_template, request, jsonify
from hengefinder import search_for_henge
import datetime
from utils import get_location, get_coordinates, get_standardized_address, get_road_bearing, GeocodingError, check_latitude, get_utc_start_date, normalize_bearing_to_180_360
import traceback
from astral import Observer, sun


app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

# { "time": "2025-09-02T00:00:00Z" }

    @app.route('/lookup_azimuth_altitude', methods=['POST'])
    def lookup_azimuth_altitude():
        """Endpoint that handles both address lookup and henge calculation"""
        try:
            data = request.get_json()
            address = "251 W 42nd St, New York, NY"
            exact_time = datetime.datetime.strptime(data.get('time'), '%Y-%m-%dT%H:%M:%SZ')
            user_road_bearing = data.get('road_bearing')  # Optional user-provided bearing
            lat, lon = get_coordinates(address)
            obs = Observer(lat, lon)
            az = sun.azimuth(obs, exact_time)
            alt = sun.altitude(obs, exact_time)
            
            graphic_az = az - user_road_bearing 
            return jsonify({
                'graphic_az': graphic_az,
                'altitude': alt
            })
            
            
        except Exception as e:
            print(f"Unexpected error: {e}")
            traceback.print_exc()
            return jsonify({'error': 'An unexpected error occurred while processing your request. Please try again or contact support if the problem persists.'}), 500

@app.route('/lookup_address', methods=['POST'])
def lookup_address():
    """Endpoint that handles both address lookup and henge calculation"""
    try:
        data = request.get_json()
        address = data.get('address')
        user_road_bearing = data.get('road_bearing')  # Optional user-provided bearing
        
        if not address:
            return jsonify({'error': 'Please enter an address to search for henge alignments.'}), 400



        # Get coordinates and standardized address
        try:
            location = get_location(address)
            lat, lon = get_coordinates(location)

            standardized_address = get_standardized_address(location)
            try:
                check_latitude(lat)
            except ValueError as e:
                return jsonify({'error': str(e)}), 400
        except GeocodingError as e:
            print(f"Geocoding error: {e}")
            return jsonify({
                'error': f"Could not find the address '{address}'. Please check the spelling and try again."
            }), 400
        except Exception as e:
            print(f"Unexpected error getting coordinates: {e}")
            return jsonify({'error': f'Error processing address: {str(e)}'}), 400

        # Get road bearing (use user-provided if available, otherwise calculate)
        try:
            if user_road_bearing is not None:
                road_bearing = float(user_road_bearing)
                
                # Normalize to 180-360 range
                road_bearing = normalize_bearing_to_180_360(road_bearing)
            else:
                road_bearing = get_road_bearing(lat, lon)
        except (ValueError, TypeError) as e:
            print(f"Error with road bearing value: {e}")
            return jsonify({
                'error': f"Invalid road bearing value provided. Please try adjusting the arrow again."
            }), 400
        except Exception as e:
            print(f"Error getting road angle: {e}")
            return jsonify({
                'error': f"Could not determine the street direction at this location. This might happen if the address is not near a mapped road, or if the road data is incomplete. Try using a different address on the same street."
            }), 400

        # If user provided a bearing, calculate henge; otherwise just return address info
        if user_road_bearing is not None:
            # Calculate henge
            start_date = get_utc_start_date()
            result = search_for_henge(lat, lon, start_date, road_bearing=road_bearing)
            
            return jsonify({
                'address': standardized_address,
                'coordinates': {'lat': lat, 'lon': lon},
                'road_bearing': round(road_bearing, 2),
                'result': result
            })
        else:
            # Just return address info for initial display
            return jsonify({
                'address': standardized_address,
                'coordinates': {'lat': lat, 'lon': lon},
                'road_bearing': round(road_bearing, 2)
            })

    except Exception as e:
        print(f"Unexpected error: {e}")
        traceback.print_exc()
        return jsonify({
            'error': 'An unexpected error occurred while processing your request. Please try again or contact support if the problem persists.'
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)
