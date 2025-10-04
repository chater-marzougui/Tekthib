import React from "react";
import { Heart, Code, ExternalLink } from "lucide-react";

const MinimalFooter: React.FC = () => {
  return (
    <footer className="bg-foreground border-t border-border text-sm text-background/70">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between text-xs text-background/50">
          <div className="flex items-center gap-2">
            <Code className="w-3 h-3 text-green-500" />
            <span>Built by</span>
            <a
              href="https://chater-marzougui.me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              Chater Marzougui
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-3 h-3 fill-red-500 text-red-500" />
            <span>Tekthib © {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default MinimalFooter;
