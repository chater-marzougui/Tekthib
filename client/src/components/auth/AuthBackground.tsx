import { motion } from "framer-motion";

export default function AuthBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i + 1}
          className="absolute text-6xl opacity-10"
          initial={{
            x: Math.random() * window.innerWidth,
            y: -100,
            rotate: Math.random() * 360,
          }}
          animate={{
            y: window.innerHeight + 100,
            rotate: Math.random() * 360 + 720,
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Infinity,
            ease: "linear",
            delay: i * 2,
          }}
        >
          {["♠️", "♥️", "♦️", "♣️"][i % 4]}
        </motion.div>
      ))}

      {/* Floating emoji decorations */}
      <motion.div
        className="absolute top-10 right-10 text-6xl"
        animate={{
          rotate: [0, 10, -10, 0],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        🎰
      </motion.div>

      <motion.div
        className="absolute bottom-10 left-10 text-6xl"
        animate={{
          rotate: [0, -10, 10, 0],
          y: [0, 20, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        🎲
      </motion.div>
    </div>
  );
}
