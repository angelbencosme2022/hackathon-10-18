// State management
let photos = [];
let currentPhotoIndex = 0;
let currentMode = 'view';
let pendingHotspot = null;

// DOM elements
const photoUpload = document.getElementById('photoUpload');
const photoList = document.getElementById('photoList');
const viewerContainer = document.getElementById('viewerContainer');
const viewerNav = document.getElementById('viewerNav');
const viewerTitle = document.getElementById('viewerTitle');
const viewerCounter = document.getElementById('viewerCounter');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const modeToggle = document.getElementById('modeToggle');
const hotspotForm = document.getElementById('hotspotForm');
const hotspotName = document.getElementById('hotspotName');
const hotspotDesc = document.getElementById('hotspotDesc');
const saveHotspotBtn = document.getElementById('saveHotspotBtn');
const createTourBtn = document.getElementById('createTourBtn');
const shareModal = document.getElementById('shareModal');
const shareLink = document.getElementById('shareLink');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

// Event listeners
photoUpload.addEventListener('change', handlePhotoUpload);
prevBtn.addEventListener('click', () => navigatePhoto(-1));
nextBtn.addEventListener('click', () => navigatePhoto(1));
saveHotspotBtn.addEventListener('click', saveHotspot);
createTourBtn.addEventListener('click', generateShareLink);
copyLinkBtn.addEventListener('click', copyShareLink);
closeModalBtn.addEventListener('click', () => shareModal.classList.add('hidden'));
shareModal.addEventListener('click', (e) => {
    if (e.target === shareModal) shareModal.classList.add('hidden');
});

// Mode toggle
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        updateModeUI();
    });
});

// Add AI analyze button to mode toggle
window.addEventListener('DOMContentLoaded', () => {
    const aiAnalyzeBtn = document.createElement('button');
    aiAnalyzeBtn.className = 'mode-btn';
    aiAnalyzeBtn.innerHTML = `
        <svg class="icon" style="display: inline; margin-right: 0.25rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
        </svg>
        AI Detect
    `;
    aiAnalyzeBtn.addEventListener('click', analyzePhotoWithAI);
    modeToggle.appendChild(aiAnalyzeBtn);
});

// Handle photo upload
function handlePhotoUpload(event) {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const photo = {
                    id: Date.now() + Math.random(),
                    name: file.name,
                    src: e.target.result,
                    hotspots: []
                };
                
                photos.push(photo);
                updatePhotoList();
                updateViewer();
                
                // Show the first photo if this is the first upload
                if (photos.length === 1) {
                    currentPhotoIndex = 0;
                    showPhoto(0);
                }
                
                // Enable create tour button if we have photos
                createTourBtn.disabled = photos.length === 0;
            };
            
            reader.readAsDataURL(file);
        }
    });
}

// Update photo list in sidebar
function updatePhotoList() {
    if (photos.length === 0) {
        photoList.classList.add('hidden');
        return;
    }
    
    photoList.classList.remove('hidden');
    photoList.innerHTML = '';
    
    photos.forEach((photo, index) => {
        const item = document.createElement('div');
        item.className = `photo-item ${index === currentPhotoIndex ? 'active' : ''}`;
        item.addEventListener('click', () => showPhoto(index));
        
        item.innerHTML = `
            <img src="${photo.src}" alt="${photo.name}" class="photo-thumbnail">
            <div class="photo-info">
                <div class="photo-name">${photo.name}</div>
                <div class="photo-details">${photo.hotspots.length} hotspot${photo.hotspots.length !== 1 ? 's' : ''}</div>
            </div>
            <button class="delete-btn" onclick="deletePhoto(event, ${index})">
                <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        `;
        
        photoList.appendChild(item);
    });
}

// Delete photo
function deletePhoto(event, index) {
    event.stopPropagation();
    photos.splice(index, 1);
    
    if (currentPhotoIndex >= photos.length) {
        currentPhotoIndex = Math.max(0, photos.length - 1);
    }
    
    updatePhotoList();
    
    if (photos.length === 0) {
        viewerContainer.innerHTML = `
            <div class="empty-viewer">
                <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <p>Upload photos to start creating your virtual tour</p>
            </div>
        `;
        viewerNav.style.display = 'none';
        modeToggle.style.display = 'none';
        createTourBtn.disabled = true;
    } else {
        showPhoto(currentPhotoIndex);
    }
}

// Show specific photo
function showPhoto(index) {
    currentPhotoIndex = index;
    updateViewer();
    updatePhotoList();
}

// Update viewer
function updateViewer() {
    if (photos.length === 0) return;
    
    const photo = photos[currentPhotoIndex];
    
    viewerContainer.innerHTML = `
        <img src="${photo.src}" alt="${photo.name}" class="viewer-image" id="viewerImage">
    `;
    
    // Add existing hotspots
    photo.hotspots.forEach(hotspot => {
        addHotspotToViewer(hotspot);
    });
    
    // Add click listener for edit mode
    const viewerImage = document.getElementById('viewerImage');
    viewerImage.addEventListener('click', handleViewerClick);
    
    // Update navigation
    viewerNav.style.display = 'flex';
    modeToggle.style.display = 'flex';
    viewerTitle.textContent = photo.name.replace(/\.[^/.]+$/, '');
    viewerCounter.textContent = `${currentPhotoIndex + 1} / ${photos.length}`;
    
    prevBtn.disabled = currentPhotoIndex === 0;
    nextBtn.disabled = currentPhotoIndex === photos.length - 1;
}

// Handle viewer click (for adding hotspots)
function handleViewerClick(event) {
    if (currentMode !== 'edit') return;
    
    const rect = event.target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    // Store pending hotspot position
    pendingHotspot = { x, y };
    
    // Show form
    hotspotForm.classList.remove('hidden');
    hotspotName.value = '';
    hotspotDesc.value = '';
    hotspotName.focus();
    
    // Add temporary hotspot marker
    const tempMarker = document.createElement('div');
    tempMarker.className = 'hotspot';
    tempMarker.id = 'tempHotspot';
    tempMarker.style.left = `${x}%`;
    tempMarker.style.top = `${y}%`;
    viewerContainer.appendChild(tempMarker);
}

// Save hotspot
function saveHotspot() {
    if (!pendingHotspot || !hotspotName.value.trim()) return;
    
    const hotspot = {
        id: Date.now() + Math.random(),
        x: pendingHotspot.x,
        y: pendingHotspot.y,
        name: hotspotName.value.trim(),
        description: hotspotDesc.value.trim()
    };
    
    photos[currentPhotoIndex].hotspots.push(hotspot);
    
    // Remove temp marker
    const tempMarker = document.getElementById('tempHotspot');
    if (tempMarker) tempMarker.remove();
    
    // Add real hotspot
    addHotspotToViewer(hotspot);
    
    // Reset form
    hotspotForm.classList.add('hidden');
    pendingHotspot = null;
    
    // Update photo list to show hotspot count
    updatePhotoList();
}

// Add hotspot to viewer
function addHotspotToViewer(hotspot) {
    const hotspotEl = document.createElement('div');
    hotspotEl.className = 'hotspot';
    hotspotEl.style.left = `${hotspot.x}%`;
    hotspotEl.style.top = `${hotspot.y}%`;
    hotspotEl.dataset.hotspotId = hotspot.id;
    
    const label = document.createElement('div');
    label.className = 'hotspot-label';
    label.textContent = hotspot.name;
    if (hotspot.description) {
        label.innerHTML = `
            <strong>${hotspot.name}</strong><br>
            <span style="font-weight: normal; font-size: 0.85em;">${hotspot.description}</span>
        `;
    }
    hotspotEl.appendChild(label);
    
    // Add delete functionality - right-click to delete
    hotspotEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (confirm(`Delete hotspot "${hotspot.name}"?`)) {
            deleteHotspot(hotspot.id);
        }
    });
    
    viewerContainer.appendChild(hotspotEl);
}

// Delete hotspot
function deleteHotspot(hotspotId) {
    const photo = photos[currentPhotoIndex];
    photo.hotspots = photo.hotspots.filter(h => h.id !== hotspotId);
    updateViewer();
    updatePhotoList();
}

// Navigate photos
function navigatePhoto(direction) {
    const newIndex = currentPhotoIndex + direction;
    if (newIndex >= 0 && newIndex < photos.length) {
        showPhoto(newIndex);
    }
}

// Update mode UI
function updateModeUI() {
    if (currentMode === 'edit') {
        viewerContainer.style.cursor = 'crosshair';
    } else {
        hotspotForm.classList.add('hidden');
        viewerContainer.style.cursor = 'default';
        
        // Remove temp hotspot if exists
        const tempMarker = document.getElementById('tempHotspot');
        if (tempMarker) tempMarker.remove();
        pendingHotspot = null;
    }
}

// Generate share link
function generateShareLink() {
    // Create tour data
    const tourData = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        createdAt: new Date().toISOString(),
        photos: photos.map(photo => ({
            name: photo.name,
            src: photo.src,
            hotspots: photo.hotspots
        }))
    };
    
    // Store in browser storage
    const existingTours = JSON.parse(localStorage.getItem('virtualTours') || '{}');
    existingTours[tourData.id] = tourData;
    localStorage.setItem('virtualTours', JSON.stringify(existingTours));
    
    // Generate share URL
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '').replace('tour-creator.html', '');
    const shareUrl = `${baseUrl}view-tour.html?tour=${tourData.id}`;
    
    // Show modal
    shareLink.value = shareUrl;
    shareModal.classList.remove('hidden');
}

// Copy share link
function copyShareLink() {
    shareLink.select();
    document.execCommand('copy');
    
    copyLinkBtn.textContent = 'Copied!';
    copyLinkBtn.classList.add('copied');
    
    setTimeout(() => {
        copyLinkBtn.textContent = 'Copy';
        copyLinkBtn.classList.remove('copied');
    }, 2000);
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (photos.length === 0) return;
    
    if (e.key === 'ArrowLeft' && currentPhotoIndex > 0) {
        navigatePhoto(-1);
    } else if (e.key === 'ArrowRight' && currentPhotoIndex < photos.length - 1) {
        navigatePhoto(1);
    } else if (e.key === 'Escape' && currentMode === 'edit') {
        hotspotForm.classList.add('hidden');
        const tempMarker = document.getElementById('tempHotspot');
        if (tempMarker) tempMarker.remove();
        pendingHotspot = null;
    }
});

// ============================================
// AI-POWERED HOTSPOT DETECTION
// ============================================

async function analyzePhotoWithAI() {
    if (photos.length === 0 || !photos[currentPhotoIndex]) return;
    
    const currentPhoto = photos[currentPhotoIndex];
    
    // Show loading state
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'aiLoadingOverlay';
    loadingOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        z-index: 100;
        border-radius: 1rem;
    `;
    loadingOverlay.innerHTML = `
        <svg style="width: 3rem; height: 3rem; color: #667eea; animation: spin 1s linear infinite;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
        </svg>
        <p style="color: white; font-weight: 600;">AI analyzing photo...</p>
        <p style="color: rgba(255,255,255,0.7); font-size: 0.9rem;">Detecting key features</p>
    `;
    viewerContainer.appendChild(loadingOverlay);
    
    try {
        // Convert base64 to blob
        const response = await fetch(currentPhoto.src);
        const blob = await response.blob();
        
        // Create FormData
        const formData = new FormData();
        formData.append('image', blob, currentPhoto.name);
        
        // Call API
        const apiResponse = await fetch('http://127.0.0.1:5000/api/analyze-tour-photo', {
            method: 'POST',
            body: formData
        });
        
        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            throw new Error(errorData.message || 'AI analysis failed');
        }
        
        const data = await apiResponse.json();
        
        // Add detected hotspots
        if (data.hotspots && data.hotspots.length > 0) {
            data.hotspots.forEach(detectedHotspot => {
                const hotspot = {
                    id: Date.now() + Math.random(),
                    x: detectedHotspot.x,
                    y: detectedHotspot.y,
                    name: detectedHotspot.name,
                    description: detectedHotspot.description || ''
                };
                
                currentPhoto.hotspots.push(hotspot);
            });
            
            // Update viewer to show new hotspots
            updateViewer();
            updatePhotoList();
            
            // Show success message
            showNotification(`✨ AI detected ${data.hotspots.length} feature${data.hotspots.length !== 1 ? 's' : ''}!`, 'success');
        } else {
            showNotification('No features detected. Try a different photo or add hotspots manually.', 'info');
        }
        
    } catch (error) {
        console.error('AI analysis error:', error);
        showNotification('AI analysis failed. Make sure the server is running on port 5000.', 'error');
    } finally {
        // Remove loading overlay
        const overlay = document.getElementById('aiLoadingOverlay');
        if (overlay) overlay.remove();
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#667eea'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.75rem;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}