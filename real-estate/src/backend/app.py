from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import base64
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Get API key from environment
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# Serve static files from frontend folder
@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('../frontend', path)

@app.route('/api/analyze', methods=['POST'])
def analyze_image():
    try:
        # Check if image file is in request
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        # Read the file and convert to base64
        image_data = file.read()
        base64_image = base64.b64encode(image_data).decode('utf-8')
        
        # Get mime type
        mime_type = file.content_type
        
        # Prepare the request to Gemini API
        request_body = {
            "contents": [{
                "parts": [
                    {
                        "text": """You are a real estate photography analyzer. Analyze this home photo and identify notable features that would be valuable selling points for a real estate listing. 

Return your response as a JSON array of objects, where each object has:
- "feature": a concise name of the feature (e.g., "Hardwood Flooring", "Granite Countertops")
- "category": the room or area type (e.g., "Kitchen", "Bathroom", "Living Room", "Exterior", "Flooring", "Fixtures")

Focus on:
- Materials and finishes (hardwood, granite, marble, etc.)
- Appliances and fixtures (stainless steel appliances, modern fixtures)
- Architectural features (high ceilings, crown molding, built-ins)
- Lighting (natural light, updated lighting fixtures)
- Recent updates or renovations
- Storage solutions
- Views or outdoor features

Return ONLY the JSON array, nothing else. Example format:
[
  {"feature": "Stainless Steel Appliances", "category": "Kitchen"},
  {"feature": "Granite Countertops", "category": "Kitchen"}
]"""
                    },
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": base64_image
                        }
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 1000,
            }
        }
        
        # Call Gemini API (using v1 instead of v1beta)
        api_url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
        
        response = requests.post(
            api_url,
            headers={'Content-Type': 'application/json'},
            json=request_body
        )
        
        if response.status_code != 200:
            print(f"Gemini API error: {response.text}")
            return jsonify({
                'error': 'Failed to analyze image',
                'message': f'API request failed: {response.status_code}'
            }), 500
        
        data = response.json()
        
        # Debug: Print the response structure
        print("Gemini API Response:", json.dumps(data, indent=2))
        
        # Extract the text response (handle both v1 and v1beta response formats)
        try:
            if 'candidates' in data and len(data['candidates']) > 0:
                candidate = data['candidates'][0]
                if 'content' in candidate:
                    text_response = candidate['content']['parts'][0]['text']
                elif 'output' in candidate:
                    text_response = candidate['output']
                else:
                    raise KeyError("Unexpected response format")
            else:
                raise KeyError("No candidates in response")
        except (KeyError, IndexError) as e:
            print(f"Error extracting text from response: {e}")
            print(f"Response structure: {data}")
            return jsonify({
                'error': 'Unexpected API response format',
                'message': str(e)
            }), 500
        
        # Parse the JSON response
        try:
            # Remove markdown code blocks if present
            cleaned_response = text_response.replace('```json\n', '').replace('\n```', '').replace('```', '').strip()
            features = json.loads(cleaned_response)
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON: {e}")
            print(f"Raw response: {text_response}")
            return jsonify({
                'error': 'Failed to parse API response',
                'message': str(e)
            }), 500
        
        # Return the features
        return jsonify({'features': features})
        
    except Exception as e:
        print(f"Error analyzing image: {str(e)}")
        return jsonify({
            'error': 'Failed to analyze image',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    if not GEMINI_API_KEY:
        print("WARNING: GEMINI_API_KEY not found in environment variables!")
    app.run(debug=True, port=5000)