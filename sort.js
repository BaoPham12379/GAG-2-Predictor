/* ==========================================================================
   SORTING LOGIC MODULE (DECOUPLED LOGIC)
   ========================================================================== */

(function() {
    // Expose script.js DATA variable to window to prevent restock.js from making a duplicate fetch request
    if (typeof DATA !== 'undefined' && !window.DATA) {
        window.DATA = DATA;
    }

    // --------------------------------------------------------------------------
    // LOCAL TIME TOGGLE FEATURE (DECOUPLED HOOKS)
    // --------------------------------------------------------------------------
    window.useLocalTime = localStorage.getItem('gag_useLocalTime') === 'true';

    window.formatLocalTime = function(timestamp) {
        const target = new Date(timestamp * 1000);
        const now = new Date();
        
        const isToday = target.getDate() === now.getDate() &&
                        target.getMonth() === now.getMonth() &&
                        target.getFullYear() === now.getFullYear();
                        
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const isTomorrow = target.getDate() === tomorrow.getDate() &&
                           target.getMonth() === tomorrow.getMonth() &&
                           target.getFullYear() === tomorrow.getFullYear();
                           
        const timeStr = target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (isToday) {
            return `Today ${timeStr}`;
        } else if (isTomorrow) {
            return `Tomorrow ${timeStr}`;
        } else {
            const dayStr = target.toLocaleDateString([], { weekday: 'short' });
            return `${dayStr} ${timeStr}`;
        }
    };
    
    // Override window.buildRow to support local time format
    const originalBuildRow = window.buildRow;
    window.buildRow = function(item) {
        if (!originalBuildRow) return document.createElement('div');
        const el = originalBuildRow(item);
        if (window.useLocalTime) {
            const badge = el.querySelector('.next-badge');
            if (badge && !badge.classList.contains('none')) {
                const ev = window.evalItem(item);
                if (ev && ev.nxt) {
                    badge.innerHTML = `At <span class="cd">${window.formatLocalTime(ev.nxt.t)}</span> | x${ev.nxt.q}`;
                }
            }
        }
        return el;
    };
    
    // Override window.weatherRowsData to support local time format
    const originalWeatherRowsData = window.weatherRowsData;
    window.weatherRowsData = function() {
        if (!window.useLocalTime) {
            return originalWeatherRowsData ? originalWeatherRowsData() : [];
        }
        const W = window.DATA.weather; if (!W || !W.clen) return [];
        const t = Math.floor(Date.now() / 1000); const out = [];
        const cur = window.weatherAt(t);
        const WSKIP = { Day: true, Sunset: true, Moon: true };
        
        if (cur && cur.name && !WSKIP[cur.name]) {
            const label = 'until ' + window.formatLocalTime(t + cur.secsLeft);
            out.push({ name: cur.name, label: label, isCur: true });
        }
        for (const u of window.upcomingWeather(400)) {
            if (WSKIP[u.name]) continue;
            const label = 'at ' + window.formatLocalTime(t + u.secs);
            out.push({ name: u.name, label: label, isCur: false });
            if (out.length >= 12) break;
        }
        return out;
    };
    
    // Override window.tickWeather
    window.myLastWKey = '';
    const originalTickWeather = window.tickWeather;
    window.tickWeather = function() {
        if (!window.useLocalTime) {
            if (originalTickWeather) originalTickWeather();
            return;
        }
        const cur = window.weatherAt(Math.floor(Date.now() / 1000)); if (!cur) return;
        const key = cur.cyc + '-' + cur.pi;
        if (key !== window.myLastWKey) {
            window.myLastWKey = key;
            if (window.renderWeather) window.renderWeather();
            return;
        }
        const data = window.weatherRowsData();
        document.querySelectorAll('#rows .row').forEach((el, i) => {
            const b = el.querySelector('.next-badge'); if (b && data[i]) b.textContent = data[i].label;
        });
    };
    
    // Bind toggle DOM element events
    function initToggle() {
        const timeToggle = document.getElementById('timeToggleCheckbox');
        if (timeToggle) {
            timeToggle.checked = window.useLocalTime;
            timeToggle.addEventListener('change', (e) => {
                window.useLocalTime = e.target.checked;
                localStorage.setItem('gag_useLocalTime', window.useLocalTime);
                if (window.render) window.render();
                if (window.renderRestockHistory) window.renderRestockHistory();
            });
            
            // Support clicking on the icons directly
            const iconCountdown = document.querySelector('.toggle-icon-countdown');
            if (iconCountdown) {
                iconCountdown.parentElement.addEventListener('click', () => {
                    if (timeToggle.checked) {
                        timeToggle.checked = false;
                        timeToggle.dispatchEvent(new Event('change'));
                    }
                });
            }
            const iconLocal = document.querySelector('.toggle-icon-local');
            if (iconLocal) {
                iconLocal.parentElement.addEventListener('click', () => {
                    if (!timeToggle.checked) {
                        timeToggle.checked = true;
                        timeToggle.dispatchEvent(new Event('change'));
                    }
                });
            }
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initToggle);
    } else {
        initToggle();
    }

    // Local helper to get current unix timestamp
    const getNow = () => Math.floor(Date.now() / 1000);

    // Rarity ranking lookup for sorting
    const LOCAL_RANK = { 
        Common: 1, 
        Uncommon: 2, 
        Rare: 3, 
        Epic: 4, 
        Legendary: 5, 
        Mythic: 6, 
        Super: 7, 
        Divine: 8, 
        Prismatic: 9 
    };

    // Inject crate image URLs into ICON_URLS (from script.js) without touching script.js
    // Uses Proxy so any unknown crate name falls back to the Ladder Crate image
    if (typeof ICON_URLS !== 'undefined') {
        const CRATE_DEFAULT_IMG = 'assets/images/Crate/LadderCrate.webp';
        const CRATE_IMAGES = {
            'Light Crate': 'assets/images/Crate/LightCrate.webp',
            'Arch Crate': 'assets/images/Crate/ArchCrate.webp',
            'Bench Crate': 'assets/images/Crate/BenchCrate.webp',
            'Bridge Crate': 'assets/images/Crate/BridgeCrate.webp',
            'Seesaw Crate': 'assets/images/Crate/SeesawCrate.webp',
            'Sign Crate': 'assets/images/Crate/SignCrate.webp',
            'Teleporter Pad Crate': 'assets/images/Crate/TeleporterPadCrate.webp',
            'Ladder Crate': 'assets/images/Crate/LadderCrate.webp',
            'Fence Crate': 'assets/images/Crate/FenceCrate.webp',
            'Owner Door Crate': 'assets/images/Crate/OwnerDoorCrate.webp',
            'Conveyor Crate': 'assets/images/Crate/ConveyorCrate.webp',
            'Spring Crate': 'assets/images/Crate/SpringCrate.webp',
            'Roleplay Crate': 'assets/images/Crate/RoleplayCrate.webp',
            'Bear Trap Crate': 'assets/images/Crate/BearTrapCrate.webp',
            'Picture Frame Crate': 'assets/images/Crate/PictureFrameCrate.webp'
        };
        ICON_URLS.crates = new Proxy(CRATE_IMAGES, {
            get(target, prop) {
                if (typeof prop === 'string') return target[prop] || CRATE_DEFAULT_IMG;
                return target[prop];
            }
        });
    }

    // Shared custom view arrays
    window.mySortedView = [];
    window.myLastWindow = 0;

    // Helper to highlight active stock cards
    function highlightActiveStock() {
        const useSorted = (window.TAB === 'seeds' || window.TAB === 'gears' || window.TAB === 'crates');
        const items = useSorted ? window.mySortedView : (typeof VIEW !== 'undefined' ? VIEW : []);
        const rowsElements = document.querySelectorAll('#rows .row');
        if (rowsElements.length > 0 && items && items.length > 0 && window.evalItem) {
            rowsElements.forEach((row, idx) => {
                const item = items[idx];
                if (item) {
                    const ev = window.evalItem(item);
                    const inStock = ev && ev.cur && ev.cur.q > 0;
                    if (inStock) {
                        row.classList.add('in-stock-highlight');
                    } else {
                        row.classList.remove('in-stock-highlight');
                    }
                }
            });
        }
    }

    // Override Render function to support custom sorting
    const originalSortRender = window.render;
    window.render = function() {
        // Call original render first to allow it to initialize TAB, header state, and default UI
        if (originalSortRender) {
            originalSortRender();
        }

        // Only apply custom sorting for Seeds, Gears, and Crates tabs
        if (window.TAB !== 'seeds' && window.TAB !== 'gears' && window.TAB !== 'crates') {
            return;
        }

        const sortSelect = document.getElementById('sortSelect');
        const sortMode = sortSelect ? sortSelect.value : 'default';

        const list = window.DATA ? (window.DATA[window.TAB] || []) : [];
        if (!list.length) return;

        let sortedList = list.slice();

        // Sort data based on selected mode
        if (sortMode === 'default') {
            // Default sort: rarity rank (low to high), then price (low to high)
            sortedList.sort((a, b) => {
                const rankA = LOCAL_RANK[a.rarity] || 99;
                const rankB = LOCAL_RANK[b.rarity] || 99;
                if (rankA !== rankB) return rankA - rankB;
                return a.price - b.price;
            });
        } else if (sortMode === 'instock') {
            // In-stock items first, then fallback to default sort
            sortedList.sort((a, b) => {
                const evA = window.evalItem ? window.evalItem(a) : null;
                const evB = window.evalItem ? window.evalItem(b) : null;
                const inStockA = evA && evA.cur && evA.cur.q > 0 ? 1 : 0;
                const inStockB = evB && evB.cur && evB.cur.q > 0 ? 1 : 0;

                if (inStockA !== inStockB) {
                    return inStockB - inStockA; // in-stock (1) comes before out-of-stock (0)
                }

                // Fallback to default sort
                const rankA = LOCAL_RANK[a.rarity] || 99;
                const rankB = LOCAL_RANK[b.rarity] || 99;
                if (rankA !== rankB) return rankA - rankB;
                return a.price - b.price;
            });
        } else if (sortMode === 'rarity-asc') {
            // Rarity: Low to High
            sortedList.sort((a, b) => (LOCAL_RANK[a.rarity] || 99) - (LOCAL_RANK[b.rarity] || 99) || a.price - b.price);
        } else if (sortMode === 'rarity-desc') {
            // Rarity: High to Low
            sortedList.sort((a, b) => (LOCAL_RANK[b.rarity] || 99) - (LOCAL_RANK[a.rarity] || 99) || b.price - a.price);
        } else if (sortMode === 'price-asc') {
            // Price: Low to High
            sortedList.sort((a, b) => a.price - b.price || (LOCAL_RANK[a.rarity] || 99) - (LOCAL_RANK[b.rarity] || 99));
        } else if (sortMode === 'price-desc') {
            // Price: High to Low
            sortedList.sort((a, b) => b.price - a.price || (LOCAL_RANK[b.rarity] || 99) - (LOCAL_RANK[a.rarity] || 99));
        }

        window.mySortedView = sortedList;

        // Rebuild cards in rows container
        const rows = document.getElementById('rows');
        const empty = document.getElementById('empty');
        if (rows && window.buildRow) {
            rows.innerHTML = '';
            if (!window.mySortedView.length) {
                if (empty) empty.classList.remove('hidden');
            } else {
                if (empty) empty.classList.add('hidden');
                window.mySortedView.forEach(item => {
                    rows.appendChild(window.buildRow(item));
                });
            }
        }

        // Highlight stock items
        highlightActiveStock();
    };

    // Override tickCards function to read from custom mySortedView
    window.tickCards = function() {
        if (window.TAB === 'weather') {
            if (window.tickWeather) {
                window.tickWeather();
            }
            return;
        }

        const t = getNow();
        const period = (window.DATA && window.DATA.period) ? window.DATA.period : 300;
        const w = Math.floor(t / period);

        // Re-render when time window changes to update stock counts
        if (w !== window.myLastWindow) {
            window.myLastWindow = w;
            window.render();
            return;
        }

        // Determine which item list to use for countdown ticking
        // Seeds/Gears use the custom sorted view; Crates and others use the global VIEW array
        const useSorted = (window.TAB === 'seeds' || window.TAB === 'gears' || window.TAB === 'crates');
        const items = useSorted ? window.mySortedView : (typeof VIEW !== 'undefined' ? VIEW : []);

        // Tick countdowns for current active view
        const rowEls = document.querySelectorAll('#rows .row');
        if (rowEls.length > 0 && items && items.length > 0 && window.evalItem && window.shortDur) {
            rowEls.forEach((el, i) => {
                const item = items[i];
                if (!item) return;
                const ev = window.evalItem(item);
                const cd = el.querySelector('.cd');
                if (cd && ev.nxt) {
                    if (window.useLocalTime) {
                        cd.textContent = window.formatLocalTime(ev.nxt.t);
                    } else {
                        cd.textContent = window.shortDur(ev.nxt.t - t);
                    }
                }
            });
        }
    };

    // Initialize myLastWindow on load
    const initialPeriod = (window.DATA && window.DATA.period) ? window.DATA.period : 300;
    window.myLastWindow = Math.floor(getNow() / initialPeriod);

    // Bind event listeners to sort selection dropdown
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.onchange = () => {
            window.render();
        };
    }
})();
