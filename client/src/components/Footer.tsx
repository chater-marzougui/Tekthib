import React from "react";
import { Heart, Code, ExternalLink, Github, Gamepad2 } from "lucide-react";

const MinimalFooter: React.FC = () => {
  return (
    <footer className="bg-foreground border-t border-border text-sm text-background/70">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-background/60">
          {/* Left section - Creator */}
          <div className="flex items-center gap-2">
            <Code className="w-3.5 h-3.5 text-green-500" />
            <span>Built with</span>
            <Heart className="w-3 h-3 fill-red-500 text-red-500 animate-pulse" />
            <span>by</span>
            <a
              href="https://chater-marzougui.me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 font-medium"
            >
              Chater Marzougui
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Center section - Copyright */}
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-3.5 h-3.5 text-orange-500" />
            <span className="font-medium text-background/70">
              Tekthib © {new Date().getFullYear()}
            </span>
          </div>

          {/* Right section - Links */}
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/chater-marzougui/Tekthib"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-background/50 hover:text-background/80 transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Source</span>
            </a>
            <span className="text-background/30">•</span>
            <span className="flex items-center gap-1 text-background/50">
              Made in Tunisia <img src="/Tekthib/flags/tn.webp" alt="Tunisia Flag" className="w-4.5 h-3" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default MinimalFooter;
