/* =====================================================
   VahanSathi - Main Application
   ===================================================== */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const providers = window.VAHANSATHI_PROVIDERS || [];

const state = {
    query: "",
    vehicle: "all",
    kind: "all",
    coords: null,
    sortDistance: false
};

const serviceIcons = {
    repair: "wrench",
    tyre: "disc-3",
    towing: "truck",
    key: "key-round"
};

let toastTimer;


/* ==================== UTILITIES ==================== */

function toast(message) {
    const element = $("#toast");

    if (!element) return;

    element.textContent = message;
    element.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        element.classList.remove("show");
    }, 3000);
}


function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}


function mapsUrl(provider) {
    const query = `${provider.name}, ${provider.address}`;

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}


function vehicleLabel(vehicles = []) {
    if (
        vehicles.length === 3 &&
        ["2", "3", "4"].every(vehicle => vehicles.includes(vehicle))
    ) {
        return "2 / 3 / 4 wheeler";
    }

    return vehicles
        .map(vehicle => `${vehicle}-wheeler`)
        .join(" & ");
}


function distanceKm(first, second) {
    const radius = 6371;
    const toRad = value => value * Math.PI / 180;

    const latDifference = toRad(second.lat - first.lat);
    const lngDifference = toRad(second.lng - first.lng);

    const value =
        Math.sin(latDifference / 2) ** 2 +
        Math.cos(toRad(first.lat)) *
        Math.cos(toRad(second.lat)) *
        Math.sin(lngDifference / 2) ** 2;

    return 2 * radius * Math.asin(Math.sqrt(value));
}


function refreshIcons() {
    window.lucide?.createIcons();
}


/* ==================== PROVIDER DIRECTORY ==================== */

function renderProviders() {
    const grid = $("#providerGrid");
    if (!grid) return;

    const query = state.query.trim().toLowerCase();

    let filteredProviders = providers.filter(provider => {
        const searchableText = [
            provider.name,
            provider.address,
            provider.area,
            provider.hours,
            provider.kinds.join(" "),
            vehicleLabel(provider.vehicles)
        ].join(" ").toLowerCase();

        const matchesSearch =
            !query || searchableText.includes(query);

        const matchesVehicle =
            state.vehicle === "all" ||
            provider.vehicles.includes(state.vehicle);

        const matchesService =
            state.kind === "all" ||
            provider.kinds.includes(state.kind);

        return matchesSearch && matchesVehicle && matchesService;
    });

    if (state.sortDistance && state.coords) {
        filteredProviders.sort((first, second) => {
            const firstDistance =
                first.lat != null && first.lng != null
                    ? distanceKm(state.coords, {
                        lat: first.lat,
                        lng: first.lng
                    })
                    : Infinity;

            const secondDistance =
                second.lat != null && second.lng != null
                    ? distanceKm(state.coords, {
                        lat: second.lat,
                        lng: second.lng
                    })
                    : Infinity;

            return firstDistance - secondDistance;
        });
    }

    grid.innerHTML = filteredProviders.map((provider, index) => {
        const kind = provider.kinds
            .map(item => item.charAt(0).toUpperCase() + item.slice(1))
            .join(" · ");

        const icon = serviceIcons[provider.kinds[0]] || "wrench";

        // Random availability for project demonstration
        const availability = Math.random() > 0.3
            ? "available"
            : "unavailable";

        const availabilityLabel = {
            available: "Available Now",
            unavailable: "Currently Unavailable"
        };

        // Random estimated arrival time
        const eta = availability === "available"
            ? `~${Math.floor(Math.random() * 18) + 8} min`
            : "Not Available";

        const rating = provider.rating || "—";
        const reviews = provider.reviews || 0;

        const callAction = provider.phone
            ? `
                <a class="call-action"
                   href="tel:${escapeHtml(provider.phone)}">
                    <i data-lucide="phone"></i>
                    Call now
                </a>
            `
            : `
                <a class="call-action"
                   href="${mapsUrl(provider)}"
                   target="_blank"
                   rel="noopener noreferrer">
                    <i data-lucide="map-pin"></i>
                    Find contact
                </a>
            `;

        return `
            <article class="provider-card"
                     style="animation-delay:${Math.min(index * 35, 250)}ms">

                <div class="provider-top">
                    <span class="provider-icon">
                        <i data-lucide="${icon}"></i>
                    </span>

                    <span class="provider-tag">
                        ${escapeHtml(kind)}
                    </span>
                </div>

                <h3>${escapeHtml(provider.name)}</h3>

                <div class="provider-status-row">
                    <span class="availability-status ${availability}">
                        <span class="status-dot"></span>
                        ${availabilityLabel[availability]}
                    </span>

                    <span class="provider-eta">
                        <i data-lucide="clock-3"></i>
                        ${eta}
                    </span>

                    <span class="provider-rating">
                        <i data-lucide="star"></i>
                        ${escapeHtml(String(rating))}
                        <small>(${escapeHtml(String(reviews))})</small>
                    </span>
                </div>

                <div class="provider-address">
                    <i data-lucide="map-pin"></i>
                    <span>${escapeHtml(provider.address)}</span>
                </div>

                <div class="provider-meta">
                    <span>
                        <i data-lucide="car-front"></i>
                        ${escapeHtml(vehicleLabel(provider.vehicles))}
                    </span>

                    <span>
                        <i data-lucide="clock-3"></i>
                        ${escapeHtml(provider.hours)}
                    </span>
                </div>

                <div class="provider-actions">
                    ${callAction}

                    <a class="map-action"
                       href="${mapsUrl(provider)}"
                       target="_blank"
                       rel="noopener noreferrer">
                        <i data-lucide="navigation"></i>
                        Directions
                    </a>
                </div>

            </article>
        `;
    }).join("");

    const resultsCount = $("#resultsCount");

    if (resultsCount) {
        resultsCount.textContent =
            `Showing ${filteredProviders.length} ${
                filteredProviders.length === 1 ? "provider" : "providers"
            }`;
    }

    const emptyState = $("#emptyState");

    if (emptyState) {
        emptyState.hidden = filteredProviders.length !== 0;
    }

    grid.hidden = filteredProviders.length === 0;

    const filterCount = $("#filterCount");

    if (filterCount) {
        filterCount.textContent =
            (state.vehicle !== "all" ? 1 : 0) +
            (state.kind !== "all" ? 1 : 0);
    }

    refreshIcons();
}

/* ==================== FILTERS ==================== */

function setVehicle(vehicle) {
    state.vehicle = vehicle;

    $$("[data-filter-vehicle]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.filterVehicle === vehicle
        );
    });

    renderProviders();
}


function setKind(kind) {
    state.kind = kind;

    $$("[data-filter-kind]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.filterKind === kind
        );
    });

    renderProviders();
}


function clearFilters() {
    state.query = "";

    if ($("#searchInput")) {
        $("#searchInput").value = "";
    }

    setVehicle("all");
    setKind("all");

    $$("[data-service]").forEach(button => {
        button.classList.toggle(
            "selected",
            button.dataset.service === "all"
        );
    });
}


/* ==================== LOCATION ==================== */

function detectLocation() {
    if (!navigator.geolocation) {
        toast("Location is not supported by this browser.");
        return;
    }

    const locationStatus = $("#locationStatus");

    if (locationStatus) {
        locationStatus.textContent = "Requesting location permission...";
    }

    navigator.geolocation.getCurrentPosition(
        position => {
            state.coords = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            const coordinates =
                `${state.coords.lat.toFixed(5)}, ${state.coords.lng.toFixed(5)}`;

            if (locationStatus) {
                locationStatus.textContent =
                    `Location detected: ${coordinates}`;
            }

            if ($("#heroLocation")) {
                $("#heroLocation").textContent = "Location detected";
            }

            if ($("#heroCoords")) {
                $("#heroCoords").textContent = coordinates;
            }

            if ($("#locationTopText")) {
                $("#locationTopText").textContent = "Your location is active";
            }

            const sosLocation = $("#sosLocation");

            if (sosLocation) {
                sosLocation.innerHTML = `
                    <i data-lucide="map-pin"></i>
                    ${escapeHtml(coordinates)}
                    <button id="sosGetLocation" type="button">
                        Refresh
                    </button>
                `;

                $("#sosGetLocation")?.addEventListener(
                    "click",
                    detectLocation
                );
            }

            const locationButton = $("#locationButton");

            if (locationButton) {
                locationButton.innerHTML = `
                    <i data-lucide="check-circle-2"></i>
                    Location detected
                `;
            }

            refreshIcons();
            toast("Your current location has been detected.");

            if (state.sortDistance) {
                renderProviders();
            }
        },

        error => {
            const messages = {
                1: "Location permission was denied. Enable it in browser settings.",
                2: "Your location is currently unavailable.",
                3: "Location request timed out."
            };

            const message =
                messages[error.code] || "Unable to detect your location.";

            if (locationStatus) {
                locationStatus.textContent = message;
            }

            toast(message);
        },

        {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 60000
        }
    );
}


/* ==================== SOS MODAL ==================== */

const sosModal = $("#sosModal");

function openSos() {
    if (!sosModal) return;

    sosModal.classList.add("open");
    sosModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}


function closeSos() {
    if (!sosModal) return;

    sosModal.classList.remove("open");
    sosModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}


/* ==================== MOBILE NAVIGATION ==================== */

const menuToggle = document.getElementById("menuToggle");
const desktopNav = document.querySelector(".desktop-nav");

menuToggle?.addEventListener("click", () => {
    const isOpen = desktopNav.classList.toggle("open");

    menuToggle.classList.toggle("active", isOpen);
    menuToggle.setAttribute("aria-expanded", isOpen);
    menuToggle.setAttribute(
        "aria-label",
        isOpen ? "Close Menu" : "Open Menu"
    );
});

desktopNav?.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
        desktopNav.classList.remove("open");
        menuToggle.classList.remove("active");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open Menu");
    });
});


/* ==================== SCROLL REVEAL ==================== */

/* ==================== SCROLL REVEAL ==================== */

function initRevealAnimations() {
    const elements = document.querySelectorAll(".reveal");

    if (!("IntersectionObserver" in window)) {
        elements.forEach(element => {
            element.classList.add("visible");
        });
        return;
    }

    const observer = new IntersectionObserver(
        (entries, currentObserver) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    currentObserver.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0.05,
            rootMargin: "0px 0px 40px 0px"
        }
    );

    elements.forEach(element => observer.observe(element));
}


/* ==================== ACTIVE NAVIGATION ==================== */

function initActiveNavigation() {
    const sections = $$("main section[id]");
    const navLinks = $$(".desktop-nav a, .mobile-nav a");

    if (!sections.length || !navLinks.length) return;

    function updateActiveLink() {
        let currentSection = "home";

        sections.forEach(section => {
            if (window.scrollY >= section.offsetTop - 150) {
                currentSection = section.id;
            }
        });

        navLinks.forEach(link => {
            link.classList.toggle(
                "active",
                link.getAttribute("href") === `#${currentSection}`
            );
        });
    }

    window.addEventListener("scroll", updateActiveLink, { passive: true });
    updateActiveLink();
}


/* ==================== EVENT LISTENERS ==================== */

function initEvents() {

    // Search
    $("#searchInput")?.addEventListener("input", event => {
        state.query = event.target.value;
        renderProviders();
    });

    // Filter panel
    $("#filterToggle")?.addEventListener("click", () => {
        $("#filterRow")?.classList.toggle("open");
    });

    // Vehicle filters
    $$("[data-filter-vehicle]").forEach(button => {
        button.addEventListener("click", () => {
            setVehicle(button.dataset.filterVehicle);
        });
    });

    // Service filters
    $$("[data-filter-kind]").forEach(button => {
        button.addEventListener("click", () => {
            setKind(button.dataset.filterKind);
        });
    });

    // Clear filters
    $("#clearFilters")?.addEventListener("click", clearFilters);

    // Distance sorting
    $("#nearbyButton")?.addEventListener("click", () => {
        if (!state.coords) {
            detectLocation();
            toast("Allow location access to use distance sorting.");
            return;
        }

        const hasCoordinates = providers.some(
            provider => provider.lat != null && provider.lng != null
        );

        if (!hasCoordinates) {
            toast("Provider coordinates are not available yet.");
            return;
        }

        state.sortDistance = !state.sortDistance;

        $("#nearbyButton").innerHTML = state.sortDistance
            ? `<i data-lucide="list-filter"></i> Distance sorting on`
            : `<i data-lucide="locate-fixed"></i> Sort by distance`;

        renderProviders();
        refreshIcons();
    });

    // Quick assistance buttons
    $$("[data-service]").forEach(button => {
        button.addEventListener("click", () => {
            const service = button.dataset.service;

            $$("[data-service]").forEach(item => {
                item.classList.toggle("selected", item === button);
            });

            if (service === "all") {
                setVehicle("all");
                setKind("all");
            } else if (service === "three") {
                setVehicle("3");
                setKind("all");
            } else {
                setVehicle("all");
                setKind(service);
            }

            $("#directory")?.scrollIntoView({ behavior: "smooth" });
        });
    });

    // Vehicle category cards
    $$("[data-vehicle]").forEach(button => {
        button.addEventListener("click", () => {
            setVehicle(button.dataset.vehicle);
            $("#directory")?.scrollIntoView({ behavior: "smooth" });
        });
    });

    // Service area cards
    $$("[data-hub]").forEach(card => {
        card.addEventListener("click", () => {
            const area = card.dataset.hub;

            if ($("#searchInput")) {
                $("#searchInput").value = area;
            }

            state.query = area;
            renderProviders();

            $("#directory")?.scrollIntoView({ behavior: "smooth" });
        });
    });

    // GPS buttons
    ["heroGps", "locationButton", "locationTop"].forEach(id => {
        $("#" + id)?.addEventListener("click", detectLocation);
    });

    // SOS buttons
    ["navEmergency", "sosButton", "mobileSos"].forEach(id => {
        $("#" + id)?.addEventListener("click", openSos);
    });

    $("#closeSos")?.addEventListener("click", closeSos);

    sosModal?.addEventListener("click", event => {
        if (event.target === sosModal) {
            closeSos();
        }
    });

    // Keyboard: close SOS with Escape
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeSos();
        }
    });

    // Mobile navigation
    $("#menuToggle")?.addEventListener("click", toggleNavigation);

    // Close mobile navigation after selecting a link
    $$(".desktop-nav a").forEach(link => {
        link.addEventListener("click", () => {
            $(".desktop-nav")?.classList.remove("open");
            $("#menuToggle")?.setAttribute("aria-expanded", "false");
        });
    });
}


/* ==================== INITIALIZATION ==================== */

function initApp() {
    refreshIcons();
    renderProviders();
    initEvents();
    initRevealAnimations();
    initActiveNavigation();

    if ($("#year")) {
        $("#year").textContent = new Date().getFullYear();
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}

/* Active navigation while scrolling */
const navLinks = document.querySelectorAll('.desktop-nav a[href^="#"]');

const sections = [...navLinks]
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

const sectionObserver = new IntersectionObserver((entries) => {
    const visibleSections = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

    if (!visibleSections.length) return;

    const currentId = visibleSections[0].target.id;

    navLinks.forEach(link => {
        link.classList.toggle(
            'active',
            link.getAttribute('href') === `#${currentId}`
        );
    });
}, {
    rootMargin: '-20% 0px -60% 0px',
    threshold: [0, 0.2, 0.5]
});

sections.forEach(section => sectionObserver.observe(section));