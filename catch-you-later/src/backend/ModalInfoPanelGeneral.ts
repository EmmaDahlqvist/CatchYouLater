document.addEventListener('DOMContentLoaded', () => {
    const infoButton = document.getElementById('info-button');
    const modalinfo = document.getElementById('modalinfo');
    const modalinfoOverlay = document.getElementById('modalinfo-overlay');
    const modalinfoCloseBtn = document.getElementById('modalinfo-close-btn');

    // Show modalinfo
    infoButton?.addEventListener('click', () => {
        if (modalinfo && modalinfoOverlay) {
            modalinfo.style.display = 'block';
            modalinfoOverlay.style.display = 'block';
        }
    });

    // Hide modalinfo
    modalinfoCloseBtn?.addEventListener('click', () => {
        if (modalinfo && modalinfoOverlay) {
            modalinfo.style.display = 'none';
            modalinfoOverlay.style.display = 'none';
        }
    });

    // Hide modalinfo when clicking outside of it
    modalinfoOverlay?.addEventListener('click', () => {
        if (modalinfo && modalinfoOverlay) {
            modalinfo.style.display = 'none';
            modalinfoOverlay.style.display = 'none';
        }
    });
});