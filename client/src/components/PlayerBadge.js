import { jsx as _jsx } from "react/jsx-runtime";
import { Badge } from "./ui/badge";
import { useAvatar } from "@/hooks/useAvatar";
export const PlayerBadge = ({ player, playerId }) => {
    const avatarSvg = useAvatar(player);
    const isBot = player.isBot || false;
    if (avatarSvg) {
        return (_jsx("div", { className: `w-8 h-8 ring-2 ${player.id === playerId
                ? "ring-blue-500"
                : isBot
                    ? "ring-gray-300"
                    : "ring-yellow-300"} rounded-full overflow-hidden flex items-center justify-center`, dangerouslySetInnerHTML: { __html: avatarSvg } }));
    }
    return (_jsx(Badge, { className: `w-8 h-8 ${player.id === playerId
            ? "bg-blue-500 text-white"
            : isBot
                ? "bg-purple-500 text-white"
                : "bg-gray-200 text-gray-800"} flex items-center justify-center rounded-full text-lg font-bold`, children: isBot ? "🤖" : player.name.charAt(0).toUpperCase() }));
};
