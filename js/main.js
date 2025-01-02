import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";

// SCENE SETUP
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const container = document.getElementById('container3D');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// LIGHTING
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
scene.fog = new THREE.Fog(0xa0a0a0, 20, 100);

const topLight = new THREE.DirectionalLight(0xffffff, 1.5);
topLight.position.set(500, 500, 500);
topLight.castShadow = true;
topLight.shadow.mapSize.width = 4096;
topLight.shadow.mapSize.height = 4096;
const d = 1000;
topLight.shadow.camera.left = -d;
topLight.shadow.camera.right = d;
topLight.shadow.camera.top = d;
topLight.shadow.camera.bottom = -d;
topLight.shadow.camera.near = 0.5;
topLight.shadow.camera.far = 1000;
topLight.shadow.bias = -0.005;
scene.add(topLight);

const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
scene.add(hemisphereLight);

const secondaryLight = new THREE.DirectionalLight(0xffffff, 0.8);
secondaryLight.position.set(-500, 300, -500);
secondaryLight.castShadow = true;
secondaryLight.shadow.mapSize.width = 2048;
secondaryLight.shadow.mapSize.height = 2048;
secondaryLight.shadow.bias = -0.005;
scene.add(secondaryLight);

// POPUP SETUP
const popup = document.createElement('div');
popup.className = 'object-popup';
popup.style.position = 'fixed';
popup.style.backgroundColor = 'white';
popup.style.padding = '15px';
popup.style.border = '1px solid #ccc';
popup.style.borderRadius = '8px';
popup.style.display = 'none';
popup.style.zIndex = '1000';
popup.style.maxWidth = '80vw';
popup.style.fontSize = '16px';
document.body.appendChild(popup);

// OBJECT DATA
const objectData = new Map();

function addObjectData(name, data) {
    console.log(`Adding data for object: ${name}`, data);
    objectData.set(name, {
        date: data.date || "Not specified",
        vendor: data.vendor || "Not specified",
        mandor: data.mandor || "Not specified",
        zone: data.zone || "Not specified",
        workers: data.workers || "Not specified"
    });
}

// MODEL LOADING
const loader = new GLTFLoader();
loader.load(
    './models/REVIT KANDAU/KANDAU.gltf',
    (gltf) => {
        const model = gltf.scene;
        
        // Initial data for objects
        const initialData = {
            object_1: {
                date: "2024-01-15",
                vendor: "PT. ABC",
                mandor: "Pak Ahmad",
                zone: "Zone A",
                workers: 25
            }
        };

        model.traverse((child) => {
            if (child.isMesh) {
                const objName = child.name || `object_${Math.random().toString(36).substr(2, 9)}`;
                child.name = objName;
                
                addObjectData(objName, initialData[objName] || {
                    date: "2024-01-15",
                    vendor: "Default Vendor",
                    mandor: "Default Mandor",
                    zone: "Default Zone",
                    workers: 0
                });

                if (child.material) {
                    child.material.roughness = 0.7;
                    child.material.metalness = 0.1;
                    originalMaterials.set(child.uuid, child.material.clone());
                }
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        model.castShadow = true;
        model.receiveShadow = true;
        model.scale.set(1.0, 1.0, 1.0);
        scene.add(model);

        // Camera setup
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        const cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 0.3;
        camera.position.set(center.x, center.y, cameraZ);
        camera.lookAt(center);
        camera.updateProjectionMatrix();
    },
    undefined,
    console.error
);

// SELECTION AND MATERIALS
let selectedObject = null;
const originalMaterials = new Map();
const highlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.8
});

// RAYCASTER SETUP
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function getMousePosition(event, domElement) {
    const rect = domElement.getBoundingClientRect();
    return {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1
    };
}

function createCloseButton() {
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.innerHTML = '×';
    closeButton.style.fontSize = '24px';
    closeButton.style.padding = '10px 15px';
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.style.display = 'none';
        selectObject(null, true);
    });
    return closeButton;
}

function selectObject(object, forceSelection = false) {
    if (popup.style.display === 'block' && !forceSelection) {
        return;
    }

    if (selectedObject && selectedObject !== object) {
        selectedObject.material = originalMaterials.get(selectedObject.uuid).clone();
    }
    
    if (object) {
        selectedObject = object;
        object.material = highlightMaterial.clone();
        document.body.style.cursor = 'pointer';
    } else {
        selectedObject = null;
        document.body.style.cursor = 'auto';
    }
}

// TOUCH CONTROL VARIABLES
let touchStartX = 0;
let touchStartY = 0;
let touchPrevX = 0;
let touchPrevY = 0;
let isDragging = false;
let isPinching = false;
let isMoving = false;
let initialPinchDistance = 0;
let prevTouchDistance = 0;
let prevTouchCenter = { x: 0, y: 0 };

// Get center point of two touches
function getTouchCenter(touch1, touch2) {
    return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
    };
}

// Get distance between two touches
function getTouchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// Enhanced touch event handlers
container.addEventListener('touchstart', (event) => {
    event.preventDefault();
    
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        
        // Setup single finger orbit
        isDragging = true;
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchPrevX = touchStartX;
        touchPrevY = touchStartY;
    } 
    else if (event.touches.length === 2) {
        // Initialize two-finger gesture
        isDragging = false;
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        // Set initial values for pinch-zoom
        initialPinchDistance = getTouchDistance(touch1, touch2);
        prevTouchDistance = initialPinchDistance;
        
        // Set initial values for two-finger pan
        prevTouchCenter = getTouchCenter(touch1, touch2);
        
        // Determine if we're pinching or moving based on finger orientation
        const touchAngle = Math.abs(Math.atan2(
            touch2.clientY - touch1.clientY,
            touch2.clientX - touch1.clientX
        ));
        
        // If fingers are roughly horizontal, treat as movement
        isMoving = touchAngle < Math.PI / 4 || touchAngle > (3 * Math.PI) / 4;
        isPinching = !isMoving;
    }
}, { passive: false });

container.addEventListener('touchmove', (event) => {
    event.preventDefault();
    
    if (isDragging && event.touches.length === 1) {
        // Handle orbit rotation
        const touchX = event.touches[0].clientX;
        const touchY = event.touches[0].clientY;
        
        const deltaX = (touchX - touchPrevX) * 0.005;
        const deltaY = (touchY - touchPrevY) * 0.005;
        
        yaw -= deltaX;
        pitch -= deltaY;
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
        
        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
        camera.quaternion.copy(quaternion);
        
        touchPrevX = touchX;
        touchPrevY = touchY;
    }
    else if (event.touches.length === 2) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const currentTouchCenter = getTouchCenter(touch1, touch2);
        
        if (isPinching) {
            // Handle pinch zoom
            const currentDistance = getTouchDistance(touch1, touch2);
            const pinchDelta = (currentDistance - prevTouchDistance) * 0.05;
            
            const direction = new THREE.Vector3();
            camera.getWorldDirection(direction);
            camera.position.addScaledVector(direction, pinchDelta);
            
            prevTouchDistance = currentDistance;
        }
        else if (isMoving) {
            // Handle two-finger pan movement
            const deltaX = currentTouchCenter.x - prevTouchCenter.x;
            const deltaY = currentTouchCenter.y - prevTouchCenter.y;
            
            const right = new THREE.Vector3();
            const direction = new THREE.Vector3();
            camera.getWorldDirection(direction);
            right.crossVectors(camera.up, direction).normalize();
            
            camera.position.addScaledVector(right, -deltaX * 0.01);
            camera.position.y += deltaY * 0.01;
        }
        
        prevTouchCenter = currentTouchCenter;
    }
}, { passive: false });

container.addEventListener('touchend', () => {
    isDragging = false;
    isPinching = false;
    isMoving = false;
});

container.addEventListener('touchcancel', () => {
    isDragging = false;
    isPinching = false;
    isMoving = false;
});

// Mouse event handlers
document.addEventListener('click', (event) => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastClick;
    
    if (timeDiff < DOUBLE_CLICK_DELAY) {
        handleSelection(event, false);
    }
    lastClick = currentTime;
});

// Hover effect only for desktop
document.addEventListener('mousemove', (event) => {
    if (event.target.closest('.object-popup') || isPinching || isDragging) {
        return;
    }

    if (!isMousePressed && popup.style.display !== 'block') {
        const mousePos = getMousePosition(event, renderer.domElement);
        mouse.x = mousePos.x;
        mouse.y = mousePos.y;
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true)
            .filter(intersect => intersect.object.isMesh);
        
        if (intersects.length > 0) {
            const hoveredObject = intersects[0].object;
            if (hoveredObject !== selectedObject) {
                selectObject(hoveredObject);
            }
        } else {
            selectObject(null);
        }
    }
});

// MOUSE EVENTS
document.addEventListener('mousemove', (event) => {
    if (event.target.closest('.object-popup')) {
        return;
    }

    if (!isMousePressed && popup.style.display !== 'block') {
        const mousePos = getMousePosition(event, renderer.domElement);
        mouse.x = mousePos.x;
        mouse.y = mousePos.y;
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true)
            .filter(intersect => intersect.object.isMesh);
        
        if (intersects.length > 0) {
            const hoveredObject = intersects[0].object;
            if (hoveredObject !== selectedObject) {
                selectObject(hoveredObject);
            }
        } else {
            selectObject(null);
        }
    }
});

// OBJECT SELECTION
function handleSelection(event, isTouch = false) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Handle mouse position
    if (!isTouch) {  // Ini akan tetap memproses click di desktop
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
            const selectedObject = intersects[0].object;
            const objectName = selectedObject.name;
            
            if (objectData.has(objectName)) {
                const data = objectData.get(objectName);
                showPopup(event.clientX, event.clientY, data);
            }
        } else {
            hidePopup();
        }
    }
}

// Event listener untuk click di desktop tetap ada
document.addEventListener('click', (event) => handleSelection(event, false));


// NAVIGATION CONTROLS
let moveForward = false,
    moveBackward = false,
    moveLeft = false,
    moveRight = false,
    moveUp = false,
    moveDown = false;
let movementSpeed = 0.2;
const rotationSpeed = 0.005;
let pitch = 0,
    yaw = 0;

let isMousePressed = false;
let mouseDeltaX = 0,
    mouseDeltaY = 0;

// Prevent right click menu
window.addEventListener('contextmenu', (event) => event.preventDefault());

// Mouse controls for rotation
window.addEventListener('mousedown', (event) => {
    if (event.button === 2) {
        event.preventDefault();
        isMousePressed = true;
    }
});

window.addEventListener('mouseup', (event) => {
    if (event.button === 2) {
        isMousePressed = false;
    }
});

window.addEventListener('mousemove', (event) => {
    if (isMousePressed) {
        mouseDeltaX = event.movementX * rotationSpeed;
        mouseDeltaY = event.movementY * rotationSpeed;

        yaw -= mouseDeltaX;
        pitch -= mouseDeltaY;
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
        camera.quaternion.copy(quaternion);
    }
});

// Keyboard controls
window.addEventListener('keydown', (event) => {
    if (event.shiftKey && event.code === 'Space') {
        movementSpeed = 1.2;
    } else if (event.shiftKey) {
        movementSpeed = 0.4;
    } else if (event.altKey) {
        movementSpeed = 0.1;
    } else {
        movementSpeed = 0.2;
    }
    
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'KeyQ': moveUp = true; break;
        case 'KeyE': moveDown = true; break;
    }
});

window.addEventListener('keyup', (event) => {
    movementSpeed = 0.2;
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
        case 'KeyQ': moveUp = false; break;
        case 'KeyE': moveDown = false; break;
    }
});

// ANIMATION LOOP
function animate() {
    requestAnimationFrame(animate);

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    if (moveForward) camera.position.addScaledVector(direction, movementSpeed);
    if (moveBackward) camera.position.addScaledVector(direction, -movementSpeed);

    const right = new THREE.Vector3();
    right.crossVectors(camera.up, direction).normalize();
    
    // Pergerakan kiri-kanan yang sudah dikoreksi
    if (moveLeft) camera.position.addScaledVector(right, movementSpeed);    // Bergerak ke kiri
    if (moveRight) camera.position.addScaledVector(right, -movementSpeed);  // Bergerak ke kanan
    
    if (moveUp) camera.position.y += movementSpeed;
    if (moveDown) camera.position.y -= movementSpeed;

    renderer.render(scene, camera);
}

// Window resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Popup functions
function showPopup(x, y, data) {
    popup.innerHTML = `
        <button class="close-button">×</button>
        <div class="popup-content">
            <p><strong>Date:</strong> ${data.date}</p>
            <p><strong>Vendor:</strong> ${data.vendor}</p>
            <p><strong>Mandor:</strong> ${data.mandor}</p>
            <p><strong>Zone:</strong> ${data.zone}</p>
            <p><strong>Workers:</strong> ${data.workers}</p>
        </div>
    `;
    
    popup.style.left = `${x + 10}px`;
    popup.style.top = `${y + 10}px`;
    popup.style.display = 'block';

    const closeButton = popup.querySelector('.close-button');
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        hidePopup();
    });
}

function hidePopup() {
    popup.style.display = 'none';
    if (selectedObject) {
        selectObject(null, true);
    }
}

// Start animation
animate();

