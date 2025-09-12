from flask import Flask, render_template, request, jsonify
from hengefinder import search_for_henge
import datetime
from utils import get_location, get_coordinates, get_standardized_address, get_road_bearing, GeocodingError, check_latitude, get_utc_start_date, normalize_bearing_to_180_360
import traceback
from astral import Observer, sun
from sunset_calculator import calculate_sun_azimuths_for_year
from zoneinfo import ZoneInfo


app = Flask(__name__)

def make_observer():
    address = "251 W 42nd St, New York, NY"  # Fixed Manhattan address for demonstration
    # Get coordinates for the fixed address
    location = get_location(address)
    lat, lon = get_coordinates(location)
    return Observer(lat, lon)

demo_observer = make_observer()


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/henge_near_me')
def henge_near_me():
    return render_template('henge_near_me.html')

@app.route('/lookup_azimuth_altitude', methods=['POST'])
def lookup_azimuth_altitude():
    """Endpoint that handles azimuth and altitude lookup for visualization"""
    try:
        data = request.get_json()
        time_str = data.get('time')
        demo_road_bearing =299.5  # Default Manhattan bearing
        
        if not time_str:
            return jsonify({'error': 'Time parameter is required'}), 400
            
        # Parse the time string
        exact_time = datetime.datetime.fromisoformat(time_str.replace('Z', '+00:00'))
        
        graphic_az = sun.azimuth(demo_observer, exact_time) - demo_road_bearing 
        alt = sun.elevation(demo_observer, exact_time)
        
        return jsonify({
            'graphic_az': graphic_az,
            'altitude': alt,
        })
        
    except Exception as e:
        print(f"Unexpected error in lookup_azimuth_altitude: {e}")
        traceback.print_exc()
        return jsonify({'error': 'An unexpected error occurred while calculating sun position.'}), 500

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
                'error': "Invalid road bearing value provided. Please try adjusting the arrow again."
            }), 400
        except Exception as e:
            print(f"Error getting road angle: {e}")
            return jsonify({
                'error': "Could not determine the street direction at this location. This might happen if the address is not near a mapped road, or if the road data is incomplete. Try using a different address on the same street."
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


@app.route('/lookup_sun_angles', methods=['POST'])
def lookup_sun_angles():
    """Endpoint that calculates sun azimuth for every day of the year at a given location"""
    try:
        data = request.get_json()
        address = data.get('address')
        year = data.get('year')  # Optional year, defaults to current year
        time_of_day = data.get('time_of_day', 'sunrise')  # Default to sunrise if not provided
        
        if not address:
            return jsonify({'error': 'Please enter an address to calculate sun angles.'}), 400

        # Validate time_of_day parameter
        if time_of_day not in ['sunrise', 'sunset']:
            return jsonify({'error': 'time_of_day must be either "sunrise" or "sunset"'}), 400

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

        # Calculate sun angles with henge detection
        try:
            target_altitude_deg = 0.5
            result = calculate_sun_azimuths_for_year(lat, lon, year, target_altitude_deg, time_of_day)
            
            # Add address and coordinate info to response
            response_data = {
                'address': standardized_address,
                'coordinates': {'lat': lat, 'lon': lon},
                'year': year if year else datetime.now(ZoneInfo("UTC")).year,
                'time_of_day': time_of_day,
                'sun_angles': result
            }
            
            return jsonify(response_data)
            
        except Exception as e:
            print(f"Error calculating sun angles: {e}")
            traceback.print_exc()
            return jsonify({
                'error': f'An error occurred while calculating {time_of_day} angles. Please try again.'
            }), 500
            
    except Exception as e:
        print(f"Unexpected error in lookup_sun_angles: {e}")
        traceback.print_exc()
        return jsonify({
            'error': 'An unexpected error occurred while processing your request. Please try again or contact support if the problem persists.'
        }), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)