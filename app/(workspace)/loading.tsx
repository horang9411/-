export default function WorkspaceLoading() {
  return (
    <div
      className="mx-auto w-full max-w-[1600px] px-5 py-6 lg:px-8"
      role="status"
      aria-live="polite"
    >
      <div className="overflow-hidden rounded-[20px] border border-[#e2e7e3] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-base font-bold text-[#526058]">
          <span className="size-5 animate-spin rounded-full border-[3px] border-[#dce9df] border-t-[#58a873]" />
          화면을 불러오고 있습니다.
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="h-24 animate-pulse rounded-[16px] bg-[#eef2ef]" />
          <div className="h-24 animate-pulse rounded-[16px] bg-[#eef2ef]" />
          <div className="h-24 animate-pulse rounded-[16px] bg-[#eef2ef]" />
        </div>
        <div className="mt-4 h-[420px] animate-pulse rounded-[18px] bg-[#f2f5f3]" />
      </div>
      <span className="sr-only">잠시만 기다려 주세요.</span>
    </div>
  );
}
