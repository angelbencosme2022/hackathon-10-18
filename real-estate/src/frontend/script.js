// State management
let selectedImage = null;
let analyzed = false;

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

// Analyze image
async function analyzeImage() {
    // Show loading state
    analyzeBtn.classList.add('hidden');
    analyzingBtn.classList.remove('hidden');
    emptyState.classList.add('hidden');
    loadingState.classList.remove('hidden');
    
    // Simulate API call - Replace this with your actual API call
    setTimeout(() => {
        const mockFeatures = [
            { id: 1, feature: 'Hardwood Flooring', category: 'Interior' },
            { id: 2, feature: 'Modern Kitchen Appliances', category: 'Kitchen' },
            { id: 3, feature: 'High Ceilings', category: 'Interior' },
            { id: 4, feature: 'Natural Lighting', category: 'Windows' },
            { id: 5, feature: 'Updated Fixtures', category: 'Interior' }
        ];
        
        displayFeatures(mockFeatures);
    }, 2000);
    
    /* 
    // Actual API call example:
    try {
        const formData = new FormData();
        formData.append('image', selectedImage);
        
        const response = await fetch('YOUR_API_ENDPOINT', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        displayFeatures(data.features);
    } catch (error) {
        console.error('Error analyzing image:', error);
        // Show error message to user
        analyzingBtn.classList.add('hidden');
        analyzeBtn.classList.remove('hidden');
        loadingState.classList.add('hidden');
        emptyState.classList.remove('hidden');
        alert('Failed to analyze image. Please try again.');
    }
    */
}

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
    
    // Add "Analyze Another Photo" button
    const resetButton = document.createElement('button');
    resetButton.className = 'btn btn-secondary';
    resetButton.textContent = 'Analyze Another Photo';
    resetButton.addEventListener('click', resetAnalyzer);
    featuresList.appendChild(resetButton);
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

// Reset analyzer
function resetAnalyzer() {
    analyzed = false;
    selectedImage = null;
    imageUpload.value = '';
    
    // Reset UI
    previewContent.classList.add('hidden');
    uploadContent.classList.remove('hidden');
    analyzeBtn.classList.add('hidden');
    analyzingBtn.classList.add('hidden');
    featuresList.classList.add('hidden');
    featuresList.innerHTML = '';
    emptyState.classList.remove('hidden');
    loadingState.classList.add('hidden');
}