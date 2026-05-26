# 🌅 Hengefinder 

Finds when the sun aligns with your street for a perfect sunset view (like [Manhattanhenge](https://en.wikipedia.org/wiki/Manhattanhenge)).

- Enter an address to check for alignment with the sunset (or more specifically, alignment a little before sunset, the last moment the sun is at 50˚)
- Shows street bearing and sun alignment information
- Displays coordinates and next henge date (if there is one)

## Installing & Running

### Command Line Tool
   ```bash
   pip install -r requirements.txt
   ```
That's it! Then just run with 

```
python hengefinder.py
```

### Web Application
To run the web interface:

1. Create a virtual environment with `uv`:
   ```bash
   uv venv
   ```

2. Activate the virtual environment:
   ```bash
   source .venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   uv pip install -r requirements.txt
   ```

4. Run the web app:
   ```bash
   python app.py
   ```

The web app will be available at `http://localhost:8080`

Some sample addresses:

- `211 E 43rd St, NYC` (Manhattanhenge location)
- `601-615 E 76th St, Chicago, IL` 
- `3131 Market St, Philadelphia, PA 19104`

## How It Works

The algorithm searches for dates when the sun's azimuth at 0.5 degrees elevation (shortly before sunset) aligns with the street's bearing.