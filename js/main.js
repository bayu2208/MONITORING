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
popup.style.padding = '10px';
popup.style.border = '1px solid #ccc';
popup.style.borderRadius = '5px';
popup.style.display = 'none';
popup.style.zIndex = '1000';
document.body.appendChild(popup);

// OBJECT DATA
const objectData = new Map();

function addObjectData(name, data) {
  console.log(`Adding data for object: ${name}`, data); // Debug log
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
          // Add more object data as needed
      };

        model.traverse((child) => {
          if (child.isMesh) {
              // Ensure each mesh has a unique name
              const objName = child.name || `object_${Math.random().toString(36).substr(2, 9)}`;
              child.name = objName;
              console.log('Processing mesh:', objName); // Debug log
              
              // Add data for each mesh
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

// Helper function to get accurate mouse coordinates
function getMousePosition(event, domElement) {
    const rect = domElement.getBoundingClientRect();
    return {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1
    };
}

// Create a close button handler
function createCloseButton() {
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.style.display = 'none';
        selectObject(null, true); // Force clear selection when closing popup
    });
    return closeButton;
}

// Modified selectObject function
function selectObject(object, forceSelection = false) {
    // If there's a popup visible and we're not forcing selection
    if (popup.style.display === 'block' && !forceSelection) {
        return; // Keep current selection while popup is visible
    }

    // If we have a currently selected object, restore its material
    if (selectedObject && selectedObject !== object) {
        selectedObject.material = originalMaterials.get(selectedObject.uuid).clone();
    }
    
    // Update selection and highlight new object
    if (object) {
        selectedObject = object;
        object.material = highlightMaterial.clone();
        document.body.style.cursor = 'pointer';
    } else {
        selectedObject = null;
        document.body.style.cursor = 'auto';
    }
}

// MOUSE EVENTS
document.addEventListener('mousemove', (event) => {
    // Skip if mouse is over popup
    if (event.target.closest('.object-popup')) {
        return;
    }

    // Skip hover effects if mouse is pressed or popup is visible
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

document.addEventListener('click', (event) => {
    // Skip if clicking on popup
    if (event.target.closest('.object-popup')) {
        return;
    }
    
    const mousePos = getMousePosition(event, renderer.domElement);
    mouse.x = mousePos.x;
    mouse.y = mousePos.y;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true)
        .filter(intersect => intersect.object.isMesh);
    
    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        const data = objectData.get(clickedObject.name);
        
        if (data) {
            // Clear previous content
            popup.innerHTML = '';
            
            // Add close button
            const closeButton = createCloseButton();
            popup.appendChild(closeButton);
            
            // Add content
            const content = document.createElement('div');
            content.innerHTML = `
                <h3>Object Info</h3>
                <p><strong>Date:</strong> ${data.date}</p>
                <p><strong>Subkon/Vendor:</strong> ${data.vendor}</p>
                <p><strong>Mandor:</strong> ${data.mandor}</p>
                <p><strong>Zone:</strong> ${data.zone}</p>
                <p><strong>Workers:</strong> ${data.workers}</p>
            `;
            popup.appendChild(content);
            
            // Show popup
            popup.style.display = 'block';
            popup.style.left = event.clientX + 10 + 'px';
            popup.style.top = event.clientY + 10 + 'px';
            
            // Ensure popup stays within viewport
            const rect = popup.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                popup.style.left = `${event.clientX - rect.width - 10}px`;
            }
            if (rect.bottom > window.innerHeight) {
                popup.style.top = `${event.clientY - rect.height - 10}px`;
            }
            
            // Force select the clicked object
            selectObject(clickedObject, true);
        }
    } else if (popup.style.display !== 'block') {
        // Only clear selection if popup is not visible
        selectObject(null);
    }
});

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

window.addEventListener('contextmenu', (event) => event.preventDefault());

window.addEventListener('mousedown', (event) => {
    if (event.button === 2) {
        event.preventDefault();
        isMousePressed = true;
    }
});

window.addEventListener('mouseup', (event) => {
    if (event.button === 2) isMousePressed = false;
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

// KEYBOARD CONTROLS
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

    if (moveLeft) camera.position.addScaledVector(right, movementSpeed);
    if (moveRight) camera.position.addScaledVector(right, -movementSpeed);
    if (moveUp) camera.position.y += movementSpeed;
    if (moveDown) camera.position.y -= movementSpeed;

    renderer.render(scene, camera);
}

// WINDOW RESIZE
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    popup.style.display = 'none';
});

// Start animation
animate();