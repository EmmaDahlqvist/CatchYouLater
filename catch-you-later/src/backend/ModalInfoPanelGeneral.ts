document.addEventListener('DOMContentLoaded', () => {
    const infoButton = document.getElementById('info-button');
    const modal = document.getElementById('modal');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // Show modal
    infoButton?.addEventListener('click', () => {
        if (modal && modalOverlay) {
            modal.style.display = 'block';
            modalOverlay.style.display = 'block';
        }
    });

    // Hide modal
    modalCloseBtn?.addEventListener('click', () => {
        if (modal && modalOverlay) {
            modal.style.display = 'none';
            modalOverlay.style.display = 'none';
        }
    });

    // Hide modal when clicking outside of it
    modalOverlay?.addEventListener('click', () => {
        if (modal && modalOverlay) {
            modal.style.display = 'none';
            modalOverlay.style.display = 'none';
        }
    });
});