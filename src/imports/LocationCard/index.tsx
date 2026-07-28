import svgPaths from "./svg-pnn4ga1i9x";
import imgDal from "./a09702b14956d4b1ef4fe578ee44805b8b8256c5.png";

function Dallas() {
  return (
    <div className="h-[500px] overflow-clip relative rounded-bl-[24px] rounded-tl-[24px] shrink-0 w-[400px]" data-name="Dallas">
      <div className="absolute bg-white bottom-0 h-[300px] left-0 right-0 rounded-bl-[24px] rounded-tl-[24px]" data-name="BG" />
      <div className="absolute bottom-[-25px] h-[550px] left-[-5%] right-[-5%]" data-name="DAL">
        <img alt="" className="absolute block inset-0 max-w-none size-full" height="550" src={imgDal} width="440" />
      </div>
    </div>
  );
}

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
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[24px] min-w-px not-italic relative text-[16px] text-black">6363 N State Highway 161, Ste 250 Irving, TX 75038</p>
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
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full" data-name="Info">
      <Address />
      <Email />
      <Phone />
    </div>
  );
}

function Details() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[40px] h-[300px] items-start p-[40px] relative rounded-br-[24px] rounded-tr-[24px] shrink-0 w-[400px]" data-name="Details">
      <p className="[word-break:break-word] font-['Cabinet_Grotesk_Variable:Medium',sans-serif] font-medium leading-[35px] relative shrink-0 text-[#0b1f3a] text-[32px] tracking-[-1px] w-full">Dallas, Texas, USA</p>
      <Info />
    </div>
  );
}

export default function LocationCard() {
  return (
    <div className="content-stretch flex items-end relative size-full" data-name="LocationCard">
      <Dallas />
      <Details />
    </div>
  );
}