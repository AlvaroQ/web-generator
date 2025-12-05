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
const loadingOverlay = document.getElementById('loadingOverlay');
const projectNameEl = document.getElementById('projectName');
const iconPreviewEl = document.getElementById('iconPreview');
const downloadBtn = document.getElementById('downloadBtn');
const copyResourcesBtn = document.getElementById('copyResourcesBtn');
const executeCopyBtn = document.getElementById('executeCopyBtn');
const executeBuildBtn = document.getElementById('executeBuildBtn');
const backToStep2Btn = document.getElementById('backToStep2Btn');
const backToStep3Btn = document.getElementById('backToStep3Btn');

let generatedZipBlob = null;
let currentStep = 1;

// Event listeners
if (form) {
    form.addEventListener('submit', handleFormSubmit);
}
if (copyResourcesBtn) {
    copyResourcesBtn.addEventListener('click', () => goToStep(3));
}
if (executeCopyBtn) {
    executeCopyBtn.addEventListener('click', handleCopyResources);
}
if (executeBuildBtn) {
    executeBuildBtn.addEventListener('click', handleBuildApp);
}
if (backToStep2Btn) {
    backToStep2Btn.addEventListener('click', () => goToStep(2));
}
if (backToStep3Btn) {
    backToStep3Btn.addEventListener('click', () => goToStep(3));
}

// Selectores de color
document.getElementById('fillColorPicker')?.addEventListener('input', (e) => {
    document.getElementById('fillColor').value = e.target.value;
});

document.getElementById('fillColor')?.addEventListener('input', (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        document.getElementById('fillColorPicker').value = e.target.value;
    }
});

document.getElementById('ic_launcher_background_colorPicker')?.addEventListener('input', (e) => {
    document.getElementById('ic_launcher_background_color').value = e.target.value;
});

document.getElementById('ic_launcher_background_color')?.addEventListener('input', (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        document.getElementById('ic_launcher_background_colorPicker').value = e.target.value;
    }
});

// Selector de color para Primary Color (formato 0xFF...)
document.getElementById('primary_colorPicker')?.addEventListener('input', (e) => {
    const hexColor = e.target.value;
    // Convertir de #FE5000 a 0xFFFE5000
    const formattedColor = '0xFF' + hexColor.substring(1).toUpperCase();
    document.getElementById('primary_color').value = formattedColor;
});

document.getElementById('primary_color')?.addEventListener('input', (e) => {
    // Convertir de 0xFFFE5000 a #FE5000
    const value = e.target.value.trim();
    if (value.startsWith('0xFF') || value.startsWith('0xff')) {
        const hexPart = value.substring(4);
        if (/^[0-9A-F]{6}$/i.test(hexPart)) {
            document.getElementById('primary_colorPicker').value = '#' + hexPart;
        }
    } else if (/^#[0-9A-F]{6}$/i.test(value)) {
        document.getElementById('primary_colorPicker').value = value;
    }
});

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
        
        // Validar que se haya subido una imagen en Company Logo
        const imageFile = document.getElementById('company_logo').files[0];
        if (!imageFile) {
            throw new Error('Por favor, suba un archivo de imagen en Company Logo');
        }
        
        // Validar que sea una imagen
        if (!imageFile.type.startsWith('image/')) {
            throw new Error('El archivo debe ser una imagen (SVG, PNG, JPG, etc.)');
        }
        
        // Detectar si es SVG o imagen normal
        const isSvg = imageFile.type === 'image/svg+xml' || imageFile.name.toLowerCase().endsWith('.svg');
        let imageData = null;
        
        if (isSvg) {
            // Leer el SVG como texto
            imageData = await readFileAsText(imageFile);
        } else {
            // Para imágenes normales, leer como blob
            imageData = await readFileAsBlob(imageFile);
        }
        
        // Crear el ZIP
        const zip = new JSZip();
        const projectName = `${formData.environment}-${formData.name}`;
        const projectFolder = zip.folder(projectName);
        
        // Generar imágenes Android
        await generateAndroidImages(projectFolder, imageData, isSvg);
        
        // Generar imágenes iOS
        await generateIOSImages(projectFolder, imageData, isSvg);
        
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
        
        // Mostrar preview y avanzar al paso 2
        await showPreview(formData, imageData, isSvg);
        
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

// Leer archivo como blob
function readFileAsBlob(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Convertir imagen (SVG o normal) a canvas
function imageToCanvas(imageData, width, height, isSvg = true) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        if (isSvg) {
            // Es SVG, crear blob y cargar
            const svgBlob = new Blob([imageData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            img.src = url;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                URL.revokeObjectURL(url);
                resolve(canvas);
            };
            
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Error al cargar el SVG'));
            };
        } else {
            // Es imagen normal, cargar directamente
            img.src = imageData;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas);
            };
            
            img.onerror = () => {
                reject(new Error('Error al cargar la imagen'));
            };
        }
    });
}

// Convertir imagen a imagen con background
function imageToImageWithBackground(imageData, width, height, backgroundColor, isSvg = true) {
    return imageToCanvas(imageData, width, height, isSvg).then(canvas => {
        const ctx = canvas.getContext('2d');
        
        // Crear un nuevo canvas con el fondo
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = width;
        finalCanvas.height = height;
        const finalCtx = finalCanvas.getContext('2d');
        
        // Fondo con el color especificado
        finalCtx.fillStyle = backgroundColor;
        finalCtx.fillRect(0, 0, width, height);
        
        // Dibujar la imagen encima
        finalCtx.drawImage(canvas, 0, 0, width, height);
        
        // Convertir a PNG para preview
        return new Promise((resolve, reject) => {
            finalCanvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Error al convertir canvas a blob'));
                }
            }, 'image/png', 0.95);
        });
    });
}

// Convertir imagen a WebP
function imageToWebP(imageData, width, height, isSvg = true) {
    return imageToCanvas(imageData, width, height, isSvg).then(canvas => {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Error al convertir canvas a blob'));
                }
            }, 'image/webp', 0.95);
        });
    });
}

// Convertir imagen a PNG
function imageToPNG(imageData, width, height, isSvg = true) {
    return imageToCanvas(imageData, width, height, isSvg).then(canvas => {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Error al convertir canvas a blob'));
                }
            }, 'image/png', 0.95);
        });
    });
}

// Convertir SVG a imagen (mantener para compatibilidad)
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
async function generateAndroidImages(projectFolder, imageData, isSvg = true) {
    const androidFolder = projectFolder.folder('android');
    
    // Crear carpetas mipmap
    for (const [density, size] of Object.entries(ANDROID_SIZES)) {
        const mipmapFolder = androidFolder.folder(`mipmap-${density}`);
        
        // Generar ic_launcher_foreground.webp
        const foregroundBlob = await imageToWebP(imageData, size, size, isSvg);
        mipmapFolder.file('ic_launcher_foreground.webp', foregroundBlob);
        
        // Generar ic_launcher.webp (mismo que foreground)
        mipmapFolder.file('ic_launcher.webp', foregroundBlob);
        
        // Generar ic_launcher_round.webp (mismo que foreground)
        mipmapFolder.file('ic_launcher_round.webp', foregroundBlob);
    }
}

// Generar imágenes para iOS
async function generateIOSImages(projectFolder, imageData, isSvg = true) {
    const iosFolder = projectFolder.folder('ios');
    const appIconFolder = iosFolder.folder('AppIcon.appiconset');
    
    // Generar las 3 variantes de 1024x1024
    // Normal
    const normalBlob = await imageToPNG(imageData, IOS_SIZE, IOS_SIZE, isSvg);
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

// Navegar entre pasos
function goToStep(step) {
    currentStep = step;
    
    // Ocultar todos los pasos
    document.querySelectorAll('.step-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Mostrar el paso actual
    const stepContent = document.getElementById(`step${step}`);
    if (stepContent) {
        stepContent.classList.add('active');
    }
    
    // Actualizar stepper
    document.querySelectorAll('.step').forEach((stepEl, index) => {
        const stepNum = index + 1;
        stepEl.classList.remove('active', 'completed');
        if (stepNum < step) {
            stepEl.classList.add('completed');
        } else if (stepNum === step) {
            stepEl.classList.add('active');
        }
    });
    
    // Actualizar nombres de cliente en pasos 3 y 4
    if (step === 3 || step === 4) {
        const formData = getFormData();
        const clientName = `${formData.environment}-${formData.name}`;
        const clientNameEl = document.getElementById(`clientNameStep${step}`);
        if (clientNameEl) {
            clientNameEl.textContent = clientName;
        }
    }
    
    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Manejar copia de recursos
async function handleCopyResources() {
    const formData = getFormData();
    const clientName = `${formData.environment}-${formData.name}`;
    
    loadingOverlay.classList.remove('hidden');
    loadingOverlay.querySelector('p').textContent = 'Copiando recursos...';
    
    try {
        // Simular llamada a Jenkins
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Aquí iría la llamada real a Jenkins
        // await fetch('jenkins-url', { method: 'POST', body: JSON.stringify({ command: `:composeApp:importClientConfig -Pclient=${clientName}` }) });
        
        loadingOverlay.classList.add('hidden');
        goToStep(4);
    } catch (error) {
        loadingOverlay.classList.add('hidden');
        alert('Error al copiar recursos: ' + error.message);
    }
}

// Manejar compilación
async function handleBuildApp() {
    const formData = getFormData();
    const clientName = `${formData.environment}-${formData.name}`;
    
    loadingOverlay.classList.remove('hidden');
    loadingOverlay.querySelector('p').textContent = 'Generando aplicación...';
    
    try {
        // Simular llamada a Jenkins
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Aquí iría la llamada real a Jenkins
        // await fetch('jenkins-url', { method: 'POST', body: JSON.stringify({ command: `:composeApp:buildClientBundle -Pclient=${clientName}` }) });
        
        loadingOverlay.classList.add('hidden');
        alert('¡Aplicación generada exitosamente!');
    } catch (error) {
        loadingOverlay.classList.add('hidden');
        alert('Error al generar aplicación: ' + error.message);
    }
}

// Mostrar preview
async function showPreview(formData, imageData, isSvg = true) {
    // Establecer nombre del proyecto
    const projectName = `${formData.environment}-${formData.name}`;
    if (projectNameEl) {
        projectNameEl.textContent = projectName;
    }
    
    // Generar preview del icono con background
    try {
        const iconBlob = await imageToImageWithBackground(imageData, 128, 128, formData.fillColor, isSvg);
        const iconUrl = URL.createObjectURL(iconBlob);
        if (iconPreviewEl) {
            iconPreviewEl.src = iconUrl;
        }
    } catch (error) {
        console.error('Error al generar preview del icono:', error);
    }
    
    // Mostrar screenshot modificado en el preview
    try {
        await showModifiedScreenshot(formData);
    } catch (error) {
        console.error('Error al mostrar screenshot modificado:', error);
    }
    
    // Avanzar al paso 2
    goToStep(2);
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
    if (downloadBtn) {
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
}

// Resetear formulario
function resetForm() {
    if (form) {
        form.reset();
    }
    goToStep(1);
    generatedZipBlob = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    goToStep(1);
});

