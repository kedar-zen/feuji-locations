import svgPaths from "./svg-hp70uj3jd3";

function LocationOn() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="location_on">
      <svg className="absolute block inset-0 size-full" fill="none" height="24" preserveAspectRatio="none" viewBox="0 0 24 24" width="24">
        <g id="location_on">
          <mask height="24" id="mask0_1_330" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="24" x="0" y="0">
            <rect fill="var(--fill-0, #FE5732)" height="24" id="Bounding box" width="24" />
          </mask>
          <g mask="url(#mask0_1_330)">
            <path d={svgPaths.p1dc256f0} fill="var(--fill-0, #FE5732)" id="location_on_2" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function Address() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Address">
      <LocationOn />
      <div className="[word-break:break-word] flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[0] min-w-px not-italic relative text-[16px] text-black">
        <p className="leading-[24px] mb-0">2nd Floor, Naga Chambers, Waltair Main Road, D. No. 12-1-16, Plot No. 49, Survey No 1051, Opposite HDFC</p>
        <p className="leading-[24px]">Bank, Visakhapatnam, Andhra Pradesh 530002</p>
      </div>
    </div>
  );
}

function AlternateEmail() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="alternate_email">
      <svg className="absolute block inset-0 size-full" fill="none" height="24" preserveAspectRatio="none" viewBox="0 0 24 24" width="24">
        <g id="alternate_email">
          <mask height="24" id="mask0_1_319" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="24" x="0" y="0">
            <rect fill="var(--fill-0, #FE5732)" height="24" id="Bounding box" width="24" />
          </mask>
          <g mask="url(#mask0_1_319)">
            <path d={svgPaths.p32965180} fill="var(--fill-0, #FE5732)" id="alternate_email_2" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function Email() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Email">
      <AlternateEmail />
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[16px] text-black whitespace-nowrap">info@feuji.com</p>
    </div>
  );
}

function PhoneEnabled() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="phone_enabled">
      <svg className="absolute block inset-0 size-full" fill="none" height="24" preserveAspectRatio="none" viewBox="0 0 24 24" width="24">
        <g id="phone_enabled">
          <mask height="24" id="mask0_1_334" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="24" x="0" y="0">
            <rect fill="var(--fill-0, #FE5732)" height="24" id="Bounding box" width="24" />
          </mask>
          <g mask="url(#mask0_1_334)">
            <path d={svgPaths.p1af70a80} fill="var(--fill-0, #FE5732)" id="phone_enabled_2" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function Phone() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Phone">
      <PhoneEnabled />
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[16px] text-black whitespace-nowrap">+1 972 514 1949</p>
    </div>
  );
}

function Info() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Info">
      <Address />
      <Email />
      <Phone />
    </div>
  );
}

function Details() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[24px] items-start p-[40px] relative rounded-[24px] shrink-0 w-full" data-name="Details">
      <p className="[word-break:break-word] font-['Cabinet_Grotesk_Variable:Medium',sans-serif] font-medium leading-[29px] relative shrink-0 text-[#0b1f3a] text-[24px] tracking-[-1px] w-full">Visakhapatnam, India</p>
      <Info />
    </div>
  );
}

export default function Viz() {
  return (
    <div className="content-stretch flex flex-col items-stretch relative size-full" data-name="VIZ">
      <Details />
    </div>
  );
}