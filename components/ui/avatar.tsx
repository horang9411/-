import { cn, getInitials } from "@/lib/utils";

type AvatarProps = {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClass = {
  sm: "size-6 text-[10px]",
  md: "size-9 text-xs",
  lg: "size-12 text-base",
};

export function Avatar({
  name,
  imageUrl,
  size = "md",
  className,
}: AvatarProps) {
  return (
    <span
      aria-label={`${name} 프로필`}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dff3e7] font-bold text-[#316448] ring-1 ring-black/5",
        sizeClass[size],
        className,
      )}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="size-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
