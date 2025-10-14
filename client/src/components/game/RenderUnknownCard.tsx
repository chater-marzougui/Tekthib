import { cn } from "@/lib/utils";

export const RenderUnknownCard = (
  color: "destructive" | "default" = "default"
) => {
  const baseClasses =
    "w-full h-full rounded-sm border-gray-300 shadow-xl border-2 flex items-center justify-center";

  const colorClasses =
    color === "destructive"
      ? "bg-gradient-to-br from-red-500 to-pink-600 border-red-300"
      : "";
  
  const colorStyle =
    color === "default"
      ? { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }
      : { };  

  return (
    <div className={cn(baseClasses, colorClasses)} style={colorStyle}>
      <div className="text-white font-bold text-3xl opacity-70">?</div>
    </div>
  );
};
