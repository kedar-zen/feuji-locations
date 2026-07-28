import svgPaths from "./svg-dojvkl3ly8";

function Vector() {
  return (
    <div className="h-[80px] relative shrink-0 w-[8px]" data-name="Vector">
      <div className="absolute inset-[-19.25%_-192.5%_0_-192.5%]">
        <svg className="block size-full" fill="none" height="95.4" preserveAspectRatio="none" viewBox="0 0 38.8 95.4" width="38.8">
          <g id="Vector">
            <g filter="url(#filter0_d_4_251)" id="Dot">
              <path d={svgPaths.pa4e38f0} fill="var(--fill-0, #FE5732)" />
            </g>
            <path d="M19.4 95.4V20.4" id="Line" stroke="var(--stroke-0, #FE5732)" />
          </g>
          <defs>
            <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="38.8" id="filter0_d_4_251" width="38.8" x="0" y="0">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
              <feMorphology in="SourceAlpha" operator="dilate" radius="4" result="effect1_dropShadow_4_251" />
              <feOffset />
              <feGaussianBlur stdDeviation="5.7" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix type="matrix" values="0 0 0 0 0.996078 0 0 0 0 0.341176 0 0 0 0 0.196078 0 0 0 1 0" />
              <feBlend in2="BackgroundImageFix" mode="hard-light" result="effect1_dropShadow_4_251" />
              <feBlend in="SourceGraphic" in2="effect1_dropShadow_4_251" mode="normal" result="shape" />
            </filter>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function Indecator() {
  return (
    <div className="bg-white h-[57px] relative rounded-[1000px] shrink-0" data-name="Indecator">
      <div className="content-stretch flex items-center justify-center overflow-clip px-[24px] py-[16px] relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[25px] not-italic relative shrink-0 text-[#0b1f3a] text-[18px] text-center tracking-[-1px] whitespace-nowrap">Visakhapatnam, India</p>
      </div>
      <div aria-hidden className="absolute border border-[#fe5732] border-solid inset-0 pointer-events-none rounded-[1000px]" />
    </div>
  );
}

export default function PopDown() {
  return (
    <div className="content-stretch flex flex-col items-center relative size-full" data-name="PopDown">
      <Vector />
      <Indecator />
    </div>
  );
}