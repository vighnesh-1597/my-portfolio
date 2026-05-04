document.addEventListener("DOMContentLoaded", () => {
    // Initial fade in
    document.body.style.opacity = 0;
    document.body.style.transition = "opacity 0.3s ease-in-out";
    
    // Small delay to ensure styles are computed before fading in
    requestAnimationFrame(() => {
        document.body.style.opacity = 1;
    });

    // Intercept internal links
    const links = document.querySelectorAll('a[href]');
    links.forEach(link => {
        link.addEventListener('click', e => {
            const href = link.getAttribute('href');
            const target = link.getAttribute('target');
            
            // Skip external links, hash links, new tabs, mailto, etc.
            if (href.startsWith('http') || href.startsWith('#') || target === '_blank' || href.startsWith('mailto:')) {
                return;
            }

            // If it's a completely native internal link, hijack the navigation
            e.preventDefault();
            document.body.style.opacity = 0;
            
            setTimeout(() => {
                window.location.href = href;
            }, 300); // Matches the CSS transition duration
        });
    });
});
