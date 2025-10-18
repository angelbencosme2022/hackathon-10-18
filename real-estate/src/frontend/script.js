// State management
let selectedImage = null;
let analyzed = false;
let currentFeatures = [];

// DOM elements
const imageUpload = document.getElementById('imageUpload');
const uploadContent = document.getElementById('uploadContent');
const previewContent = document.getElementById('previewContent');
const previewImage = document.getElementById('previewImage');
const analyzeBtn = document.getElementById('analyzeBtn');
const analyzingBtn = document.getElementById('analyzingBtn');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const featuresList = document.getElementById('featuresList');

// Sales pitch elements
const salesPitchEmptyState = document.getElementById('salesPitchEmptyState');
const salesPitchLoadingState = document.getElementById('salesPitchLoadingState');
const salesPitchContent = document.getElementById('salesPitchContent');
const salesPitchResult = document.getElementById('salesPitchResult');

// Price estimate elements
const priceEstimateEmptyState = document.getElementById('priceEstimateEmptyState');
const priceEstimateLoadingState = document.getElementById('priceEstimateLoadingState');
const priceEstimateContent = document.getElementById('priceEstimateContent');
const priceEstimateResult = document.getElementById('priceEstimateResult');

// Event listeners
imageUpload.addEventListener('change', handleImageUpload);
analyzeBtn.addEventListener('click', analyzeImage);

// Handle image upload
function handleImageUpload(event) {
    const file = event.target.files[0];
    
    if (file) {
        selectedImage = file;
        const reader = new FileReader();
        
        reader.onloadend = function() {
            previewImage.src = reader.result;
            uploadContent.classList.add('hidden');
            previewContent.classList.remove('hidden');
            analyzeBtn.classList.remove('hidden');
        };
        
        reader.readAsDataURL(file);
        
        // Reset analyzed state
        analyzed = false;
        featuresList.classList.add('hidden');
        featuresList.innerHTML = '';
        emptyState.classList.remove('hidden');
    }
}

// Analyze image with backend API
async function analyzeImage() {
    // Show loading state
    analyzeBtn.classList.add('hidden');
    analyzingBtn.classList.remove('hidden');
    emptyState.classList.add('hidden');
    loadingState.classList.remove('hidden');
    
    try {
        // Create FormData to send the image
        const formData = new FormData();
        formData.append('image', selectedImage);
        
        // Send to backend API (Flask runs on port 5000)
        const response = await fetch('http://127.0.0.1:5000/api/analyze', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'API request failed');
        }
        
        const data = await response.json();
        
        // Add IDs to features
        const featuresWithIds = data.features.map((item, index) => ({
            id: index + 1,
            ...item
        }));
        
        // Store features for sales pitch generation
        currentFeatures = data.features;
        
        displayFeatures(featuresWithIds);
        
    } catch (error) {
        console.error('Error analyzing image:', error);
        
        // Show error message to user
        analyzingBtn.classList.add('hidden');
        analyzeBtn.classList.remove('hidden');
        loadingState.classList.add('hidden');
        emptyState.classList.remove('hidden');
        
        alert('Failed to analyze image. Please make sure the server is running.\n\nError: ' + error.message);
    }
}

// Helper function no longer needed with backend
// Removed fileToBase64 function

// Display features
function displayFeatures(features) {
    analyzingBtn.classList.add('hidden');
    loadingState.classList.add('hidden');
    featuresList.classList.remove('hidden');
    analyzed = true;
    
    // Clear previous features
    featuresList.innerHTML = '';
    
    // Add features to the list
    features.forEach(item => {
        const featureItem = createFeatureItem(item);
        featuresList.appendChild(featureItem);
    });
    
    // Add "Analyze Another Photo" button outside the grid
    const resetButton = document.createElement('button');
    resetButton.className = 'btn btn-secondary';
    resetButton.textContent = 'Analyze Another Photo';
    resetButton.addEventListener('click', resetAnalyzer);
    resetButton.style.marginTop = '1.5rem';
    resetButton.style.width = '100%';
    featuresList.parentNode.appendChild(resetButton);
    
    // Show sales pitch loading and generate automatically
    salesPitchEmptyState.classList.add('hidden');
    salesPitchContent.classList.remove('hidden');
    salesPitchLoadingState.classList.remove('hidden');
    
    // Show price estimate loading and generate automatically
    priceEstimateEmptyState.classList.add('hidden');
    priceEstimateContent.classList.remove('hidden');
    priceEstimateLoadingState.classList.remove('hidden');
    
    // Automatically generate sales pitch and price estimate
    generateSalesPitch();
    generatePriceEstimate();
}

// Create feature item element
function createFeatureItem(item) {
    const div = document.createElement('div');
    div.className = 'feature-item';
    
    div.innerHTML = `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <div class="feature-content">
            <p class="feature-name">${item.feature}</p>
            <p class="feature-category">${item.category}</p>
        </div>
    `;
    
    return div;
}

// Generate sales pitch
async function generateSalesPitch() {
    if (!currentFeatures || currentFeatures.length === 0) {
        return;
    }
    
    try {
        const requestData = {
            features: currentFeatures,
            property_type: 'home',
            price_range: ''
        };
        
        const response = await fetch('http://127.0.0.1:5000/api/generate-sales-pitch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'API request failed');
        }
        
        const data = await response.json();
        displaySalesPitch(data.sales_pitch);
        
    } catch (error) {
        console.error('Error generating sales pitch:', error);
        
        // Show error message to user
        salesPitchLoadingState.classList.add('hidden');
        salesPitchEmptyState.classList.remove('hidden');
        
        alert('Failed to generate sales pitch. Please try again.\n\nError: ' + error.message);
    }
}

// Generate price estimate
async function generatePriceEstimate() {
    if (!currentFeatures || currentFeatures.length === 0) {
        return;
    }
    
    try {
        const requestData = {
            features: currentFeatures,
            property_type: 'home',
            location: '',
            square_footage: '',
            bedrooms: '',
            bathrooms: ''
        };
        
        const response = await fetch('http://127.0.0.1:5000/api/estimate-price', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'API request failed');
        }
        
        const data = await response.json();
        displayPriceEstimate(data.price_estimate);
        
    } catch (error) {
        console.error('Error generating price estimate:', error);
        
        // Show error message to user
        priceEstimateLoadingState.classList.add('hidden');
        priceEstimateEmptyState.classList.remove('hidden');
        
        alert('Failed to generate price estimate. Please try again.\n\nError: ' + error.message);
    }
}

// Display sales pitch result
function displaySalesPitch(salesPitch) {
    salesPitchLoadingState.classList.add('hidden');
    salesPitchResult.classList.remove('hidden');
    
    salesPitchResult.innerHTML = `
        <div class="sales-pitch-display">
            <div class="pitch-header">
                <h3 class="pitch-headline">${salesPitch.headline}</h3>
                <p class="pitch-subheadline">${salesPitch.subheadline}</p>
            </div>
            
            <div class="pitch-main">
                <p class="pitch-description">${salesPitch.main_pitch}</p>
            </div>
            
            <div class="pitch-benefits">
                <h4>Key Benefits:</h4>
                <ul>
                    ${salesPitch.key_benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                </ul>
            </div>
            
            <div class="pitch-cta">
                <p class="cta-text">${salesPitch.call_to_action}</p>
            </div>
            
            <div class="pitch-actions">
                <button class="btn btn-secondary" onclick="copyToClipboard()">
                    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                    Copy to Clipboard
                </button>
                <button class="btn btn-primary" onclick="generateNewPitch()">
                    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    Generate New Pitch
                </button>
            </div>
        </div>
    `;
}

// Display price estimate result
function displayPriceEstimate(priceEstimate) {
    priceEstimateLoadingState.classList.add('hidden');
    priceEstimateResult.classList.remove('hidden');
    
    priceEstimateResult.innerHTML = `
        <div class="price-estimate-display">
            <div class="price-header">
                <h3 class="price-range">${priceEstimate.estimated_price}</h3>
                <p class="confidence-level">Confidence: ${priceEstimate.confidence_level}</p>
            </div>
            
            <div class="price-breakdown">
                <h4>Price Breakdown:</h4>
                <ul>
                    ${priceEstimate.price_breakdown.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
            
            <div class="market-notes">
                <h4>Market Analysis:</h4>
                <p>${priceEstimate.market_notes}</p>
            </div>
            
            <div class="feature-impact">
                <h4>Feature Impact:</h4>
                <p>${priceEstimate.feature_impact}</p>
            </div>
            
            <div class="price-actions">
                <button class="btn btn-secondary" onclick="copyPriceToClipboard()">
                    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                    Copy Estimate
                </button>
                <button class="btn btn-primary" onclick="generateNewPriceEstimate()">
                    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    New Estimate
                </button>
            </div>
        </div>
    `;
}

// Copy sales pitch to clipboard
function copyToClipboard() {
    const pitchElement = document.querySelector('.sales-pitch-display');
    const text = pitchElement.innerText;
    
    navigator.clipboard.writeText(text).then(() => {
        alert('Sales pitch copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Failed to copy to clipboard. Please try again.');
    });
}

// Generate new sales pitch
function generateNewPitch() {
    salesPitchResult.classList.add('hidden');
    salesPitchLoadingState.classList.remove('hidden');
    generateSalesPitch();
}

// Copy price estimate to clipboard
function copyPriceToClipboard() {
    const priceElement = document.querySelector('.price-estimate-display');
    const text = priceElement.innerText;
    
    navigator.clipboard.writeText(text).then(() => {
        alert('Price estimate copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Failed to copy to clipboard. Please try again.');
    });
}

// Generate new price estimate
function generateNewPriceEstimate() {
    priceEstimateResult.classList.add('hidden');
    priceEstimateLoadingState.classList.remove('hidden');
    generatePriceEstimate();
}

// Reset analyzer
function resetAnalyzer() {
    analyzed = false;
    selectedImage = null;
    currentFeatures = [];
    imageUpload.value = '';
    
    // Reset UI
    previewContent.classList.add('hidden');
    uploadContent.classList.remove('hidden');
    analyzeBtn.classList.add('hidden');
    analyzingBtn.classList.add('hidden');
    featuresList.classList.add('hidden');
    featuresList.innerHTML = '';
    
    // Remove any existing reset button
    const existingResetButton = featuresList.parentNode.querySelector('.btn-secondary');
    if (existingResetButton && existingResetButton.textContent === 'Analyze Another Photo') {
        existingResetButton.remove();
    }
    
    emptyState.classList.remove('hidden');
    loadingState.classList.add('hidden');
    
    // Reset sales pitch UI
    salesPitchEmptyState.classList.remove('hidden');
    salesPitchContent.classList.add('hidden');
    salesPitchResult.classList.add('hidden');
    salesPitchLoadingState.classList.add('hidden');
    
    // Reset price estimate UI
    priceEstimateEmptyState.classList.remove('hidden');
    priceEstimateContent.classList.add('hidden');
    priceEstimateResult.classList.add('hidden');
    priceEstimateLoadingState.classList.add('hidden');
}