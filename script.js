import { vertexShader, fragmentShader } from "./shaders.js";

import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, SplitText);

// Initialize Lenis
const lenis = new Lenis();

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

ScrollTrigger.scrollerProxy(document.body, {
    scrollTop(value) {
        return arguments.length
            ? lenis.scrollTo(value, { immediate: true })
            : lenis.scroll;
    },
    getBoundingClientRect() {
        return {
            top: 0,
            left: 0,
            width: window.innerWidth,
            height: window.innerHeight
        };
    }
});


// Throttle Cursor Animation
{
    const cursor = document.querySelector(".cursor");
    let lastTime = 0;
    window.addEventListener("mousemove", (e) => {
        const now = performance.now();
        if (now - lastTime > 16) { // Throttle to ~60fps
            gsap.to(cursor, {
                x: e.clientX + 4,
                y: e.clientY + 6,
                duration: 0.5, // Reduced duration for snappier response
                ease: "power4.Out"
            });
            lastTime = now;
        }
    });
}

// Debounce Resize Events
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

const debouncedResize = debounce(() => {
    resize();
    material.uniforms.uResolution.value.set(hero.offsetWidth, hero.offsetHeight);
}, 200);
window.addEventListener("resize", debouncedResize);

// Cursor animation Logic
{
    document.querySelectorAll("a, .nav-menu, h1").forEach(el => {
        el.addEventListener("mouseenter", () => {
            gsap.to(cursor, { scale: 1.5 });
        });
        el.addEventListener("mouseleave", () => {
            gsap.to(cursor, { scale: 1 });
        });
    });
}

// Circular Text Logic
{
    const circle = document.getElementById("circularText");
    const text = circle.innerText.trim();
    circle.innerText = "";

    let spans = [];
    let baseRadius = 0;
    let radius = 0;

    const calcRadius = () => {
        baseRadius = Math.min(110, Math.max(50, window.innerWidth * 0.05));
        radius = baseRadius;
    };

    const update = () => {
        spans.forEach(s => {
            s.style.transform = `
        rotate(${s.angle}deg)
        translate(${radius}px)
        rotate(90deg)
        `;
        });
    };

    calcRadius();

    text.split("").forEach((char, i, arr) => {
        const span = document.createElement("span");
        span.innerText = char;
        span.angle = (360 / arr.length) * i;
        span.style.position = "absolute";
        span.style.pointerEvents = "none"; // 🔴 important
        circle.appendChild(span);
        spans.push(span);
    });

    update();

    // Hover ONLY on container
    circle.addEventListener("mouseenter", () => {
        gsap.to({ r: radius }, {
            r: baseRadius * 1.3,
            duration: 0.45,
            ease: "power3.out",
            onUpdate() {
                radius = this.targets()[0].r;
                update();
            }
        });
    });

    circle.addEventListener("mouseleave", () => {
        gsap.to({ r: radius }, {
            r: baseRadius,
            duration: 0.45,
            ease: "power3.out",
            onUpdate() {
                radius = this.targets()[0].r;
                update();
            }
        });
    });

    window.addEventListener("resize", () => {
        calcRadius();
        update();
    });


}


ScrollTrigger.defaults({ scroller: document.body });

const CONFIG = {
    color: "#ebf5df",
    spread: 0.5,
    speed: 2
};

const canvas = document.querySelector(".hero-canvas");
const hero = document.querySelector(".hero");

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
});

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255,
        }
        : { r: 0.89, g: 0.89, b: 0.89 };
}

function resize() {
    const width = hero.offsetWidth;
    const height = hero.offsetHeight;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

resize();
window.addEventListener("resize", debouncedResize);

const rgb = hexToRgb(CONFIG.color);
const geometry = new THREE.PlaneGeometry(2, 2);
const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
        uProgress: { value: 0 },
        uResolution: {
            value: new THREE.Vector2(hero.offsetWidth, hero.offsetHeight),
        },
        uColor: { value: new THREE.Vector3(rgb.r, rgb.g, rgb.b) },
        uSpread: { value: CONFIG.spread },
    },
    transparent: true,
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

let scrollProgress = 0;
let heroVisible = true;

// Only render Three.js when the hero section is actually on screen
ScrollTrigger.create({
    trigger: ".hero",
    start: "top bottom",
    end: "bottom top",
    onEnter: () => { heroVisible = true; },
    onLeave: () => { heroVisible = false; },
    onEnterBack: () => { heroVisible = true; },
    onLeaveBack: () => { heroVisible = false; },
});

function animate() {
    if (heroVisible) {
        renderer.autoClear = true;
        renderer.setClearColor(0x000000, 0);
        material.uniforms.uProgress.value = scrollProgress;
        renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
}

animate();

lenis.on("scroll", ({ scroll }) => {
    const heroTop = hero.offsetTop;
    const heroHeight = hero.offsetHeight;
    const progress = (scroll - heroTop) / heroHeight;
    scrollProgress = THREE.MathUtils.clamp(progress * CONFIG.speed, 0, 1);
});

window.addEventListener("resize", () => {
    material.uniforms.uResolution.value.set(hero.offsetWidth, hero.offsetHeight);
});

const heroH2 = document.querySelector(".hero-content h2");
const split = new SplitText(heroH2, { type: "words" });
const words = split.words;
if (heroH2) {
    const split = new SplitText(heroH2, { type: "words" });
    const words = split.words;

    gsap.set(words, { opacity: 0 });

    ScrollTrigger.create({
        trigger: ".hero-content",
        start: "top center",
        end: "bottom 75%",
        // markers: true,
        onUpdate: (self) => {
            const progress = self.progress;
            const total = words.length;

            words.forEach((word, i) => {
                const wordProgress = i / total;
                const opacity = gsap.utils.clamp(0, 1, (progress - wordProgress) * total);
                gsap.set(word, { opacity });
            });
        },
    });
};

const spotlightImgFinalPos = [
    [-140, -140],
    [40, -130],
    [-160, 40],
    [20, 30]
];



// ====== Spotlight (Image Animation Section) ===========
{
    const spotlighImages = document.querySelectorAll(".spotlight-img");
    ScrollTrigger.create({
        trigger: ".spotlight",
        start: "top top",
        end: `+${window.innerHeight * 6}px`,
        pin: true,
        pinSpacing: true,
        scrub: 1,
        onUpdate: (self) => {
            const progress = self.progress;
            spotlighImages.forEach((img, idx) => {
                const x = gsap.utils.interpolate(-50, spotlightImgFinalPos[idx][0], progress);
                const y = gsap.utils.interpolate(200, spotlightImgFinalPos[idx][1], progress);
                const rotation = gsap.utils.interpolate(5, 0, progress);
                gsap.set(img, {
                    transform: `translate(${x}%, ${y}%) rotate(${rotation}deg)`
                });
            });
        }
    });
}

// SVG Divider
{
    gsap.fromTo(
        ".divider-top path",
        {
            strokeDasharray: 1000,
            strokeDashoffset: 1000,
        },
        {
            strokeDashoffset: 0,
            scrollTrigger: {
                trigger: ".divider-top",
                start: "top bottom",
                end: "bottom top",
                scrub: true,
            },
        }
    );

    gsap.fromTo(
        ".divider-bottom path",
        {
            strokeDasharray: 1000,
            strokeDashoffset: -1000,
        },
        {
            strokeDashoffset: 0,
            scrollTrigger: {
                trigger: ".divider-bottom",
                start: "top bottom",
                end: "bottom top",
                scrub: true,
            },
        }
    );
}

// Small Dot Animation
{
    gsap.fromTo(
        ".micro-signal",
        {
            scale: 0.1,
            opacity: 0.6
        },
        {
            scale: 2.5,
            opacity: 0,
            duration: 2.5,
            ease: "sine.inOut",
            repeat: -1,
            repeatDelay: 0.4
        }
    );
}

{
    // gsap.to('.about', {
    //     // backgroundColor: `#ebf5df`,
    //     backgroundColor: `#0f0f0f`,
    //     // color: '#0f0f0f',
    //     color: '#ebf5df',
    //     scrollTrigger: {
    //         trigger: ".about",
    //         start: 'top center',
    //         end: 'bottom 100%',
    //         scrub: 1,
    //     }
    // })

    gsap.from(".main", {
        scale: 0.9,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
            trigger: ".newspaper",
            start: "top 70%"
        }
    });

    gsap.from(".skeleton", {
        opacity: 0,
        stagger: 0.1,
        duration: 0.8,
        scrollTrigger: {
            trigger: ".newspaper",
            start: "top 80%"
        }
    });
}


let mm = gsap.matchMedia();

mm.add("(min-width: 769px)", () => {
    /* Horizontal Scroll — Laws 1-6 (Left to Right) */
    {
        let sections = gsap.utils.toArray(".panel");

        gsap.to(sections, {
            xPercent: -100 * (sections.length - 1),
            ease: "none",
            scrollTrigger: {
                trigger: ".horizontal-wrapper",
                pin: true,
                scrub: 1,
                end: () => "+=" + document.querySelector(".horizontal-wrapper").offsetWidth,
            }
        });
    }

    /* Horizontal Scroll — Laws 7-12 (Right to Left) */
    {
        let reverseSections = gsap.utils.toArray(".panel-reverse");
        let reverseWrapper = document.querySelector(".horizontal-wrapper-reverse");

        // Set the initial position of the panels so the LAST panel is visible first
        gsap.set(reverseSections, { xPercent: -100 * (reverseSections.length - 1) });

        // Animate the panels, NOT the pinned wrapper!
        gsap.to(reverseSections, {
            xPercent: 0,
            ease: "none",
            scrollTrigger: {
                trigger: ".horizontal-wrapper-reverse",
                pin: true,
                scrub: 1,
                end: () => "+=" + reverseWrapper.offsetWidth,
            }
        });
    }
});


mm.add("all", () => {
    gsap.to(".reveal", {
        clipPath: "circle(150% at 50% 50%)",

        scrollTrigger: {
            trigger: ".phone-section",
            start: "top top",
            end: "+=1500",       // length of animation
            scrub: 1,
            pin: true
        }
    });
});

// ====== Talent Reveal (Cursor-following circle) ===========
{
    const talentSection = document.querySelector(".talent-section");
    const talentBg = document.querySelector(".talent-bg");

    if (talentSection && talentBg) {
        let mouseX = 50, mouseY = 50; // percentage values

        talentSection.addEventListener("mouseenter", () => {
            gsap.to(talentBg, {
                clipPath: `circle(15% at ${mouseX}% ${mouseY}%)`,
                duration: 0.4,
                ease: "power2.out"
            });
        });

        talentSection.addEventListener("mousemove", (e) => {
            const rect = talentSection.getBoundingClientRect();
            mouseX = ((e.clientX - rect.left) / rect.width) * 100;
            mouseY = ((e.clientY - rect.top) / rect.height) * 100;

            gsap.to(talentBg, {
                clipPath: `circle(15% at ${mouseX}% ${mouseY}%)`,
                duration: 0.3,
                ease: "power2.out",
                overwrite: "auto"
            });
        });

        talentSection.addEventListener("mouseleave", () => {
            gsap.to(talentBg, {
                clipPath: `circle(0% at ${mouseX}% ${mouseY}%)`,
                duration: 0.3,
                ease: "power2.in"
            });
        });
    }
}