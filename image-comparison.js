class ImageComparison extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
        }

        * {
          box-sizing: border-box;
        }

        .comparison {
          position: relative;
          overflow: hidden;
          width: 100%;
          aspect-ratio: 1.78;
          border: 1px solid rgb(29 41 36 / 9%);
          border-radius: 24px;
          background: #e7e9e8;
          box-shadow: 0 12px 36px rgb(29 41 36 / 5%);
          isolation: isolate;
        }

        .comparison-image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 54%;
        }

        .before-layer {
          position: absolute;
          z-index: 1;
          inset: 0;
          overflow: hidden;
          clip-path: inset(0 calc(100% - var(--position)) 0 0);
        }

        .before-image {
          max-width: none;
        }

        .comparison-slider {
          position: absolute;
          z-index: 3;
          inset: 0;
          width: 100%;
          height: 100%;
          margin: 0;
          appearance: none;
          background: transparent;
          cursor: ew-resize;
          opacity: 0;
        }

        .comparison-slider::-webkit-slider-runnable-track {
          height: 100%;
          background: transparent;
        }

        .comparison-slider::-webkit-slider-thumb {
          width: 48px;
          height: 100%;
          appearance: none;
          background: transparent;
        }

        .comparison-slider::-moz-range-track {
          height: 100%;
          background: transparent;
        }

        .comparison-slider::-moz-range-thumb {
          width: 48px;
          height: 100%;
          border: 0;
          border-radius: 0;
          background: transparent;
        }

        .comparison-divider {
          position: absolute;
          z-index: 2;
          top: 0;
          bottom: 0;
          left: var(--position);
          width: 1px;
          background: rgb(255 255 255 / 94%);
          box-shadow: 0 0 0 1px rgb(29 41 36 / 9%), 0 0 12px rgb(0 0 0 / 12%);
          pointer-events: none;
          transform: translateX(-50%);
        }

        .divider-handle {
          position: absolute;
          top: 50%;
          left: 50%;
          display: flex;
          width: 44px;
          height: 44px;
          align-items: center;
          justify-content: center;
          gap: 2px;
          border: 1px solid rgb(29 41 36 / 18%);
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 3px 12px rgb(0 0 0 / 16%);
          transform: translate(-50%, -50%);
        }

        .divider-handle i {
          width: 6px;
          height: 6px;
          border-right: 1.5px solid #49504c;
          border-bottom: 1.5px solid #49504c;
        }

        .divider-handle i:first-child {
          transform: rotate(135deg);
        }

        .divider-handle i:last-child {
          transform: rotate(-45deg);
        }

        .comparison-slider:focus-visible + .comparison-divider .divider-handle {
          outline: 3px solid white;
          outline-offset: 4px;
        }

        @media (max-width: 680px) {
          .comparison-image {
            object-position: center;
          }

          .divider-handle {
            width: 42px;
            height: 42px;
          }
        }
      </style>

      <div class="comparison" style="--position: 50%">
        <img class="comparison-image after-image" alt="">
        <div class="before-layer" aria-hidden="true">
          <img class="comparison-image before-image" alt="">
        </div>
        <input
          class="comparison-slider"
          type="range"
          min="0"
          max="100"
          step="0.1"
          value="50"
        >
        <div class="comparison-divider" aria-hidden="true">
          <span class="divider-handle"><i></i><i></i></span>
        </div>
      </div>
    `;

    this.comparison = this.shadowRoot.querySelector(".comparison");
    this.beforeImage = this.shadowRoot.querySelector(".before-image");
    this.afterImage = this.shadowRoot.querySelector(".after-image");
    this.slider = this.shadowRoot.querySelector(".comparison-slider");
    this.previewFrame = null;
    this.previewStartedAt = null;
    this.previewStartPosition = 50;

    this.updatePosition = (position) => {
      const value = Number(Math.max(0, Math.min(100, position)).toFixed(1));
      this.slider.value = String(value);
      this.comparison.style.setProperty("--position", `${value}%`);
      this.slider.setAttribute(
        "aria-valuetext",
        `${value} percent, showing ${value} percent before and ${100 - value} percent after`
      );
    };

    this.stopPreview = () => {
      if (this.previewFrame !== null) {
        cancelAnimationFrame(this.previewFrame);
        this.previewFrame = null;
      }
    };

    this.animatePreview = (timestamp) => {
      if (this.previewStartedAt === null) {
        this.previewStartedAt = timestamp;
      }

      const duration = 1800;
      const progress = Math.min((timestamp - this.previewStartedAt) / duration, 1);
      const sweep = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
      const easedSweep = sweep * sweep * (3 - 2 * sweep);
      this.updatePosition(this.previewStartPosition + 8 * easedSweep);

      if (progress < 1) {
        this.previewFrame = requestAnimationFrame(this.animatePreview);
      } else {
        this.updatePosition(this.previewStartPosition);
        this.previewFrame = null;
      }
    };

    this.slider.addEventListener("pointerdown", this.stopPreview);
    this.slider.addEventListener("focus", this.stopPreview);
    this.slider.addEventListener("input", () => {
      this.stopPreview();
      this.updatePosition(Number(this.slider.value));
    });
  }

  connectedCallback() {
    this.beforeImage.src = this.getAttribute("before") || "";
    this.afterImage.src = this.getAttribute("after") || "";
    this.afterImage.alt = this.getAttribute("alt") || "After image";
    this.slider.setAttribute(
      "aria-label",
      this.getAttribute("aria-label") || "Compare before and after images"
    );
    this.slider.step = this.getAttribute("step") || "0.1";

    const initialPosition = Number(this.getAttribute("value") || 50);
    this.previewStartPosition = Number.isFinite(initialPosition) ? initialPosition : 50;
    this.previewStartedAt = null;
    this.updatePosition(this.previewStartPosition);

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.previewFrame = requestAnimationFrame(this.animatePreview);
    }
  }

  disconnectedCallback() {
    this.stopPreview();
  }
}

if (!customElements.get("image-comparison")) {
  customElements.define("image-comparison", ImageComparison);
}