let tg = window.Telegram?.WebApp;
let cameraStream = null;

document.addEventListener('DOMContentLoaded', () => {
    if (tg?.ready) tg.ready();
    if (tg) {
        tg.expand();
        tg.setHeaderColor('#000000');
        tg.setBackgroundColor('#000000');
    }

    document.getElementById('backBtn').addEventListener('click', () => {
        stopCamera();
        window.location.href = 'index.html';
    });

    startCameraPreview();
});

async function startCameraPreview() {
    const video = document.getElementById('cameraVideo');
    const fallback = document.getElementById('cameraFallback');

    if (!navigator.mediaDevices?.getUserMedia) {
        showFallback(video, fallback);
        return;
    }

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        video.srcObject = cameraStream;
        await video.play();
    } catch {
        showFallback(video, fallback);
    }
}

function showFallback(video, fallback) {
    video.classList.add('hidden');
    fallback.classList.add('active');
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

window.addEventListener('pagehide', stopCamera);
