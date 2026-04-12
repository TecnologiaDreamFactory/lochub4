
// ========== Parallax Slider com Autoplay Infinito ==========
(function () {
    const slider = document.getElementById('parallaxSlider');
    const dotsContainer = document.getElementById('parallaxDots');
    if (!slider || !dotsContainer) return;

    const slides = Array.from(slider.querySelectorAll('.parallax-slide'));
    let current = 0;
    let timer;

    slides.forEach(function (slide) {
        slide.style.backgroundImage = "url('" + slide.dataset.bg + "')";
    });

    slides.forEach(function (_, i) {
        const dot = document.createElement('button');
        dot.className = 'parallax-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Ir para slide ' + (i + 1));
        dot.addEventListener('click', function () {
            goTo(i);
            restart();
        });
        dotsContainer.appendChild(dot);
    });

    function goTo(index) {
        const outgoing = slides[current];

        // Congela a escala atual e inicia fade-out via CSS (.leaving)
        outgoing.style.transform = window.getComputedStyle(outgoing).transform;
        outgoing.style.animation = 'none';
        outgoing.classList.remove('active');
        outgoing.classList.add('leaving');
        dotsContainer.children[current].classList.remove('active');

        current = (index + slides.length) % slides.length;
        const incoming = slides[current];

        // Limpa qualquer estado anterior e reinicia o Ken Burns
        incoming.classList.remove('leaving');
        incoming.style.transform = '';
        incoming.style.animation = 'none';
        void incoming.offsetWidth;
        incoming.style.animation = '';

        incoming.classList.add('active');
        dotsContainer.children[current].classList.add('active');

        // Remove o leaving após o fade-out concluir
        setTimeout(function () {
            outgoing.classList.remove('leaving');
            outgoing.style.transform = '';
        }, 1300);
    }

    function next() {
        goTo(current + 1);
    }

    function restart() {
        clearInterval(timer);
        timer = setInterval(next, 7000);
    }

    restart();
})();

// Funções do Modal
function openModal(imageSrc, altText) {
    const modal = document.getElementById('photoModal');
    const modalImage = document.getElementById('modalImage');
    modalImage.src = imageSrc;
    modalImage.alt = altText;
    modal.style.display = 'flex';
    void modal.offsetWidth;
}

function closeModal() {
    document.getElementById('photoModal').style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('photoModal');
    if (event.target == modal) modal.style.display = 'none';
};

// ========== Carrosséis: thumbnails deslizam com zoom até o centro ==========

function initThumbnailCarousel(galleryEl) {
    if (!galleryEl || typeof gsap === 'undefined') return;

    const imagesStr = galleryEl.getAttribute('data-images');
    const altsStr   = galleryEl.getAttribute('data-alts');
    const textsStr  = galleryEl.getAttribute('data-texts');
    if (!imagesStr || !altsStr) return;

    const images = imagesStr.split(',').map(s => s.trim());
    const alts   = altsStr.split(',').map(s => s.trim());
    const texts  = textsStr ? textsStr.split('|').map(s => s.trim()) : [];

    const prevSlot   = galleryEl.querySelector('.carousel-slot--prev');
    const centerSlot = galleryEl.querySelector('.carousel-slot--center');
    const nextSlot   = galleryEl.querySelector('.carousel-slot--next');
    const prevBtn    = galleryEl.querySelector('.carousel-prev');
    const nextBtn    = galleryEl.querySelector('.carousel-next');
    const textEl     = galleryEl.querySelector('.carousel-item-text');

    if (!prevSlot || !centerSlot || !nextSlot) return;

    const centerInner = centerSlot.querySelector('.carousel-slot-inner');

    let currentIndex = 0;
    const total = images.length;
    let isAnimating = false;

    function getPrevIndex() { return (currentIndex - 1 + total) % total; }
    function getNextIndex() { return (currentIndex + 1) % total; }

    function applyContent(idx) {
        centerSlot.querySelector('img').src = images[idx];
        centerSlot.querySelector('img').alt = alts[idx] || '';

        // Preenche as miniaturas prev/next
        const pi = (idx - 1 + total) % total;
        const ni = (idx + 1) % total;
        if (prevSlot) {
            prevSlot.querySelector('img').src = images[pi];
            prevSlot.querySelector('img').alt = alts[pi] || '';
        }
        if (nextSlot) {
            nextSlot.querySelector('img').src = images[ni];
            nextSlot.querySelector('img').alt = alts[ni] || '';
        }

        if (textEl && texts[idx] !== undefined) textEl.textContent = texts[idx];
    }

    function resetState() {
        gsap.set(centerInner, { x: 0, scale: 1, opacity: 1, zIndex: 5 });
        // Garante que o texto está visível sem depender de animação prévia
        if (textEl) { textEl.style.opacity = '1'; textEl.style.transform = 'none'; }
    }

    // ── Animação: imagem desliza + zoom, texto faz fade ─────────────────────
    function navigate(direction) {
        if (isAnimating) return;
        isAnimating = true;

        const slideOut = centerSlot.offsetWidth * 0.4;
        const xOut = direction === 'next' ? -slideOut : slideOut;
        const xIn  = direction === 'next' ?  slideOut : -slideOut;

        // Saída: imagem desliza + dissolve (sem zoom)
        const tl = gsap.timeline();
        tl.to(centerInner, { x: xOut, opacity: 0, duration: 0.28, ease: 'power2.in' }, 0);
        if (textEl) tl.to(textEl, { opacity: 0, duration: 0.22, ease: 'power1.in' }, 0);

        tl.call(() => {
            currentIndex = direction === 'next' ? getNextIndex() : getPrevIndex();
            applyContent(currentIndex);

            // Entrada: imagem surge do lado oposto com slide + fade suave
            gsap.set(centerInner, { x: xIn, opacity: 0 });
            if (textEl) gsap.set(textEl, { opacity: 0 });

            const tl2 = gsap.timeline({ onComplete() { isAnimating = false; } });
            tl2.to(centerInner, { x: 0, opacity: 1, duration: 0.42, ease: 'power3.out' }, 0);
            if (textEl) tl2.to(textEl, { opacity: 1, duration: 0.55, ease: 'power2.out' }, 0.15);
        });
    }

    // Navegação apenas pelas setas (botões), não pela miniatura
    const prevBtn2 = prevSlot ? prevSlot.querySelector('.carousel-thumb-nav') : null;
    const nextBtn2 = nextSlot ? nextSlot.querySelector('.carousel-thumb-nav') : null;

    // ── Autoplay ─────────────────────────────────────────────────────────────
    const AUTOPLAY_DELAY = 4000;
    let autoplayTimer = null;

    function startAutoplay() {
        stopAutoplay();
        autoplayTimer = setInterval(() => navigate('next'), AUTOPLAY_DELAY);
    }

    function stopAutoplay() {
        if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
    }

    // Pausa ao interagir manualmente, retoma após 8 s de inatividade
    function onManualNav(direction) {
        stopAutoplay();
        navigate(direction);
        setTimeout(startAutoplay, 8000);
    }

    if (prevBtn2) {
        prevBtn2.addEventListener('click', (e) => { e.stopPropagation(); onManualNav('prev'); });
        prevBtn2.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') onManualNav('prev'); });
    }
    if (nextBtn2) {
        nextBtn2.addEventListener('click', (e) => { e.stopPropagation(); onManualNav('next'); });
        nextBtn2.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') onManualNav('next'); });
    }

    // Pausa quando o usuário passa o mouse sobre o carrossel
    galleryEl.addEventListener('mouseenter', stopAutoplay);
    galleryEl.addEventListener('mouseleave', startAutoplay);

    applyContent(currentIndex);
    resetState();
    startAutoplay();
}

// ========== Ticker infinito de clientes ==========

function initClientsTicker() {
    const track = document.querySelector('.clients-track');
    if (!track) return;

    // Só pausa com hover real (mouse). Em touch, mouseenter pode disparar sem mouseleave — a animação trava.
    const canHover = window.matchMedia('(hover: hover)').matches;
    if (!canHover) return;

    track.addEventListener('mouseenter', () => {
        track.style.animationPlayState = 'paused';
    });

    track.addEventListener('mouseleave', () => {
        track.style.animationPlayState = '';
    });
}

// Menu hambúrguer (mobile)
function initMobileMenu() {
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.main-nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => {
        const isOpen = nav.classList.toggle('is-open');
        toggle.classList.toggle('is-open', isOpen);
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    const header = document.querySelector('header');
    const getHeaderHeight = () => header ? header.offsetHeight : 0;

    nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (!href || !href.startsWith('#')) return;
            e.preventDefault();
            const id = href.slice(1);
            const target = document.getElementById(id);
            if (nav.classList.contains('is-open')) {
                nav.classList.remove('is-open');
                toggle.classList.remove('is-open');
                toggle.setAttribute('aria-expanded', 'false');
            }
            if (target) {
                setTimeout(() => {
                    const top = target.getBoundingClientRect().top + window.scrollY - getHeaderHeight();
                    window.scrollTo({ top, behavior: 'smooth' });
                    history.pushState(null, '', href);
                }, 400);
            }
        });
    });
}

// ========== WhatsApp flutuante: para acima do footer no mobile ==========
function initWhatsappFloat() {
    const btn    = document.querySelector('.whatsapp-float');
    const footer = document.querySelector('footer');
    if (!btn || !footer) return;

    const BASE   = 8;  // px do fundo quando footer fora de vista
    const GAP    = 8;  // px acima da borda do footer

    function update() {
        if (window.innerWidth > 768) {
            btn.style.bottom = '';
            return;
        }

        const footerTop = footer.getBoundingClientRect().top;
        const windowH   = window.innerHeight;

        // Quanto do footer já entrou pela borda inferior do viewport
        const footerVisible = windowH - footerTop;

        if (footerVisible > 0) {
            // Footer parcial ou totalmente visível: sobe o botão
            btn.style.bottom = (footerVisible + GAP) + 'px';
        } else {
            // Footer ainda abaixo da tela
            btn.style.bottom = BASE + 'px';
        }
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    // iOS Safari: a barra de URL dinâmica altera o viewport sem disparar 'resize'
    if (window.visualViewport) {
        window.visualViewport.addEventListener('scroll', update);
        window.visualViewport.addEventListener('resize', update);
    }

    update();
}

// ========== Accordion Horizontal — Nossas Soluções ==========
function initSolucoesAccordion() {
    const rows = document.querySelectorAll('.solucoes-row');
    if (!rows.length) return;

    rows.forEach(function(row) {
        const cards = row.querySelectorAll('.solucoes-card');
        let activeCard = null;

        function activate(card) {
            if (activeCard && activeCard !== card) {
                activeCard.classList.remove('card-active');
            }
            row.classList.add('row-hovered');
            card.classList.add('card-active');
            activeCard = card;
        }

        function deactivate(card) {
            card.classList.remove('card-active');
            row.classList.remove('row-hovered');
            activeCard = null;
        }

        cards.forEach(function(card) {
            // Mouse (desktop)
            card.addEventListener('mouseenter', function() {
                activate(card);
            });
            card.addEventListener('mouseleave', function() {
                deactivate(card);
            });

            // Toque (mobile) — toca para expandir, toca novamente para fechar
            card.addEventListener('touchstart', function() {
                if (card.classList.contains('card-active')) {
                    deactivate(card);
                } else {
                    activate(card);
                }
            }, { passive: true });
        });

        // Toque fora da linha fecha o card ativo
        document.addEventListener('touchstart', function(e) {
            if (activeCard && !row.contains(e.target)) {
                deactivate(activeCard);
            }
        }, { passive: true });
    });
}

// ========== Accordion "Porque contratar a LocHub?" ==========
function initFaqAccordion() {
    const items = document.querySelectorAll('.accordion .accordion-item');
    if (!items.length) return;

    items.forEach(function (item) {
        const header  = item.querySelector('.accordion-header');
        const body    = item.querySelector('.accordion-body');
        if (!header || !body) return;

        header.addEventListener('click', function () {
            const isOpen = item.classList.contains('is-open');

            // Fecha todos os itens
            items.forEach(function (other) {
                if (other.classList.contains('is-open')) {
                    other.classList.remove('is-open');
                    other.querySelector('.accordion-body').style.maxHeight = null;
                    other.querySelector('.accordion-header').setAttribute('aria-expanded', 'false');
                }
            });

            // Se o clicado estava fechado, abre
            if (!isOpen) {
                item.classList.add('is-open');
                body.style.maxHeight = body.scrollHeight + 'px';
                header.setAttribute('aria-expanded', 'true');
            }
        });

        // Acessibilidade: ativa via teclado
        header.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                header.click();
            }
        });
    });
}

// ========== Accordion "Porque contratar a LocHub?" ==========
(function () {
    function initLocHubAccordion() {
        const items = document.querySelectorAll('.accordion-section .accordion-item');
        if (!items.length) return;

        items.forEach(function (item) {
            const header = item.querySelector('.accordion-header');
            if (!header) return;

            header.addEventListener('click', function () {
                const isOpen = item.classList.contains('is-open');

                // Fecha todos os itens
                items.forEach(function (el) {
                    el.classList.remove('is-open');
                    el.querySelector('.accordion-header').setAttribute('aria-expanded', 'false');
                });

                // Abre o clicado (se estava fechado)
                if (!isOpen) {
                    item.classList.add('is-open');
                    header.setAttribute('aria-expanded', 'true');
                }
            });
        });
    }

    document.addEventListener('DOMContentLoaded', initLocHubAccordion);
})();

document.addEventListener('DOMContentLoaded', () => {
    // Garante que a página sempre inicia no topo, ignorando âncoras na URL
    window.scrollTo(0, 0);

    initThumbnailCarousel(document.getElementById('gallerySolucoes'));
    initClientsTicker();
    initMobileMenu();
    initWhatsappFloat();
    initSolucoesAccordion();
    initFaqAccordion();
});
