// Tamaños estándar para Android mipmap
const ANDROID_SIZES = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
};

// Tamaño para iOS
const IOS_SIZE = 1024;

// Referencias a elementos del DOM
const form = document.getElementById('configForm');
const generateBtn = document.getElementById('generateBtn');
const previewSection = document.getElementById('previewSection');
const loadingOverlay = document.getElementById('loadingOverlay');
const projectNameEl = document.getElementById('projectName');
const iconPreviewEl = document.getElementById('iconPreview');
const downloadBtn = document.getElementById('downloadBtn');
const newProjectBtn = document.getElementById('newProjectBtn');

let generatedZipBlob = null;

// Event listeners
form.addEventListener('submit', handleFormSubmit);
newProjectBtn.addEventListener('click', resetForm);

// Actualizar nombre del JSON dinámicamente
document.getElementById('environment').addEventListener('change', updateJsonFileName);
document.getElementById('name').addEventListener('input', updateJsonFileName);

function updateJsonFileName() {
    const environment = document.getElementById('environment').value || '';
    const name = document.getElementById('name').value || '';
    const jsonFileNameEl = document.getElementById('jsonFileName');
    if (jsonFileNameEl) {
        if (environment && name) {
            jsonFileNameEl.textContent = `${environment}-${name}`;
        } else {
            jsonFileNameEl.textContent = 'example';
        }
    }
}

// Función principal para manejar el envío del formulario
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Mostrar loading
    loadingOverlay.classList.remove('hidden');
    
    try {
        // Obtener datos del formulario
        const formData = getFormData();
        
        // Validar que se haya subido un SVG en Company Logo
        const svgFile = document.getElementById('company_logo').files[0];
        if (!svgFile) {
            throw new Error('Por favor, suba un archivo SVG en Company Logo');
        }
        
        // Leer el SVG
        const svgContent = await readFileAsText(svgFile);
        
        // Crear el ZIP
        const zip = new JSZip();
        const projectName = `${formData.environment}-${formData.name}`;
        const projectFolder = zip.folder(projectName);
        
        // Generar imágenes Android
        await generateAndroidImages(projectFolder, svgContent);
        
        // Generar imágenes iOS
        await generateIOSImages(projectFolder, svgContent);
        
        // Generar archivos XML
        generateXMLFiles(projectFolder, formData);
        
        // Generar JSON con nombre dinámico
        const jsonFileName = `${formData.environment}-${formData.name}.json`;
        generateExampleJson(projectFolder, formData, jsonFileName);
        
        // Modificar screenshot_1
        await modifyScreenshot1(projectFolder, formData);
        
        // Generar el ZIP con opciones compatibles con Windows
        const zipBlob = await zip.generateAsync({ 
            type: 'blob', 
            compression: 'DEFLATE', 
            compressionOptions: { level: 6 },
            streamFiles: false
        });
        generatedZipBlob = zipBlob;
        
        // Ocultar loading
        loadingOverlay.classList.add('hidden');
        
        // Mostrar preview
        showPreview(formData, svgContent);
        
    } catch (error) {
        loadingOverlay.classList.add('hidden');
        alert('Error al generar el proyecto: ' + error.message);
        console.error(error);
    }
}

// Obtener datos del formulario
function getFormData() {
    return {
        client_id: document.getElementById('client_id').value,
        license: document.getElementById('license').value,
        client_redirect_uri: document.getElementById('client_redirect_uri').value,
        company_logo: document.getElementById('company_logo').files[0] ? document.getElementById('company_logo').files[0].name : '',
        primary_color: document.getElementById('primary_color').value,
        secure_flag: document.getElementById('secure_flag').checked,
        environment: document.getElementById('environment').value,
        name: document.getElementById('name').value,
        applicationId: document.getElementById('applicationId').value,
        versionCode: parseInt(document.getElementById('versionCode').value) || 1,
        versionName: document.getElementById('versionName').value || '1.0.0',
        fillColor: document.getElementById('fillColor').value,
        ic_launcher_background_color: document.getElementById('ic_launcher_background_color').value
    };
}

// Leer archivo como texto
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

// Convertir SVG a imagen con background
function svgToImageWithBackground(svgContent, width, height, backgroundColor) {
    return new Promise((resolve, reject) => {
        try {
            // Crear un SVG con dimensiones explícitas
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
            const svgElement = svgDoc.documentElement;
            
            // Establecer dimensiones si no están definidas
            if (!svgElement.getAttribute('width')) {
                svgElement.setAttribute('width', width);
            }
            if (!svgElement.getAttribute('height')) {
                svgElement.setAttribute('height', height);
            }
            if (!svgElement.getAttribute('viewBox')) {
                svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
            }
            
            const modifiedSvg = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([modifiedSvg], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                // Fondo con el color especificado
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, width, height);
                
                // Dibujar el SVG en el canvas
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convertir a PNG para preview
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(url);
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Error al convertir canvas a blob'));
                    }
                }, 'image/png', 0.95);
            };
            
            img.onerror = (error) => {
                URL.revokeObjectURL(url);
                reject(new Error('Error al cargar el SVG: ' + error.message));
            };
            
            img.src = url;
        } catch (error) {
            reject(new Error('Error al procesar SVG: ' + error.message));
        }
    });
}

// Convertir SVG a imagen
function svgToImage(svgContent, width, height) {
    return new Promise((resolve, reject) => {
        try {
            // Crear un SVG con dimensiones explícitas
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
            const svgElement = svgDoc.documentElement;
            
            // Establecer dimensiones si no están definidas
            if (!svgElement.getAttribute('width')) {
                svgElement.setAttribute('width', width);
            }
            if (!svgElement.getAttribute('height')) {
                svgElement.setAttribute('height', height);
            }
            if (!svgElement.getAttribute('viewBox')) {
                svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
            }
            
            const modifiedSvg = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([modifiedSvg], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                // Fondo blanco (opcional, para SVGs transparentes)
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, width, height);
                
                // Dibujar el SVG en el canvas
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convertir a WebP para Android, PNG para iOS
                const format = width === IOS_SIZE ? 'image/png' : 'image/webp';
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(url);
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Error al convertir canvas a blob'));
                    }
                }, format, 0.95);
            };
            
            img.onerror = (error) => {
                URL.revokeObjectURL(url);
                reject(new Error('Error al cargar el SVG: ' + error.message));
            };
            
            img.src = url;
        } catch (error) {
            reject(new Error('Error al procesar SVG: ' + error.message));
        }
    });
}

// Generar imágenes para Android
async function generateAndroidImages(projectFolder, svgContent) {
    const androidFolder = projectFolder.folder('android');
    
    // Crear carpetas mipmap
    for (const [density, size] of Object.entries(ANDROID_SIZES)) {
        const mipmapFolder = androidFolder.folder(`mipmap-${density}`);
        
        // Generar ic_launcher_foreground.webp
        const foregroundBlob = await svgToImage(svgContent, size, size);
        mipmapFolder.file('ic_launcher_foreground.webp', foregroundBlob);
        
        // Generar ic_launcher.webp (mismo que foreground)
        mipmapFolder.file('ic_launcher.webp', foregroundBlob);
        
        // Generar ic_launcher_round.webp (mismo que foreground)
        mipmapFolder.file('ic_launcher_round.webp', foregroundBlob);
    }
}

// Generar imágenes para iOS
async function generateIOSImages(projectFolder, svgContent) {
    const iosFolder = projectFolder.folder('ios');
    const appIconFolder = iosFolder.folder('AppIcon.appiconset');
    
    // Generar las 3 variantes de 1024x1024
    // Normal
    const normalBlob = await svgToImage(svgContent, IOS_SIZE, IOS_SIZE);
    appIconFolder.file('1024.png', normalBlob);
    
    // Dark (mismo para ahora, se puede personalizar después)
    appIconFolder.file('1024 1.png', normalBlob);
    
    // Tinted (mismo para ahora, se puede personalizar después)
    appIconFolder.file('1024 2.png', normalBlob);
    
    // Generar Contents.json
    const contentsJson = {
        "images": [
            {
                "filename": "1024.png",
                "idiom": "universal",
                "platform": "ios",
                "size": "1024x1024"
            },
            {
                "appearances": [
                    {
                        "appearance": "luminosity",
                        "value": "dark"
                    }
                ],
                "filename": "1024 1.png",
                "idiom": "universal",
                "platform": "ios",
                "size": "1024x1024"
            },
            {
                "appearances": [
                    {
                        "appearance": "luminosity",
                        "value": "tinted"
                    }
                ],
                "filename": "1024 2.png",
                "idiom": "universal",
                "platform": "ios",
                "size": "1024x1024"
            }
        ],
        "info": {
            "author": "xcode",
            "version": 1
        }
    };
    
    appIconFolder.file('Contents.json', JSON.stringify(contentsJson, null, 2));
}

// Generar archivos XML
function generateXMLFiles(projectFolder, formData) {
    const androidFolder = projectFolder.folder('android');
    
    // Crear carpeta drawable
    const drawableFolder = androidFolder.folder('drawable');
    const icLauncherBackground = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="${formData.fillColor}"
        android:pathData="M0,0h108v108h-108z" />
</vector>`;
    drawableFolder.file('ic_launcher_background.xml', icLauncherBackground);
    
    // Crear carpeta values
    const valuesFolder = androidFolder.folder('values');
    const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${formData.ic_launcher_background_color}</color>
</resources>
`;
    valuesFolder.file('colors.xml', colorsXml);
    
    // Crear carpeta mipmap-anydpi-v26
    const anydpiFolder = androidFolder.folder('mipmap-anydpi-v26');
    const icLauncher = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`;
    anydpiFolder.file('ic_launcher.xml', icLauncher);
    anydpiFolder.file('ic_launcher_round.xml', icLauncher);
}

// Generar JSON con nombre dinámico
function generateExampleJson(projectFolder, formData, fileName) {
    const exampleJson = {
        client_id: formData.client_id,
        license: formData.license,
        client_redirect_uri: formData.client_redirect_uri,
        company_logo: formData.company_logo,
        primary_color: formData.primary_color,
        secure_flag: formData.secure_flag,
        environment: formData.environment,
        name: formData.name,
        applicationId: formData.applicationId,
        versionCode: formData.versionCode,
        versionName: formData.versionName
    };
    
    // Usar UTF-8 encoding explícito para evitar problemas con Windows
    const jsonString = JSON.stringify(exampleJson, null, 2);
    // Asegurar que el JSON se guarde con encoding UTF-8
    projectFolder.file(fileName, jsonString, { binary: false });
}

// Modificar screenshot_1
async function modifyScreenshot1(projectFolder, formData) {
    try {
        // Cargar screenshot_1
        const screenshotResponse = await fetch('../screenshots/screenshot_1.png');
        const screenshotBlob = await screenshotResponse.blob();
        const screenshotUrl = URL.createObjectURL(screenshotBlob);
        
        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = screenshotUrl;
        });
        
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        // Dibujar la imagen original
        ctx.drawImage(img, 0, 0);
        
        // Obtener el color del formulario (colors.xml)
        const color = formData.ic_launcher_background_color;
        const rgb = hexToRgb(color);
        
        // Reemplazar color naranja (#FE5000) por el color del formulario
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Detectar color naranja (#FE5000 = rgb(254, 80, 0)) con tolerancia
            if (Math.abs(r - 254) < 10 && Math.abs(g - 80) < 10 && Math.abs(b - 0) < 10) {
                data[i] = rgb.r;
                data[i + 1] = rgb.g;
                data[i + 2] = rgb.b;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Agregar texto con el nombre del proyecto
        const projectName = `${formData.environment}-${formData.name}`;
        ctx.fillStyle = color;
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Dibujar texto con sombra para mejor legibilidad
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(projectName, canvas.width / 2, 100);
        
        // Convertir a blob
        const modifiedBlob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png');
        });
        
        // Crear carpeta screenshots en el ZIP
        const screenshotsFolder = projectFolder.folder('screenshots');
        screenshotsFolder.file('screenshot_1.png', modifiedBlob);
        
        // Copiar otros screenshots sin modificar
        for (let i = 2; i <= 4; i++) {
            const otherScreenshot = await fetch(`../screenshots/screenshot_${i}.png`);
            const otherBlob = await otherScreenshot.blob();
            screenshotsFolder.file(`screenshot_${i}.png`, otherBlob);
        }
        
        URL.revokeObjectURL(screenshotUrl);
    } catch (error) {
        console.error('Error al modificar screenshot:', error);
        // Si falla, copiar screenshots sin modificar
        try {
            const screenshotsFolder = projectFolder.folder('screenshots');
            for (let i = 1; i <= 4; i++) {
                const screenshot = await fetch(`../screenshots/screenshot_${i}.png`);
                const blob = await screenshot.blob();
                screenshotsFolder.file(`screenshot_${i}.png`, blob);
            }
        } catch (e) {
            console.error('Error al copiar screenshots:', e);
        }
    }
}

// Convertir hex a RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 254, g: 80, b: 0 };
}

// Mostrar preview
async function showPreview(formData, svgContent) {
    // Ocultar formulario
    form.style.display = 'none';
    
    // Mostrar preview
    previewSection.classList.remove('hidden');
    
    // Establecer nombre del proyecto
    const projectName = `${formData.environment}-${formData.name}`;
    projectNameEl.textContent = projectName;
    
    // Generar preview del icono con background
    try {
        const iconBlob = await svgToImageWithBackground(svgContent, 128, 128, formData.fillColor);
        const iconUrl = URL.createObjectURL(iconBlob);
        iconPreviewEl.src = iconUrl;
    } catch (error) {
        console.error('Error al generar preview del icono:', error);
    }
    
    // Mostrar screenshot modificado en el preview
    try {
        await showModifiedScreenshot(formData);
    } catch (error) {
        console.error('Error al mostrar screenshot modificado:', error);
    }
}

// Mostrar screenshot modificado en el preview
async function showModifiedScreenshot(formData) {
    const screenshot1Preview = document.getElementById('screenshot1Preview');
    if (!screenshot1Preview) return;
    
    try {
        // Cargar screenshot_1
        const screenshotResponse = await fetch('../screenshots/screenshot_1.png');
        const screenshotBlob = await screenshotResponse.blob();
        const screenshotUrl = URL.createObjectURL(screenshotBlob);
        
        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = screenshotUrl;
        });
        
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        // Dibujar la imagen original
        ctx.drawImage(img, 0, 0);
        
        // Obtener el color del formulario (colors.xml)
        const color = formData.ic_launcher_background_color;
        const rgb = hexToRgb(color);
        
        // Reemplazar color naranja (#FE5000) por el color del formulario
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Detectar color naranja (#FE5000 = rgb(254, 80, 0)) con tolerancia
            if (Math.abs(r - 254) < 10 && Math.abs(g - 80) < 10 && Math.abs(b - 0) < 10) {
                data[i] = rgb.r;
                data[i + 1] = rgb.g;
                data[i + 2] = rgb.b;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Agregar texto con el nombre del proyecto
        const projectName = `${formData.environment}-${formData.name}`;
        ctx.fillStyle = color;
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Dibujar texto con sombra para mejor legibilidad
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(projectName, canvas.width / 2, 100);
        
        // Mostrar en el preview
        screenshot1Preview.src = canvas.toDataURL('image/png');
        
        URL.revokeObjectURL(screenshotUrl);
    } catch (error) {
        console.error('Error al modificar screenshot para preview:', error);
    }
    
    // Configurar botón de descarga
    downloadBtn.onclick = () => {
        if (generatedZipBlob) {
            const url = URL.createObjectURL(generatedZipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projectName}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };
}

// Resetear formulario
function resetForm() {
    form.reset();
    form.style.display = 'block';
    previewSection.classList.add('hidden');
    generatedZipBlob = null;
    window.scrollTo(0, 0);
}

