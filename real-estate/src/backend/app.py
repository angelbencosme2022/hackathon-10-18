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

@app.route('/api/analyze-tour-photo', methods=['POST'])
def analyze_tour_photo():
    """Analyze a photo for virtual tour and suggest hotspot locations"""
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
        
        # Prepare the request to Gemini API with hotspot detection
        request_body = {
            "contents": [{
                "parts": [
                    {
                        "text": """You are a real estate photography analyzer for virtual tours. Analyze this home photo and identify key features with their approximate locations.

For each notable feature, estimate its position in the image as percentages (x, y) where:
- x is the horizontal position (0-100, left to right)
- y is the vertical position (0-100, top to bottom)

Return a JSON array of objects with:
- "name": concise feature name (e.g., "Granite Countertops")
- "description": brief description for buyers (e.g., "Premium granite with modern finish")
- "x": horizontal position percentage (0-100)
- "y": vertical position percentage (0-100)

Focus on identifying 3-6 of the most impressive features:
- Premium materials (hardwood, granite, marble, quartz)
- Modern appliances and fixtures
- Architectural details (crown molding, built-ins, high ceilings)
- Natural lighting sources (windows, skylights)
- Recent updates or renovations
- Unique or standout features

Be strategic with placement - position hotspots near the actual feature in the image.

Return ONLY the JSON array. Example:
[
  {"name": "Stainless Appliances", "description": "Professional-grade kitchen appliances", "x": 65, "y": 45},
  {"name": "Granite Countertops", "description": "Premium granite with elegant finish", "x": 40, "y": 55}
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
                "temperature": 0.5,
                "maxOutputTokens": 1500,
            }
        }
        
        # Call Gemini API
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
        
        # Extract the text response
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
            return jsonify({
                'error': 'Unexpected API response format',
                'message': str(e)
            }), 500
        
        # Parse the JSON response
        try:
            cleaned_response = text_response.replace('```json\n', '').replace('\n```', '').replace('```', '').strip()
            hotspots = json.loads(cleaned_response)
            
            # Validate hotspot data
            for hotspot in hotspots:
                if not all(key in hotspot for key in ['name', 'x', 'y']):
                    raise ValueError("Invalid hotspot data structure")
                # Ensure x and y are within bounds
                hotspot['x'] = max(5, min(95, float(hotspot['x'])))
                hotspot['y'] = max(5, min(95, float(hotspot['y'])))
                # Add description if missing
                if 'description' not in hotspot:
                    hotspot['description'] = ''
                    
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Error parsing JSON: {e}")
            print(f"Raw response: {text_response}")
            return jsonify({
                'error': 'Failed to parse API response',
                'message': str(e)
            }), 500
        
        return jsonify({'hotspots': hotspots})
        
    except Exception as e:
        print(f"Error analyzing tour photo: {str(e)}")
        return jsonify({
            'error': 'Failed to analyze tour photo',
            'message': str(e)
        }), 500

@app.route('/api/generate-sales-pitch', methods=['POST'])
def generate_sales_pitch():
    """Generate a compelling sales pitch based on notable features"""
    try:
        # Get the notable features from the request
        data = request.get_json()
        
        if not data or 'features' not in data:
            return jsonify({'error': 'No features provided'}), 400
        
        features = data['features']
        
        if not features or len(features) == 0:
            return jsonify({'error': 'No features to generate pitch from'}), 400
        
        # Optional: Get property type and price range for more targeted pitch
        property_type = data.get('property_type', 'home')
        price_range = data.get('price_range', '')
        
        # Prepare the request to Gemini API for sales pitch generation
        request_body = {
            "contents": [{
                "parts": [
                    {
                        "text": f"""You are an expert real estate sales copywriter. Create a compelling sales pitch based on the notable features of this {property_type}.

Notable Features:
{json.dumps(features, indent=2)}

{f"Price Range: {price_range}" if price_range else ""}

Create a sales pitch that:
1. Opens with an attention-grabbing headline
2. Highlights the most impressive features in order of impact
3. Uses emotional language that helps buyers envision living there
4. Emphasizes value and lifestyle benefits
5. Creates urgency and desire
6. Ends with a strong call-to-action

Structure the response as a JSON object with:
- "headline": Compelling headline (max 60 characters)
- "subheadline": Supporting subheadline (max 120 characters)  
- "main_pitch": Main sales pitch paragraph (150-200 words)
- "key_benefits": Array of 3-4 key selling points (each 10-15 words)
- "call_to_action": Strong closing call-to-action (max 50 words)

Focus on:
- Premium materials and finishes
- Modern amenities and updates
- Lifestyle and comfort benefits
- Investment value
- Unique or standout features

Make it persuasive but honest. Use power words like "luxurious," "stunning," "premium," "modern," "spacious," "elegant."

Return ONLY the JSON object. Example:
{{
  "headline": "Stunning Modern Home with Premium Finishes",
  "subheadline": "Experience luxury living with granite countertops, hardwood floors, and stainless appliances",
  "main_pitch": "Step into this beautifully appointed home where every detail has been carefully crafted for modern living. The gourmet kitchen features gleaming granite countertops and professional-grade stainless steel appliances, perfect for entertaining guests or preparing family meals. Rich hardwood flooring flows throughout the main living areas, creating a warm and inviting atmosphere. Natural light floods the space through updated windows, highlighting the elegant crown molding and architectural details that add character and charm. This home offers the perfect blend of style and functionality, with premium finishes that will impress even the most discerning buyers.",
  "key_benefits": [
    "Gourmet kitchen with granite countertops and stainless appliances",
    "Rich hardwood flooring throughout main living areas", 
    "Abundant natural light and updated windows",
    "Elegant architectural details and crown molding"
  ],
  "call_to_action": "Schedule your private showing today - this won't last long!"
}}"""
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 2000,
            }
        }
        
        # Call Gemini API
        api_url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
        
        response = requests.post(
            api_url,
            headers={'Content-Type': 'application/json'},
            json=request_body
        )
        
        if response.status_code != 200:
            print(f"Gemini API error: {response.text}")
            return jsonify({
                'error': 'Failed to generate sales pitch',
                'message': f'API request failed: {response.status_code}'
            }), 500
        
        data = response.json()
        
        # Extract the text response
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
            return jsonify({
                'error': 'Unexpected API response format',
                'message': str(e)
            }), 500
        
        # Parse the JSON response
        try:
            cleaned_response = text_response.replace('```json\n', '').replace('\n```', '').replace('```', '').strip()
            sales_pitch = json.loads(cleaned_response)
            
            # Validate required fields
            required_fields = ['headline', 'subheadline', 'main_pitch', 'key_benefits', 'call_to_action']
            for field in required_fields:
                if field not in sales_pitch:
                    raise ValueError(f"Missing required field: {field}")
                    
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Error parsing JSON: {e}")
            print(f"Raw response: {text_response}")
            return jsonify({
                'error': 'Failed to parse sales pitch response',
                'message': str(e)
            }), 500
        
        return jsonify({'sales_pitch': sales_pitch})
        
    except Exception as e:
        print(f"Error generating sales pitch: {str(e)}")
        return jsonify({
            'error': 'Failed to generate sales pitch',
            'message': str(e)
        }), 500

@app.route('/api/estimate-price', methods=['POST'])
def estimate_price():
    """Generate a price estimate based on notable features"""
    try:
        # Get the notable features from the request
        data = request.get_json()
        
        if not data or 'features' not in data:
            return jsonify({'error': 'No features provided'}), 400
        
        features = data['features']
        
        if not features or len(features) == 0:
            return jsonify({'error': 'No features to estimate price from'}), 400
        
        # Optional: Get location and property details for more accurate pricing
        location = data.get('location', '')
        property_type = data.get('property_type', 'home')
        square_footage = data.get('square_footage', '')
        bedrooms = data.get('bedrooms', '')
        bathrooms = data.get('bathrooms', '')
        
        # Prepare the request to Gemini API for price estimation
        request_body = {
            "contents": [{
                "parts": [
                    {
                        "text": f"""You are a professional real estate appraiser and pricing expert. Analyze the notable features and provide a comprehensive price estimate for this {property_type}.

Notable Features:
{json.dumps(features, indent=2)}

{f"Location: {location}" if location else ""}
{f"Square Footage: {square_footage}" if square_footage else ""}
{f"Bedrooms: {bedrooms}" if bedrooms else ""}
{f"Bathrooms: {bathrooms}" if bathrooms else ""}

Based on the features and any additional context provided, estimate the property value considering:

1. **Premium Materials**: Granite, marble, hardwood, stainless steel appliances, etc.
2. **Modern Updates**: Recent renovations, updated fixtures, modern finishes
3. **Architectural Features**: High ceilings, crown molding, built-ins, etc.
4. **Location Factors**: If location is provided, consider local market conditions
5. **Property Size**: If square footage is provided, factor in size
6. **Room Count**: If bedrooms/bathrooms provided, consider layout efficiency

Provide your response as a JSON object with:
- "estimated_price": The estimated price range (e.g., "$450,000 - $550,000")
- "price_breakdown": Array of 3-4 key factors that influenced the price
- "confidence_level": Confidence level as percentage (e.g., "75%")
- "market_notes": Brief explanation of market factors considered
- "feature_impact": How the notable features specifically affected the price

Be realistic and conservative in your estimates. Consider both the positive impact of premium features and any limitations from missing information.

Return ONLY the JSON object. Example:
{{
  "estimated_price": "$475,000 - $525,000",
  "price_breakdown": [
    "Premium kitchen upgrades add $25,000-35,000 value",
    "Hardwood flooring throughout increases value by $15,000-20,000",
    "Modern fixtures and lighting add $10,000-15,000",
    "Overall condition suggests well-maintained property"
  ],
  "confidence_level": "78%",
  "market_notes": "Based on typical market conditions for homes with these features",
  "feature_impact": "The granite countertops, stainless appliances, and hardwood flooring significantly enhance the property's value and market appeal"
}}"""
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 2000,
            }
        }
        
        # Call Gemini API
        api_url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
        
        response = requests.post(
            api_url,
            headers={'Content-Type': 'application/json'},
            json=request_body
        )
        
        if response.status_code != 200:
            print(f"Gemini API error: {response.text}")
            return jsonify({
                'error': 'Failed to estimate price',
                'message': f'API request failed: {response.status_code}'
            }), 500
        
        data = response.json()
        
        # Extract the text response
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
            return jsonify({
                'error': 'Unexpected API response format',
                'message': str(e)
            }), 500
        
        # Parse the JSON response
        try:
            cleaned_response = text_response.replace('```json\n', '').replace('\n```', '').replace('```', '').strip()
            price_estimate = json.loads(cleaned_response)
            
            # Validate required fields
            required_fields = ['estimated_price', 'price_breakdown', 'confidence_level', 'market_notes', 'feature_impact']
            for field in required_fields:
                if field not in price_estimate:
                    raise ValueError(f"Missing required field: {field}")
                    
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Error parsing JSON: {e}")
            print(f"Raw response: {text_response}")
            return jsonify({
                'error': 'Failed to parse price estimate response',
                'message': str(e)
            }), 500
        
        return jsonify({'price_estimate': price_estimate})
        
    except Exception as e:
        print(f"Error estimating price: {str(e)}")
        return jsonify({
            'error': 'Failed to estimate price',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    if not GEMINI_API_KEY:
        print("WARNING: GEMINI_API_KEY not found in environment variables!")
    app.run(debug=True, port=5000)