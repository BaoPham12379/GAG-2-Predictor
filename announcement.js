(function() {
    let announcementModalOpen = false;

    // Check if other modals (info, restock) are currently open
    function checkOtherModalsOpen() {
        const infoModal = document.getElementById('infoModal');
        const restockModal = document.getElementById('restockModal');
        const infoOpen = infoModal && !infoModal.classList.contains('hidden');
        const restockOpen = restockModal && !restockModal.classList.contains('hidden');
        return infoOpen || restockOpen;
    }

    function openAnnouncementModal() {
        const modal = document.getElementById('announcementModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.documentElement.classList.add('srm-modal-open');
            announcementModalOpen = true;
        }
    }

    function closeAnnouncementModal() {
        const modal = document.getElementById('announcementModal');
        if (modal) {
            // Retrieve checkbox state
            const dismissCheck = document.getElementById('announcementDismissCheck');
            if (dismissCheck && dismissCheck.checked) {
                localStorage.setItem('gag_announcement_dismissed_v1', 'true');
            }

            modal.classList.add('hidden');
            
            // Only remove scrolling block if no other modals are open
            if (!checkOtherModalsOpen()) {
                document.documentElement.classList.remove('srm-modal-open');
            }
            announcementModalOpen = false;
        }
    }

    // Initialize logic on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        // If not dismissed yet, show the announcement popup
        const isDismissed = localStorage.getItem('gag_announcement_dismissed_v1');
        if (!isDismissed) {
            // Slight delay for premium experience transition
            setTimeout(openAnnouncementModal, 400);
        }

        // Bind event listeners
        const closeBtn = document.getElementById('announcementModalCloseBtn');
        if (closeBtn) {
            closeBtn.onclick = closeAnnouncementModal;
        }

        const backdrop = document.getElementById('announcementModalCloseBackdrop');
        if (backdrop) {
            backdrop.onclick = closeAnnouncementModal;
        }

        const ackBtn = document.getElementById('announcementAckBtn');
        if (ackBtn) {
            ackBtn.onclick = closeAnnouncementModal;
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && announcementModalOpen) {
                closeAnnouncementModal();
            }
        });
    });
})();
