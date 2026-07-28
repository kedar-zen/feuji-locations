export default function Button() {
  return (
    <div className="relative rounded-[1000px] size-full" data-name="Button">
      <div className="content-stretch flex items-start overflow-clip px-[24px] py-[16px] relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[18px] not-italic relative shrink-0 text-[18px] text-center text-white whitespace-nowrap">Button</p>
      </div>
      <div aria-hidden className="absolute border border-solid border-white inset-0 pointer-events-none rounded-[1000px]" />
    </div>
  );
}