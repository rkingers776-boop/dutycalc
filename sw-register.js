/* DutyCalc.online — Site-wide helper: Service Worker registration (PWA / offline)
 * + nav dropdown click/touch toggle (keyboard & mobile accessible). */
(function () {
    'use strict';

    // ── Service Worker registration ──
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('sw.js').catch(function () { /* non-fatal */ });
        });
    }

    // ── Nav dropdown: click/touch toggle (hover + keyboard focus already CSS-driven) ──
    function closeAllDropdowns(except) {
        var menus = document.querySelectorAll('.nav-drop-menu');
        for (var i = 0; i < menus.length; i++) {
            if (menus[i] !== except) menus[i].style.display = 'none';
        }
    }
    var triggers = document.querySelectorAll('.nav-dropdown > span');
    for (var j = 0; j < triggers.length; j++) {
        (function (span) {
            span.addEventListener('click', function (e) {
                e.stopPropagation();
                var menu = span.parentNode.querySelector('.nav-drop-menu');
                if (!menu) return;
                var isOpen = menu.style.display === 'block';
                closeAllDropdowns(menu);
                menu.style.display = isOpen ? 'none' : 'block';
            });
        })(triggers[j]);
    }
    document.addEventListener('click', function () { closeAllDropdowns(); });
})();
