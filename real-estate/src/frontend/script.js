// Handle image upload preview
document.getElementById('imageUpload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const img = document.getElementById('propertyImage');
    
    if (file) {
        img.src = URL.createObjectURL(file);
        img.style.display = 'block';
    } else {
        img.style.display = 'none';
        img.src = '';
    }
});

// Analyze property function
function analyzeProperty() {
    const button = document.getElementById('analyzeButton');
    const loading = document.getElementById('loading');
    const outputDisplay = document.getElementById('outputDisplay');
    
    button.disabled = true;
    loading.style.display = 'block';
    outputDisplay.querySelector('p').style.display = 'none';
    
    // Simulate API call delay
    setTimeout(() => {
        loading.style.display = 'none';
        button.disabled = false;
        
        document.getElementById('jsonOutput').textContent = 
`{
  "property_analysis": {
    "style_assessment": "Modern Farmhouse / Scandinavian Blend",
    "condition_summary": "Recently updated, excellent, move-in ready condition.",
    "marketable_features": [
      {
        "feature_name": "Oversized Windows",
        "description": "Abundant natural light enhances the spacious feel."
      },
      {
        "feature_name": "Herringbone Wood Floors",
        "description": "High-end, durable flooring adds character and luxury."
      },
      {
        "feature_name": "Open Concept Layout",
        "description": "Seamless flow between kitchen, living, and dining areas."
      }
    ],
    "listing_description": "Stunningly bright, open-concept home featuring beautiful herringbone floors and designer lighting. Ready for immediate occupancy."
  }
}`;
    }, 3000);
}