export default function Button() {
  return (
    <div className="relative rounded-[1000px] size-full" data-name="Button">
      <div className="content-stretch flex items-start overflow-clip px-[24px] py-[16px] relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[18px] not-italic relative shrink-0 text-[#fe5732] text-[18px] text-center whitespace-nowrap">Button</p>
      </div>
      <div aria-hidden className="absolute border border-[#fe5732] border-solid inset-0 pointer-events-none rounded-[1000px]" />
    </div>
  );
}